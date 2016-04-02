var assert = require('assert')
var net = require('net')
// force require real net if node
if (typeof nodeRequire !== 'undefined') {
  // stub node "net" module instead of browser stub
  net = nodeRequire('net') // browserify hack
}

var maybe = require('call-me-maybe')
var shimmer = require('shimmer')

var MockSocket = require('./mock-socket.js')

/**
 * create a rethinkdb compatible connection that uses primus
 * @param  {Object}   opts options
 * @param  {Object}   opts.rethinkdb rethinkdb client library
 * @param  {Function} cb   callback(err, connection)
 */
primus.rethinkdbConnect = function (opts, cb) {
  assert(typeof opts === 'object', '"opts" is required')
  assert(opts.rethinkdb, '"opts.rethinkdb" is required')
  var rethinkdb = opts.rethinkdb
  // stub connect
  shimmer.wrap(rethinkdb, 'connect', function (original) {
    /**
     * rethinkdb.connect stub
     * used in place of rethinkdb.connect
     * @param  {Object} rethinkdb.connect opts
     * @param  {Function} cb callback(err, connection)
     */
    return function rethinkdbConnectStub (opts, cb) {
      // cache
      var netConnect = net.connect
      var browser = process.browser
      // stub
      process.browser = false
      net.connect = netConnectStub
      // connect
      var promise = original(opts)
      function netConnectStub (opts) {
        return new MockSocket(primus)
      }
      // restore
      net.connect = netConnect
      process.browser = browser
      // return
      promise = promise.then(function (conn) {
        conn.reconnect = connReconnectStub
        return conn
      })
      return maybe(cb, promise)
    }
  })
  // connect
  var promise = rethinkdb.connect({ db: opts.db })
  // restore connect
  shimmer.unwrap(rethinkdb, 'connect')
  // return promise or callback
  return maybe(cb, promise)
}
function connReconnectStub (opts, cb) {
  throw new Error('rethinkdb-primus: connection method not implemented: reconnect')
}
