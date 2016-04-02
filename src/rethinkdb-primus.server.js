var assert = require('assert')
var net = require('net')
var tls = require('tls')

var debug = require('debug')('rethinkdb-primus:server')
var defaults = require('101/defaults')
var extend = require('101/assign')
var pick = require('101/pick')

var createValidatorStream = require('rethinkdb-validator-stream')
var createQueryStreamChunker = require('rethinkdb-stream-chunker').createQueryStreamChunker
var createResponseStreamChunker = require('rethinkdb-stream-chunker').createResponseStreamChunker
var keypather = require('keypather')()
var ValidationError = require('rethinkdb-validator-stream').ValidationError

module.exports = createServerPlugin

/**
 * create rethinkdb-primus server plugin
 * @param  {Object} rethinkdbOpts rethinkdb connection options (`r.connect` options)
 * @return {Function} rethinkdb-primus server plugin
 */
function createServerPlugin (rethinkdbOpts) {
  return function serverPlugin (Primus, primusOpts) {
    /**
     * Creates a rethinkdb connection and pipes the spark data to rethinkdb
     * The data is chunked and validated via `validate-reql`
     * @param  {Object} opts validation options
     * @param  {Boolean} [opts.handshakeTimeout] time in ms to timeout, default: 3 minutes
     * @param  {Boolean} [opts.handshakeSuccessTimeout] time in ms to timeout, default: 10 seconds
     * @param  {Boolean} [opts.log] flag to enable validation logging
     * @param  {Array} opts.queryWhitelist allowed queries and query validators list, optional if unsafelyAllowAllQueries is true
     * @param  {Boolean} opts.unsafelyAllowAllQueries flag to allow all queries, optional if opts.queryWhitelist exists
     */
    Primus.Spark.prototype.pipeToRethinkDB = function (opts) {
      var spark = this
      defaults(opts, {
        handshakeTimeout: 3 * 60 * 1000,
        handshakeSuccessTimeout: opts.handshakeTimeout || 10 * 1000,
        log: false,
        unsafelyAllowAllQueries: false
      })
      assert(opts, 'pipeToRethinkDB: opts is required')
      assert(opts.unsafelyAllowAllQueries || opts.queryWhitelist,
        'pipeToRethinkDB: queryWhitelist is required')
      assert(!spark.rethinkdb, 'already piped to rethink')
      // save state under `spark.rethinkdb`
      var state = spark.rethinkdb = {}
      // create rethinkdb socket connection
      /* istanbul ignore next */
      var socket =
        state.socket =
          rethinkdbOpts.ssl
            ? tls.connect(extend({}, rethinkdbOpts.ssl, pick(rethinkdbOpts, ['host', 'port'])))
            : net.connect(rethinkdbOpts.port, rethinkdbOpts.host)
      socket.setNoDelay()
      socket.setKeepAlive(true)
      // create rethinkdb stream helpers
      var validatorStream =
        state.validatorStream =
          opts.unsafelyAllowAllQueries
            ? createQueryStreamChunker() // chunker is used to assume the first chunk is the handshake
            : createValidatorStream({
              log: opts.logQueries,
              whitelist: opts.queryWhitelist
            })
      var responseChunker =
        state.responseChunker =
          createResponseStreamChunker()
      // handle handshake timeouts
      if (opts.handshakeTimeout) {
        watchForHandshakeTimeouts({
          responseChunker: responseChunker,
          spark: spark,
          validatorStream: validatorStream
        }, opts)
      }
      // pipe queries to rethinkdb
      // validate queries w/ queryWhitelist (or allow all)
      if (opts.unsafelyAllowAllQueries) {
        spark.pipe(socket)
      } else {
        spark
          .pipe(validatorStream)
          .pipe(socket)
      }
      // pipe rethinkdb responses to spark
      socket
        .pipe(responseChunker)
        .pipe(spark)
      // attach event/error handlers
      attachEvents({
        responseChunker: responseChunker,
        socket: socket,
        spark: spark,
        validatorStream: validatorStream
      })
    }
  }
}
/**
 * ensure timely handshake and handshake success
 */
function watchForHandshakeTimeouts (emitters, opts) {
  var responseChunker = emitters.responseChunker
  var spark = emitters.spark
  var validatorStream = emitters.validatorStream
  debug('watch for handshake timeouts %o', opts)
  // ensure timely handshake
  var handshakeTimer = setTimeout(function () {
    debug('client handshake timed out')
    spark.emit('error', new Error('handshake timedout'))
  }, opts.handshakeTimeout)
  validatorStream.once('data', function () {
    debug('got client handshake')
    clearTimeout(handshakeTimer)
    // ensure timely handshake success
    var handshakeSuccessTimer = setTimeout(function () {
      debug('server handshake timed out')
      spark.emit('error', new Error('handshake success timedout'))
    }, opts.handshakeSuccessTimeout)
    responseChunker.once('data', function () {
      debug('got server handshake')
      clearTimeout(handshakeSuccessTimer)
    })
  })
}
/**
 * attach all event handlers to event emitters
 * @param  {Object} emitters object of rethinkdb-primus event emitters
 */
function attachEvents (emitters) {
  var spark = emitters.spark
  var socket = emitters.socket
  var validatorStream = emitters.validatorStream
  var responseChunker = emitters.responseChunker
  // attach error event listeners
  responseChunker.on('error', responseChunkerErrHandler)
  socket.on('error', socketErrHandler)
  spark.on('error', sparkErrHandler)
  validatorStream.on('error', validationErrHandler)
  // attach other event listeners
  socket.on('close', socketCloseHandler)
  spark.on('close', sparkCloseHandler)
  // error event handlers
  function responseChunkerErrHandler (err) {
    // invalid handshake would end up here
    debug('Response chunker error:', err.stack, err.data)
    cleanup()
  }
  function socketErrHandler (err) {
    debug('RethinkDB socket error:', err.stack, err.data)
    cleanup()
  }
  function sparkErrHandler (err) {
    debug('Spark error:', err.stack, err.data)
    cleanup()
  }
  function validationErrHandler (err) {
    debug('Validator stream error:', err.stack, err.data)
    if (err instanceof ValidationError) {
      var token = keypather.get(err, 'data.query.token')
      debug('Validator stream error is ValidationError, token: %o', token)
      if (token) {
        responseChunker.insertClientError(token, 'Query not allowed: ' + err.message)
      } else {
        cleanup()
      }
    } else {
      debug('Query validator error:', err.stack, err.data)
      // some bad error
      cleanup()
    }
  }
  // other event handlers
  function socketCloseHandler () {
    debug('RethinkDB socket close')
    cleanup()
  }
  function sparkCloseHandler () {
    debug('Spark close')
    cleanup()
  }
  // function allows easy removal of all events
  function cleanup () {
    debug('Cleanup all the things')
    // remove error event listeners
    responseChunker.removeListener('error', responseChunkerErrHandler)
    socket.removeListener('error', socketErrHandler)
    spark.removeListener('error', sparkErrHandler)
    validatorStream.removeListener('error', validationErrHandler)
    // remove other event listeners
    spark.removeListener('close', sparkCloseHandler)
    // end transformers
    responseChunker.end()
    validatorStream.end()
    // close rethinkdb socket
    socket.end()
    // trigger a client-side reconnection
    delete spark.rethinkdb
    spark.end(undefined, { reconnect: true })
  }
}
