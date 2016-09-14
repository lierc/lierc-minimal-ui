var Emoji = function() {
  var emoji = this;

  var list = $('#emoji ul');

  $.ajax({
    url: "/static/emoji-data.json",
    type: "GET",
    dataType: "json",
    success: function(res) {
      for (var i=0; i < res.length; i++) {
        var li = $('<li/>', {
          'data-code': res[i]['code'],
          'data-name': res[i]['name'],
          'data-chars': res[i]['chars'],
          title: res[i]['name']
        }).text(res[i]['chars']);

        list.append(li);
      }
    }
  });
};
