var Emoji = {
  names: {},
  regex: new RegExp("impossibleregexthatshouldnothappen"),
  list:  document.querySelector('#emoji ul'),
};

Emoji.filter = function(list, text) {
  var items = list.querySelectorAll('li');
  var len = items.length;

  if (!text) {
    for (var i=0; i < len; i++) {
      items[i].style.display = 'inline-block';
    }
    return;
  }

  var t = text.toLowerCase();

  for (var i=0; i < len; i++) {
    if (items[i].getAttribute('data-keywords').indexOf(t) != -1) {
      items[i].style.display = 'inline-block';
    }
    else if (items[i].getAttribute('data-name').indexOf(t) != -1) {
      items[i].style.display = 'inline-block';
    }
    else {
      items[i].style.display = 'none';
    }
  }
};

Emoji.load = function() {
  var safari = navigator.userAgent.indexOf('Safari') != -1
    && navigator.userAgent.indexOf('Chrome') == -1;

  fetch("/static/emoji-data.json").then(function(res) {
    if (!res.ok)
      throw Error(res.statusText);
    return res.json();
  }).then(function(res) {
    var codepoints = [];
    var length = res.length;
    var data = [];
    for (var i=0; i < length; i++) {
      var annotations = res[i]['annotations'] || [];
      data.push({
        chars: res[i]['chars'],
        keywords: annotations.join(" ").toLowerCase(),
        name: res[i]['name']
      });

      Emoji.names[ res[i]['chars'] ] = res[i]['name'];

      var code = "";
      for (var j=0; j < res[i]['codes'].length; j++) {
        code += "\\u{" + res[i]['codes'][j] + "}";
      }
      codepoints.push(code);
    }
    var sorted = codepoints.sort(function(a, b) {
      if (a.length > b.length)
        return -1;
      else if (a.length == b.length)
        return 0;
      else
        return 1;
    });

    Emoji.regex = new RegExp("(" + sorted.join("|") + ")", "ug");

    function append_chunk () {
      var chunk = data.splice(0, 50);
      if (chunk.length > 0) {
        var html = Template("emoji", { emoji:  chunk });
        Emoji.list.insertAdjacentHTML('beforeend', html);
      }
      if (chunk.length == 50) {
        window.requestAnimationFrame(append_chunk);
      }
    }

    if (Emoji.list) {
      window.requestAnimationFrame(append_chunk);
    }
  });
};

