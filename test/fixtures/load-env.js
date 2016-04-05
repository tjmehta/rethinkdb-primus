process.env = process.env || {}
if (process.env.NODE_ENV === 'development') {
  process.env.PORT = process.env.PORT = 3001
  process.env.RETHINKDB_HOST = process.env.RETHINKDB_HOST = 'local.docker'
  process.env.RETHINKDB_HTTP_PORT = process.env.RETHINKDB_HTTP_PORT = 8080
  process.env.RETHINKDB_PORT = process.env.RETHINKDB_PORT = 28015
  process.env.RETHINKDB_TABLE = process.env.RETHINKDB_TABLE = 'rethinkdb_primus_test'
} else if (process.env.NODE_ENV === 'travis') {
  process.env.PORT = process.env.PORT = 3001
  process.env.RETHINKDB_HOST = process.env.RETHINKDB_HOST = 'localhost'
  process.env.RETHINKDB_HTTP_PORT = process.env.RETHINKDB_HTTP_PORT = 8080
  process.env.RETHINKDB_PORT = process.env.RETHINKDB_PORT = 28015
  process.env.RETHINKDB_TABLE = process.env.RETHINKDB_TABLE = 'rethinkdb_primus_test'
} else {
  throw new Error('NODE_ENV is required')
}
