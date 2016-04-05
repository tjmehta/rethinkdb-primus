require('../../test/fixtures/load-env.js')
var http = require('http')

var createPrimus = require('./create-primus.js')
var queryWhitelist = require('./query-whitelist.js')
var shimmer = require('shimmer')

var rethinkdbPrimusOpts = {}
rethinkdbPrimusOpts.queryWhitelist = queryWhitelist

shimmer.wrap(http, 'createServer', function (orig) {
  return function () {
    var server = orig.apply(this, arguments)
    createPrimus(server, rethinkdbPrimusOpts)
    return server
  }
})
