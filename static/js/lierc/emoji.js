var Emoji = function() {
  var emoji = this;

  var list = $('#emoji ul');

  $.ajax({
    url: "/static/emoji-data.json",
    type: "GET",
    dataType: "json",
    success: function(res) {
      for (var i=0; i < res.length; i++) {
        var annotations = res[i]['annotations'] || [];
        var li = $('<li/>', {
          'data-code': res[i]['code'],
          'data-chars': res[i]['chars'],
          'data-keywords': annotations.join(" ").toLowerCase(),
          title: res[i]['name']
        }).text(res[i]['chars']);

        list.append(li);
      }
    }
  });

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
      else
        hide.push(items[i]);
    }

    $(show).show();
    $(hide).hide();
  };
};
