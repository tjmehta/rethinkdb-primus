var TABLE = process.env.RETHINKDB_TABLE

var rethinkdb = require('rethinkdb')

module.exports = [
  rethinkdb
    .table(TABLE)
    .get('id'),
  rethinkdb
    .table(TABLE)
    .insert({
      id: 'id',
      data: 'foo'
    })
]
