# rethinkdb-primus
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

primus.use('rethinkdb', require('rethinkdb-primus'))({
  // rethinkdb connection options
  host: 'localhost',
  port: 28015,
})

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

# Credits
Thank you [Mike Mintz](https://github.com/mikemintz)! Code is heavily inspired by [rethinkdb-websocket-server](https://github.com/mikemintz/rethinkdb-websocket-server)

# License
MIT
