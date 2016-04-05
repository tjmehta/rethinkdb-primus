require('./fixtures/load-env.js')

var TABLE = process.env.RETHINKDB_TABLE

var describe = global.describe
var before = global.before
var after = global.after
var beforeEach = global.beforeEach
var afterEach = global.afterEach
var it = global.it

var net = require('net')
var url = require('url')

var expect = require('chai').expect
var rethinkdb = require('rethinkdb')
var ValidationError = require('rethinkdb-validator-stream').ValidationError

var dbState = require('./fixtures/db-state.js')
var createServer = require('./fixtures/create-server.js')

var Primus = require('primus')
var primusUrl = url.format({
  protocol: 'http:',
  hostname: 'localhost',
  port: process.env.PORT,
  pathname: 'rethinkdb'
})
var closeSocket = function (client) {
  // note: some errors that close the connection trigger auto-reconnect
  // if the client opens again, close it for good
  client.once('open', function () {
    client.end()
  })
  if (client.writable) {
    client.end()
  }
}
var createSocket = function () {
  var Socket = Primus.createSocket({
    transport: 'engine.io',
    parser: 'binary',
    pathname: 'rethinkdb',
    plugin: {
      rethinkdb: require('../index.js')({
        host: process.env.RETHINKDB_HOST,
        port: process.env.RETHINKDB_PORT
      })
    }
  })

  return new Socket(primusUrl)
}

describe('Server tests', function () {
  describe('allow all queries', function () {
    before(function (done) {
      this.server = createServer({
        unsafelyAllowAllQueries: true,
        logQueries: true,
        handshakeTimeout: 0
      })
      this.server.listen(done)
    })
    after(function (done) {
      this.server.close(done)
    })

    it('should connect', function (done) {
      var client = createSocket()
      client.end()
      done()
    })

    describe('rethinkdb connection', function () {
      beforeEach(dbState.createTable)
      afterEach(dbState.dropTable)
      beforeEach(function (done) {
        this.client = createSocket()
        done()
      })
      afterEach(function (done) {
        closeSocket(this.client)
        done()
      })

      it('should create a rethinkdb connection and run a query', function (done) {
        var opts = {
          net: net,
          rethinkdb: rethinkdb,
          process: process
        }
        this.client.rethinkdbConnect(opts, function (err, conn) {
          if (err) { return done(err) }
          rethinkdb
            .table(TABLE)
            .insert({
              foo: 'hello'
            })
            .run(conn, done)
        })
      })

      describe('errors', function () {
        it('should close connection if query is corrupt (socket error)', function (done) {
          var self = this
          var opts = {
            net: net,
            rethinkdb: rethinkdb,
            process: process
          }
          this.client.rethinkdbConnect(opts, function (err, conn) {
            if (err) { return done(err) }
            // note: not sure why but 9's streaming into rethinkdb make it blow up
            var zeroes = new Buffer(100).fill(9)
            self.client.write(zeroes)
            self.client.once('close', function () {
              done()
            })
          })
        })
      })
    })
  })

  describe('whitelist tests', function () {
    before(function (done) {
      this.queryWhitelist = [
        rethinkdb
          .table(TABLE)
          .insert({ foo: 'hello' })
      ]
      this.server = createServer({
        queryWhitelist: this.queryWhitelist,
        logQueries: true
      })
      this.server.listen(done)
    })
    after(function (done) {
      this.server.close(done)
    })

    beforeEach(dbState.createTable)
    beforeEach(function (done) {
      this.client = createSocket()
      done()
    })
    afterEach(dbState.dropTable)
    afterEach(function (done) {
      closeSocket(this.client)
      done()
    })

    it('should create connect, run an allowed query, and recieve response', function (done) {
      var query = this.queryWhitelist[0]
      var opts = {
        net: net,
        rethinkdb: rethinkdb,
        process: process
      }
      this.client.rethinkdbConnect(opts, function (err, conn) {
        if (err) { return done(err) }
        query.run(conn, done)
      })
    })

    it('should create connect, run a denied query, and recieve an error', function (done) {
      var opts = {
        net: net,
        rethinkdb: rethinkdb,
        process: process
      }
      this.client.rethinkdbConnect(opts, function (err, conn) {
        if (err) { return done(err) }
        rethinkdb
          .table(TABLE)
          .get('yo')
          .run(conn, function (err) {
            expect(err).to.exist
            expect(err.message).to.match(/Query not allowed/)
            expect(err.message).to.match(/query.*mismatch/)
            done()
          })
      })
    })

    describe('errors', function () {
      it('should close connection if query is corrupt (val/chunker error)', function (done) {
        var self = this
        var opts = {
          net: net,
          rethinkdb: rethinkdb,
          process: process
        }
        this.client.rethinkdbConnect(opts, function (err, conn) {
          if (err) { return done(err) }
          var zeroes = new Buffer(12).fill(0)
          self.client.write(zeroes)
          self.client.once('close', function () {
            done()
          })
        })
      })

      it('should close connection if query is longer than max length', function (done) {
        var self = this
        var opts = {
          net: net,
          rethinkdb: rethinkdb,
          process: process
        }
        this.client.rethinkdbConnect(opts, function (err, conn) {
          if (err) { return done(err) }
          var zeroes = new Buffer(1000).fill(0)
          self.client.write(zeroes)
          self.client.once('close', function () {
            done()
          })
        })
      })

      it('should close connection if spark errors', function (done) {
        var self = this
        var opts = {
          net: net,
          rethinkdb: rethinkdb,
          process: process
        }
        this.client.rethinkdbConnect(opts, function (err, conn) {
          if (err) { return done(err) }
          var serverSpark = self.server.primus.__sparks[0]
          serverSpark.emit('error', new Error('boom'))
          var zeroes = new Buffer(1000).fill(0)
          self.client.write(zeroes)
          self.client.once('close', function () {
            done()
          })
        })
      })

      it('should close connection if responseChunker errors', function (done) {
        var self = this
        var opts = {
          net: net,
          rethinkdb: rethinkdb,
          process: process
        }
        this.client.rethinkdbConnect(opts, function (err, conn) {
          if (err) { return done(err) }
          var serverSpark = self.server.primus.__sparks[0]
          serverSpark.rethinkdb.responseChunker.emit('error', new Error('boom'))
          var zeroes = new Buffer(1000).fill(0)
          self.client.write(zeroes)
          self.client.once('close', function () {
            done()
          })
        })
      })

      it('should close connection if validatorStream errors (unexpected validation error)', function (done) {
        var self = this
        var opts = {
          net: net,
          rethinkdb: rethinkdb,
          process: process
        }
        this.client.rethinkdbConnect(opts, function (err, conn) {
          if (err) { return done(err) }
          var serverSpark = self.server.primus.__sparks[0]
          serverSpark.rethinkdb.validatorStream.emit('error', new ValidationError('boom'))
          var zeroes = new Buffer(1000).fill(0)
          self.client.write(zeroes)
          self.client.once('close', function () {
            done()
          })
        })
      })

      it('should close connection if spark closes', function (done) {
        var self = this
        var opts = {
          net: net,
          rethinkdb: rethinkdb,
          process: process
        }
        this.client.rethinkdbConnect(opts, function (err, conn) {
          if (err) { return done(err) }
          var serverSpark = self.server.primus.__sparks[0]
          serverSpark.emit('close')
          var zeroes = new Buffer(1000).fill(0)
          self.client.write(zeroes)
          self.client.once('close', function () {
            done()
          })
        })
      })
    })
  })

  describe('handshake timeouts', function () {
    describe('query handshake timeout', function () {
      before(function (done) {
        this.queryWhitelist = [
          rethinkdb
            .table(TABLE)
            .insert({ foo: 'hello' })
        ]
        this.server = createServer({
          queryWhitelist: this.queryWhitelist,
          logQueries: true,
          handshakeTimeout: 1
        })
        this.server.listen(done)
      })
      after(function (done) {
        this.server.close(done)
      })

      beforeEach(dbState.createTable)
      beforeEach(function (done) {
        this.client = createSocket()
        done()
      })
      afterEach(dbState.dropTable)
      afterEach(function (done) {
        closeSocket(this.client)
        done()
      })

      it('should error if query handshake times out', function (done) {
        this.client.once('close', function () {
          done()
        })
      })
    })

    describe('response handshake timeout', function () {
      before(function (done) {
        this.queryWhitelist = [
          rethinkdb
            .table(TABLE)
            .insert({ foo: 'hello' })
        ]
        this.server = createServer({
          queryWhitelist: this.queryWhitelist,
          logQueries: true,
          handshakeSuccessTimeout: 1
        })
        this.server.listen(done)
      })
      after(function (done) {
        this.server.close(done)
      })

      beforeEach(dbState.createTable)
      beforeEach(function (done) {
        this.client = createSocket()
        done()
      })
      afterEach(dbState.dropTable)
      afterEach(function (done) {
        closeSocket(this.client)
        done()
      })

      it('should error if response handshake times out', function (done) {
        var self = this
        var opts = {
          net: net,
          rethinkdb: rethinkdb,
          process: process
        }
        this.client.rethinkdbConnect(opts, function () {})
        this.client.once('open', function () {
          var serverSpark = self.server.primus.__sparks[0]
          var responseChunker = serverSpark.rethinkdb.responseChunker
          responseChunker.unpipe(serverSpark)
          self.client.once('close', function () {
            done()
          })
        })
      })
    })
  })
})
