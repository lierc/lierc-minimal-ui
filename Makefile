jquery = static/js/jquery.js
vendor = $(wildcard static/js/vendor/*)
site = $(wildcard static/js/lierc/*)
css = $(wildcard static/css/*)
map = static/site.map.js

all: static/site.js static/site.css static/site.map.js

static/site.map.js static/site.js: $(jquery) $(vendor) $(site)
	uglifyjs \
		--source-map /tmp/site.map.js \
		--source-map-url /$(map) \
		--prefix 1 \
		$(jquery) $(vendor) $(site) > /tmp/site.js
	install /tmp/site.js static/site.js
	install /tmp/site.map.js static/site.map.js

static/site.css: $(css)
	cat $(css) > /tmp/site.css
	install /tmp/site.css static/site.css

.PHONY: watch
watch:
	bin/watch --exec make --dir static --ignore .gz --ignore .map.js
