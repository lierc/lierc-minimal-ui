handlebars = $(wildcard templates/*)
templates = static/js/templates.js

all: $(templates)

$(templates): $(handlebars)
	handlebars $(handlebars) > $(templates)

.PHONY: bust
bust: $(templates)
	bin/cache-bust index.html app/index.html search/index.html unsubscribe/index.html

.PHONY: watch
watch:
	bin/watch --exec make --dir templates --ignore .swp

.PHONY: emoji
emoji:
	bin/update-emoji > static/emoji-data.json
	cat static/emoji-data.json | gzip > static/emoji-data.json.gz
	cat static/emoji-data.json | brotli > static/emoji-data.json.br

.PHONY: vendor
vendor:
	curl https://raw.githubusercontent.com/mfranzke/datalist-polyfill/master/datalist-polyfill.js > static/js/vendor/datalist-polyfill.js
