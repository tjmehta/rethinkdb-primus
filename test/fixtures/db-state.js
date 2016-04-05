require('./load-env.js')

var HOST = process.env.RETHINKDB_HOST
var PORT = process.env.RETHINKDB_PORT
var TABLE = process.env.RETHINKDB_TABLE

var debug = require('debug')('rethinkdb-primus:test:db-state')
var r = require('rethinkdb')

module.exports.createTable = createTable

function createTable (cb) {
  this.table = TABLE
  debug('connection init')
  r.connect({
    host: HOST,
    port: PORT
  }, function (err, conn) {
    if (err) { return cb(err) }
    debug('connection created')
    r.tableCreate(TABLE).run(conn, function (err) {
      debug('table created')
      if (err && !/exist/.test(err.message)) { return cb(err) }
      conn.close()
      cb()
    })
  })
}

module.exports.dropTable = dropTable

function dropTable (cb) {
  debug('connection init')
  r.connect({
    host: HOST,
    port: PORT
  }, function (err, conn) {
    if (err) { return cb(err) }
    debug('connection created')
    r.tableDrop(TABLE).run(conn, function (err) {
      if (err && !/exist/.test(err.message)) { return cb(err) }
      debug('table dropped')
      conn.close()
      cb()
    })
  })
}
