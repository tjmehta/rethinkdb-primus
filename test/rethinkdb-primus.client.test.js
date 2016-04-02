// require('assert-env')([
//   'PORT'
// ])

// var url = require('url')

// var rethinkdb = require('rethinkdb')

// var server = require('./fixtures/server.js')
// var rethinkdbPrimus = require('../')

// var primus = server.primus
// var primusUrl = url.format({
//   protocol: 'http:',
//   hostname: 'localhost',
//   port: process.env.PORT,
//   pathname: 'rethinkdb'
// })

// describe('Client tests', function () {
//   before(function (done) {
//     server.listen(done)
//   })
//   after(function (done) {
//     server.close(done)
//   })
//   it('should connect', function (done) {
//     var client = new primus.Socket(primusUrl)
//     client.end()
//     done()
//   })
// })