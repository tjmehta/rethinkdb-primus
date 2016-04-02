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
var Primus =
```

# Prior work credits
Thank you [Mike Mintz](https://github.com/mikemintz)! Code is heavily inspired by [rethinkdb-websocket-server](https://github.com/mikemintz/rethinkdb-websocket-server)

# License
MIT
