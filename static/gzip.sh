cat js/jquery.js js/html.sortable.min.js js/format.js js/completion.js js/history.js js/keyboard.js js/stream.js js/channel.js js/connection.js js/panel.js js/render.js js/auth.js js/lierc.js | uglifyjs | gzip > site.js.gz
cat css/*.css | gzip > site.css.gz
