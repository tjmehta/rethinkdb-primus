var EventEmitter = require('events').EventEmitter
var util = require('util')

var forEach = require('object-loops/for-each')
var noop = require('101/noop')
var propagate = require('propagate')

module.exports = MockSocket

/**
 * MockSocket allows rethinkdb's connections to use primus instead of real sockets
 * Allows rethinkdb to use primus as a socket
 * @param {Primus} primus primus instance
 */
function MockSocket (primus) {
  var self = this
  // set primus on mock socket
  this.primus = primus
  // propagate primus events to mock socket
  propagate({
    'close': 'close', // TODO: close will probably not match 1:1???
    'open': 'connect',
    'data': 'data',
    'drain': 'drain',
    'error': 'error',
    'end': 'end',
    'timeout': 'timeout'
  }, this.primus, this)
  // mock readyState
  handleReadyStateChange()
  this.primus.on('readyStateChange', handleReadyStateChange)
  function handleReadyStateChange () {
    // if (this._connecting) { // not supported
    //   return 'opening';
    // }
    if (primus.readable && primus.writable) {
      self.readyState = 'open'
    } else if (primus.readable && !primus.writable) {
      self.readyState = 'readOnly'
    } else if (!primus.readable && primus.writable) {
      self.readyState = 'writeOnly'
    } else {
      self.readyState = 'closed'
    }
  }
}
// Inherit ffrom EventEmitter
util.inherits(MockSocket, EventEmitter)
/**
 * socket methods to proxy to methods on primus
 */
var primusMethods = {
  'destroy': 'destroy',
  'write': 'write'
}
forEach(primusMethods, function (method) {
  MockSocket.prototype[method] = function () {
    var primus = this.primus
    return primus[method].apply(primus, arguments)
  }
})
/**
 * calling primus.end multiple times throws an error
 */
MockSocket.prototype.end = function () {
  var primus = this.primus
  try {
    return primus.end.apply(primus, arguments)
  } catch (err) {}
}
/**
 * connect mock is a noop that returns this, bc primus is already connected
 * TODO: may need some work, when disconnect and reconnect
 */
MockSocket.prototype.connect = function (/* port, host */) {
  // noop
  return this
}
/**
 * setNoDelay mock is just a noop, since delay does not apply to primus
 */
MockSocket.prototype.setNoDelay = noop
/**
 * setKeepAlive mock is just a noop, since socket keep alive does not apply to primus
 */
MockSocket.prototype.setKeepAlive = noop
/**
 * methods not implemented, bc they are not used by rethinkdb connection
 */
var notImplemented = [
  'address',
  'pause',
  'ref',
  'resume',
  'setEncoding',
  'setTimeout',
  'unref'
]
notImplemented.forEach(function (method) {
  MockSocket.prototype[method] = function () {
    throw new Error('rethinkdb-primus: socket method not implemented: ' + method)
  }
})

/*
:::Socket::::
Event: 'close' *
Event: 'connect' : maps to open
Event: 'data' *

Event: 'drain' *? assuming yes w/ stream
Event: 'end' *?
Event: 'error' *?

Event: 'lookup' - not necessary
Event: 'timeout' - *?

:::Primus::::
Event: 'outgoing::reconnect'
Event: 'reconnect scheduled'
Event: 'reconnect'
Event: 'reconnected'
Event: 'reconnect timeout'
Event: 'reconnect failed '
Event: 'timeout'
Event: 'outgoing::open '
Event: 'incoming::open '
Event: 'open '
Event: 'destroy'
Event: 'incoming::error'
Event: 'error'
Event: 'incoming::data '
Event: 'outgoing::data '
Event: 'data '
Event: 'incoming::end'
Event: 'outgoing::end'
Event: 'end'
Event: 'close'
*/
