.PHONY: emoji
emoji:
	bin/update-emoji > static/emoji.json
	cat static/emoji.json | gzip > static/emoji.json.gz
	cat static/emoji.json | brotli > static/emoji.json.br

.PHONY: vendor
vendor:
	curl https://raw.githubusercontent.com/mfranzke/datalist-polyfill/master/datalist-polyfill.js > static/js/vendor/datalist-polyfill.js

# the release tree, as CI builds it: make dist VERSION=v7.0.0
.PHONY: dist
dist:
	rm -rf dist
	bin/build $(VERSION) dist
