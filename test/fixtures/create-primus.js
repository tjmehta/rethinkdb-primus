require('./load-env.js')

var debug = require('debug')('rethinkdb-primus:test:create-primus')
var equals = require('101/equals')
var findIndex = require('101/find-index')
var Primus = require('primus')

module.exports = createPrimus

function createPrimus (server, pluginOpts) {
  var primus = module.exports = new Primus(server, {
    transport: 'engine.io',
    parser: 'binary',
    pathname: 'rethinkdb',
    rethinkdb: {}
  })

  primus.__sparks = []

  primus.use('rethinkdb', require('../../index.js')({
    host: process.env.RETHINKDB_HOST,
    port: process.env.RETHINKDB_PORT
  }))

  primus.on('connection', function (spark) {
    debug('spark connected %o', spark.id)
    primus.__sparks.push(spark)
    spark.pipeToRethinkDB(pluginOpts)
  })

  primus.on('disconnection', function (spark) {
    debug('spark disconnected %o', spark.id)
    var index = findIndex(primus.__sparks, equals(spark))
    if (~index) {
      primus.__sparks.splice(index, 1)
      debug('num sparks connected %o', primus.__sparks.length)
    }
  })

  return primus
}
