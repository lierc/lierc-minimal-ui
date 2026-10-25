.PHONY: bust
bust:
	bin/cache-bust index.html app/index.html search/index.html unsubscribe/index.html

.PHONY: emoji
emoji:
	bin/update-emoji > static/emoji-data.json
	cat static/emoji-data.json | gzip > static/emoji-data.json.gz
	cat static/emoji-data.json | brotli > static/emoji-data.json.br

.PHONY: vendor
vendor:
	curl https://raw.githubusercontent.com/mfranzke/datalist-polyfill/master/datalist-polyfill.js > static/js/vendor/datalist-polyfill.js
