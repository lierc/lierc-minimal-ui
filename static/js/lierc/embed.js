var Embed = {
  patterns: [],
  embed_all: function(el, panel) {
    el.find('a[href]').each(function() {
      Embed.embed(this, panel);
    });
  },
  embed: function(a, panel) {
    var href = a.href;

    for (var i=0; i < Embed.patterns.length; i++) {
      if (Embed.patterns[i].test(href)) {
        $.ajax({
          url: "//noembed.com/embed",
          type: "GET",
          dataType: "json",
          data: {url: href, maxwidth: 450},
          success: function(res) {
            if (! res.error)
              panel.embed(a, res);
          }
        });
        return;
      }; 
    }
  }
};

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

