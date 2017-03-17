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
      $.ajax({
        url: "//noembed.com/embed",
        type: "GET",
        dataType: "json",
        data: {url: href, maxwidth: 450},
        success: function(res) {
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
        }
      });
      return;
    };
  }
};

Embed.load = function() {
  $.ajax({
    url: "//noembed.com/providers",
    type: "GET",
    dataType: "json",
    success: function(res) {
      for (provider in res) {
        var p = res[provider].patterns;
        for (var i=0; i < p.length; i++) {
          Embed.patterns.push(new RegExp(p[i]));
        }
      }
    }
  });
};

Embed.load();
