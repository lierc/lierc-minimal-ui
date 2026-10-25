.PHONY: bust
bust:
	bin/cache-bust index.html app/index.html search/index.html unsubscribe/index.html

.PHONY: emoji
emoji:
	bin/update-emoji > static/emoji.json
	cat static/emoji.json | gzip > static/emoji.json.gz
	cat static/emoji.json | brotli > static/emoji.json.br

.PHONY: vendor
vendor:
	curl https://raw.githubusercontent.com/mfranzke/datalist-polyfill/master/datalist-polyfill.js > static/js/vendor/datalist-polyfill.js
