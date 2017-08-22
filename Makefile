vendor = $(wildcard static/js/vendor/*)
site = $(wildcard static/js/lierc/*)
css = $(wildcard static/css/*)
handlebars = $(wildcard templates/*)
templates = static/js/templates.js

build_js = $(foreach file, site.js site.js.map, static/$(file) static/$(file).gz static/$(file).br)
build_css = $(foreach file, site.css, static/$(file) static/$(file).gz static/$(file).br)
build_index = $(foreach file, index.html, $(file).gz $(file).br)
build_home = $(foreach file, home.html, $(file).gz $(file).br)

all: $(build_js) $(build_css) $(build_index) $(build_home)

$(build_home): home.html
	cat home.html | brotli > home.html.br
	gzip -c -k home.html > home.html.gz

$(build_index): index.html
	cat index.html | brotli > index.html.br
	gzip -c -k index.html > index.html.gz

$(templates): $(handlebars)
	handlebars $(handlebars) > $(templates)

$(build_js): $(vendor) $(templates) $(site)
	uglifyjs \
		$(vendor) $(templates) $(site) \
		--source-map url=static/site.js.map \
		--prefix 1 \
		-o /tmp/site.js
	install /tmp/site.js static/site.js
	cat static/site.js | brotli > static/site.js.br
	gzip -c -k static/site.js > static/site.js.gz
	install /tmp/site.js.map static/site.js.map
	cat static/site.js.map | brotli > static/site.js.map.br
	gzip -c -k static/site.js.map > static/site.js.map.gz

$(build_css): $(css)
	cat $(css) > /tmp/site.css
	install /tmp/site.css static/site.css
	cat static/site.css | brotli > static/site.css.br
	gzip -c -k static/site.css > static/site.css.gz

.PHONY: watch
watch:
	bin/watch --exec make --dir . --ignore site.js --ignore site.css --ignore .swp --ignore .gz --ignore .br --ignore .js.map

.PHONY: emoji
emoji:
	bin/update-emoji > static/emoji-data.json
	cat static/emoji-data.json | gzip > static/emoji-data.json.gz
	cat static/emoji-data.json | brotli > static/emoji-data.json.br
