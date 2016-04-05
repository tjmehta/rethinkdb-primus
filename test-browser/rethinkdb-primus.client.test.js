require('../test/fixtures/load-env.js')

var TABLE = process.env.RETHINKDB_TABLE
var keys = Object.keys(process.env)

var afterEach = global.afterEach
var beforeEach = global.beforeEach
var describe = global.describe
var it = global.it
var Primus = global.Primus

var url = require('url')

var expect = require('chai').expect
var net = require('net')
var rethinkdb = require('rethinkdb')

var queryWhitelist = require('./fixtures/query-whitelist.js')

var primusUrl = url.format({
  protocol: 'http:',
  host: 'localhost:' + 9876,
  pathname: 'rethinkdb'
})

describe('Client tests', function () {
  it('should connect', function (done) {
    var client = new Primus(primusUrl)
    client.end()
    done()
  })

  describe('query whitelist', function () {
    beforeEach(function (done) {
      var self = this
      rethinkdb.connect({ host: 'localhost', port: 9876, pathname: '/' }, function (err, conn) {
        if (err) { return done(err) }
        self.httpConn = conn
        rethinkdb.tableCreate(TABLE).run(self.httpConn, function (err) {
          if (err && !/exists/.test(err.message)) { return done(err) }
          done()
        })
      })
    })
    beforeEach(function (done) {
      this.client = new Primus(primusUrl)
      done()
    })
    afterEach(function (done) {
      if (!this.httpConn) { return done() }
      rethinkdb.tableDrop(TABLE).run(this.httpConn, function (err) {
        if (err && !/exists/.test(err.message)) { return done(err) }
        done()
      })
    })
    afterEach(function (done) {
      if (this.client && this.client.writable) {
        this.client.end()
      }
      done()
    })

    it('should create connect, run an allowed query, and recieve response', function (done) {
      var query = queryWhitelist[0]
      var opts = {
        net: net,
        process: process,
        rethinkdb: rethinkdb
      }
      this.client.rethinkdbConnect(opts, function (err, conn) {
        if (err) { return done(err) }
        query.run(conn, function (err, data) {
          if (err) { return done(err) }
          expect(data).to.not.exist
          done()
        })
      })
    })

    it('should create connect, run a denied query, and recieve an error', function (done) {
      var opts = {
        net: net,
        process: process,
        rethinkdb: rethinkdb
      }
      this.client.rethinkdbConnect(opts, function (err, conn) {
        if (err) { return done(err) }
        rethinkdb
          .table('bogus-face')
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
      it('should close connection if query is corrupt (socket error)', function (done) {
        var self = this
        var opts = {
          net: net,
          process: process,
          rethinkdb: rethinkdb
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
    describe('errors', function () {
      it('should close connection if query is corrupt (val/chunker error)', function (done) {
        var self = this
        var opts = {
          net: net,
          process: process,
          rethinkdb: rethinkdb
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
          process: process,
          rethinkdb: rethinkdb
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
    })
  })
})
