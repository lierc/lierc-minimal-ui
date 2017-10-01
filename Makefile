handlebars = $(wildcard templates/*)
templates = static/js/templates.js

all: $(templates)

$(templates): $(handlebars)
	handlebars $(handlebars) > $(templates)

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
	curl https://raw.githubusercontent.com/Yaffle/EventSource/master/src/eventsource.js > static/js/vendor/eventsource.js
	curl https://raw.githubusercontent.com/github/fetch/master/fetch.js > static/js/vendor/fetch.js
	curl https://raw.githubusercontent.com/taylorhakes/promise-polyfill/master/promise.js > static/js/vendor/promise.js
	curl https://raw.githubusercontent.com/RubaXa/Sortable/master/Sortable.js > static/js/vendor/Sortable.js
