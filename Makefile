vendor = $(wildcard static/js/vendor/*)
site = $(wildcard static/js/lierc/*)
css = $(wildcard static/css/*)
handlebars = $(wildcard templates/*)
templates = static/js/templates.js
map = static/site.js.map

all: index.html.br static/site.js static/site.css static/site.map.js

index.html.br index.html.gz: index.html
	cat index.html | bro > index.html.br
	gzip -c -k index.html > index.html.gz

$(templates): $(handlebars)
	handlebars $(handlebars) > $(templates)

static/site.js.map static/site.js: $(vendor) $(templates) $(site)
	uglifyjs \
		$(vendor) $(templates) $(site) \
		--source-map url=static/site.js.map \
		--prefix 1 \
		-o /tmp/site.js
	install /tmp/site.js static/site.js
	cat static/site.js | bro > static/site.js.br
	gzip -c -k static/site.js > static/site.js.gz
	install /tmp/site.js.map static/site.js.map
	cat static/site.js.map | bro > static/site.js.map.br
	gzip -c -k static/site.js.map > static/site.js.map.gz

static/site.css: $(css)
	cat $(css) > /tmp/site.css
	install /tmp/site.css static/site.css
	cat static/site.css | bro > static/site.css.br
	gzip -c -k static/site.css > static/site.css.gz

.PHONY: watch
watch:
	bin/watch --exec make --dir . --ignore .gz --ignore .br --ignore .js.map

.PHONY: emoji
emoji:
	bin/update-emoji > static/emoji-data.json
	cat static/emoji-data.json | gzip > static/emoji-data.json.gz
	cat static/emoji-data.json | bro > static/emoji-data.json.br
