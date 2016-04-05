// Karma configuration
// Generated on Fri Apr 01 2016 23:56:39 GMT-0700 (PDT)
require('../test/fixtures/load-env.js')
require('./fixtures/karma-primus.js')

var url = require('url')

var json = {
  // base path that will be used to resolve all patterns (eg. files, exclude)
  basePath: '',

  // frameworks to use
  // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
  frameworks: [
    'browserify',
    'mocha'
  ],

  // mocha config
  client: {
    mocha: {
      timeout: 20000
    }
  },

  // proxies
  proxies: {
    '/ajax': url.format({
      protocol: 'http:',
      hostname: process.env.RETHINKDB_HOST,
      port: process.env.RETHINKDB_HTTP_PORT,
      pathname: 'ajax'
    })
  },

  // list of files / patterns to load in the browser
  files: [
    'fixtures/primus-client.js',
    '*.js'
  ],

  // list of files to exclude
  exclude: [
  ],

  // preprocess matching files before serving them to the browser
  // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
  preprocessors: {
    '*.js': [ 'browserify' ]
  },

  // browserify options
  browserify: {
    transform: [['envify', {'NODE_ENV': process.env.NODE_ENV}]]
  },

  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  reporters: ['progress'],

  // web server port
  port: 9876,

  // enable / disable colors in the output (reporters and logs)
  colors: true,

  // enable / disable watching file and executing tests whenever any file changes
  autoWatch: true,

  // start these browsers
  // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
  browsers: ['Chrome'],

  // Continuous Integration mode
  // if true, Karma captures browsers, runs the tests and exits
  singleRun: false,

  // Concurrency level
  // how many browser should be started simultaneous
  concurrency: Infinity
}

module.exports = function (config) {
  // level of logging
  // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
  json.logLevel = config.LOG_INFO
  config.set(json)
}

