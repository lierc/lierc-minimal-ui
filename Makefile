jquery = static/js/jquery.js
vendor = $(wildcard static/js/vendor/*)
site = $(wildcard static/js/lierc/*)
css = $(wildcard static/css/*)
map = static/site.map.js

all: static/site.js.gz static/site.css.gz static/site.map.js.gz

static/site.map.js.gz: $(map)
	gzip -c $(map) > $(map).gz

static/site.map.js static/site.js.gz: $(jquery) $(vendor) $(site)
	uglifyjs \
		--source-map /tmp/site.map.js \
		--source-map-url /$(map) \
		--prefix 1 \
		$(jquery) $(vendor) $(site) \
	| gzip > /tmp/site.js.gz
	install /tmp/site.js.gz static/site.js.gz
	install /tmp/site.map.js static/site.map.js

static/site.css.gz: $(css)
	cat $(css) | gzip > /tmp/site.css.gz
	install /tmp/site.css.gz static/site.css.gz
