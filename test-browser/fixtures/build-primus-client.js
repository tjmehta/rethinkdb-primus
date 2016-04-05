var http = require('http')
var primus = require('../../test/fixtures/create-primus.js')(http.createServer(), {})
primus.save(__dirname + '/primus-client.js')
