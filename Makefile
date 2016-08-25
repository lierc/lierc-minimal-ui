jquery = static/js/jquery.js
vendor = $(wildcard static/js/vendor/*)
site = $(wildcard static/js/lierc/*)
css = static/css/lierc.css
map = static/site.map.js

all: static/site.js.gz static/site.css.gz static/site.map.js.gz

static/site.map.js.gz: $(map)
	gzip -c $(map) > $(map).gz

static/site.map.js static/site.js.gz: $(jquery) $(vendor) $(site)
	uglifyjs \
		--source-map $(map) \
		--source-map-url /$(map) \
		--prefix 1 \
		$(jquery) $(vendor) $(site) \
	| gzip > static/site.js.gz

static/site.css.gz: $(css)
	cat $(css) | gzip > static/site.css.gz
