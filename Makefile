jquery = static/js/jquery.js
vendor = $(wildcard static/js/vendor/*)
site = $(wildcard static/js/lierc/*)
css = static/css/lierc.css

all: static/site.js.gz static/site.css.gz

static/site.js.gz: $(jquery) $(vendor) $(site)
	cat $(jquery) $(vendor) $(site) | uglifyjs | gzip > static/site.js.gz

static/site.css.gz: $(css)
	cat $(css) | gzip > static/site.css.gz
