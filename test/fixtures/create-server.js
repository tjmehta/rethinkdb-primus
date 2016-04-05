require('./load-env.js')

var http = require('http')
var createPrimus = require('./create-primus.js')

module.exports = createServer

function createServer (pluginOpts) {
  var server = http.createServer()

  server.primus = createPrimus(server, pluginOpts)

  server.listen = server.listen.bind(server, process.env.PORT)

  return server
}
