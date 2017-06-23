var Embed = {
  patterns: []
};

var embed_id = 0;

Embed.embed_all = function(els, panel) {
  els.forEach(function(el) {
    el.querySelectorAll('.message-text a[href]').forEach(function(link) {
      Embed.embed(link, panel);
    });
  });
};

Embed.embed = function(a, panel) {
  var href = a.href;
  var id = embed_id++;

  for (var i=0; i < Embed.patterns.length; i++) {
    if (Embed.patterns[i].test(href)) {
      var url = "//noembed.com/embed?url="
        + encodeURIComponent(href) + "&maxwidth=450";

      fetch(url).then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).then(function(res) {
        if (! res.error) {
          panel.scroll(function() {
            res['id'] = id;
            var html = Handlebars.templates.embed_toggle({
              embed: JSON.stringify(res),
              id: id
            });
            a.insertAdjacentHTML('afterend', html);
            panel.embed(a, res);
          });
        }
      });

      return;
    }
  }
};

Embed.load = function() {
  fetch("//noembed.com/providers")
    .then(function(res) {
      if (! res.ok)
        throw Error(res.statusText);
      return res.json();
    }).then(function(res) {
      for (provider in res) {
        var p = res[provider].patterns;
        for (var i=0; i < p.length; i++) {
          Embed.patterns.push(new RegExp(p[i]));
        }
      }
    });
};

Embed.load();
