build:
	mkdir -p lib && cp ./src/* ./lib/ && \
	( \
		echo 'module.exports = function (primus, primusOpts) {\n'; \
		browserify -t [ envify --NODE_ENV $(NODE_ENV) ] ./src/rethinkdb-primus.client.js; \
		echo "\n}\n" \
	) > ./lib/rethinkdb-primus.client.js
build-browser:
	make build && \
	node ./test-browser/fixtures/build-primus-client.js