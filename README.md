# rethinkdb-primus  [![Build Status](https://travis-ci.org/tjmehta/rethinkdb-primus.svg)](https://travis-ci.org/tjmehta/rethinkdb-primus) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
Use rethinkdb over a primus connection

# Installation
```bash
npm i --save rethinkdb-primus
```

# Usage

### Server Example
On the server just import and setup the `rethinkdb-primus` primus plugin
```js
// ... setup server
var primus = new Primus(server, {
  transport: 'engine.io', // technically, any transport should work
  parser: 'binary'
})

primus.use('rethinkdb', require('rethinkdb-primus')({
  // rethinkdb connection options
  host: 'localhost',
  port: 28015,
}))

primus.on('connection', function (spark) {
  // if you want the spark to be a rethinkdb connection
  spark.pipeToRethinkDB({
    // query whitelist
    queryWhitelist: [
      // exact reql queries or reql query validator (https://github.com/tjmehta/validate-reql),
      // see "validation" section for examples
    ],
    // log any debug information such as what queries are allowed and denied
    logQueries: false,
    // you can also allow all queries for debugging purposes, etc
    unsafelyAllowAllQueries: false
    // specify database (only works if queryWhitelist is specified)
    db: 'foo-database'
  })
  // rethinkdb-primus will handle the rest
})
```

### Client Example
```js
var net = require('net')

var rethinkdb = require('rethinkdb')

var client = new Primus()
// The client monkey patches rethinkdb (and, temporarily, net and process)
var opts = {
  net: net,
  process: process,
  rethinkdb: rethinkdb
}
client.rethinkdbConnect(opts, function (err, conn) {
  if (err) { return done(err) }
  // run any query that is allowed by the whitelist
  // if the query is not allowed the error message will start w/ "Query not allowed"
  rethinkdb
    .table('table')
    .get('id')
    .run(conn, function (err, data) {
      if (err) { return done(err) }
      expect(data).to.not.exist
      done()
    })
})
```

### Validation Example
rethinkdb-primus uses [validate-reql](https://github.com/tjmehta/validate-reql), which monkey patches rethinkdb w/ some new query methods for validation

#### Example: Custom validation using refs: `r.rvRef`, `rvValidate`, and `r.rvOpt`
Place `r.rvRef('<name>')` in place of ReQL you want to manually validate in your whitelist ReQL

Note: if the actual value from the ReQL is a sequence of ReQL you will have to test it as Rethink AST

```js
/*
  server.js
 */
var queryWhitelist = [
  r
  .table('hello')
  .insert(r.rvRef('update'), r.rvRef('updateOpts'))
  .rvValidate(function (refs) {
    // this callback should a boolean or promise:
    // truthy means validation passes; falsey if validation fails.
    if (refs.update.foo !== 'bar') {
      return false
    } else if (refs.updateOpts.durable !== true) {
      // opts are defaulted to {}, automatically, so there is not need to check ref.updateOpts existance
      return false
    }
    return true
  })
  .rvOpt('db', 'foo-database') // specify database
]
primus.on('connection', function (spark) {
  // if you want the spark to be a rethinkdb connection
  spark.pipeToRethinkDB({
    // query whitelist
    queryWhitelist: queryWhitelist
    // specify db here if all queries are run on a single db (db: 'foo-database')
    // db option basically just runs `rvOpt('db', <db>)` on all you queries
  })
})
/*
  client.js
 */
var rethinkdb = require('rethinkdb')

var client = new Primus()
// The client monkey patches rethinkdb (and, temporarily, net and process)
var opts = {
  net: require('net'),
  process: process,
  rethinkdb: rethinkdb
}
client.rethinkdbConnect(opts, function (err, conn) {
  if (err) { throw err }
  // query examples
  rethinkdb
    .db('foo-database')
    .table('hello')
    .insert({ foo: 'bar' }, { durable: true })
    .run(conn, function (err) {
      // pass!
    })
  rethinkdb
    .db('bar-database')
    .table('hello')
    .insert({ foo: 'bar' }, { durable: true })
    .run(conn, function (err) {
      // fail! "Error: Query not allowed: opts mismatch"
    })
  rethinkdb
    .db('bar-database')
    .table('hello')
    .insert({ foo: 'qux' }, { durable: true })
    .run(conn, function (err) {
      // fail! "Error: Query not allowed: query mismatch"
    })
  rethinkdb
    .db('bar-database')
    .table('hello')
    .insert({ foo: 'qux' }, { durable: true })
    .run(conn, function (err) {
      // fail! "Error: Query not allowed: query mismatch"
    })
})
```

[More validation examples](https://github.com/tjmehta/validate-reql)

# Credits
Thank you [Mike Mintz](https://github.com/mikemintz)! Code is heavily inspired by [rethinkdb-websocket-server](https://github.com/mikemintz/rethinkdb-websocket-server)

# License
MIT
