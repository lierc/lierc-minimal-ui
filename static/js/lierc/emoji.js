var Emoji = function() {
  var emoji = this;
  var list = $('#emoji ul');

  for (var i=0; i < Emoji.data.length; i++) {
    var li = $('<li/>', {
      'data-code': Emoji.data[i]['code'],
      'data-chars': Emoji.data[i]['chars'],
      'data-keywords': Emoji.data[i]['keywords'],
      'data-name': Emoji.data[i]['name'],
      title: Emoji.data[i]['name']
    }).text(Emoji.data[i]['chars']);
    list.append(li);
  }

  emoji.filter = function(list, text) {
    var items = list.find('li');

    if (!text) {
      items.show();
      return;
    }

    var len = items.length;
    var t = text.toLowerCase();
    var show = [];
    var hide = [];

    for (var i=0; i < len; i++) {
      if (items[i].getAttribute('data-keywords').indexOf(t) != -1)
        show.push(items[i]);
      else if (items[i].getAttribute('data-name').indexOf(t) != -1)
        show.push(items[i]);
      else
        hide.push(items[i]);
    }

    $(show).show();
    $(hide).hide();
  };
};

Emoji.names = {}
Emoji.data = [];
Emoji.regex = new RegExp();

(function() {
  $.ajax({
    url: "/static/emoji-data.json",
    type: "GET",
    dataType: "json",
    success: function(res) {
      var codepoints = [];
      for (var i=0; i < res.length; i++) {
        var annotations = res[i]['annotations'] || [];
        Emoji.data.push({
          code: res[i]['code'],
          chars: res[i]['chars'],
          keywords: annotations.join(" ").toLowerCase(),
          name: res[i]['name']
        });

        Emoji.names[ res[i]['chars'] ] = res[i]['name'];

        if (res[i]['code'].length > 4) {
          var C = parseInt("0x"+res[i]['code']);
          var H = Math.floor((C - 0x10000) / 0x400) + 0xD800;
          var L = (C - 0x10000) % 0x400 + 0xDC00;
          codepoints.push( "\\u" + H.toString(16) + "\\u" + L.toString(16));
        }
        else {
          codepoints.push( "\\u" + res[i]['code'] );
        }
      }
      Emoji.regex = new RegExp("(" + codepoints.join("|") + ")", "g");
    }
  });
})();
