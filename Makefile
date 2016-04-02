build:
	mkdir -p lib && cp ./src/* ./lib/ && \
	( \
		echo 'module.exports = function (primus, primusOpts) {\n'; \
		echo 'if (!process.browser) { var nodeRequire = require }\n'; \
		browserify ./src/rethinkdb-primus.client.js; \
		echo "\n}\n" \
	) > ./lib/rethinkdb-primus.client.js