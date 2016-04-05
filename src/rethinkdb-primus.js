module.exports = createPlugin

function createPlugin (rethinkdbOpts) {
  return {
    server: require('./rethinkdb-primus.server.js')(rethinkdbOpts),
    client: require('./rethinkdb-primus.client.js')
  }
}