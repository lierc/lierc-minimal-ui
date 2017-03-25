var Embed = {
  patterns: []
};

var embed_id = 0;

Embed.embed_all = function(el, panel) {
  el.find('a[href]').each(function() {
    Embed.embed(this, panel);
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
            var toggle = document.createElement('SPAN');
            res['id'] = id;
            toggle.setAttribute('data-embed', JSON.stringify(res));
            toggle.setAttribute('data-embed-id', id);
            toggle.setAttribute("class", "embed-toggle");
            toggle.setAttribute("aria-hidden", "true");
            a.parentNode.insertBefore(toggle, a.nextSibling);
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
