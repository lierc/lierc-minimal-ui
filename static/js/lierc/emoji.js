var Emoji = {
  names: {},
  data:  [],
  regex: new RegExp(),
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
      var length = safari ? Math.min(res.length, 100) : res.length;
      for (var i=0; i < length; i++) {
        var annotations = res[i]['annotations'] || [];
        Emoji.data.push({
          chars: res[i]['chars'],
          keywords: annotations.join(" ").toLowerCase(),
          name: res[i]['name']
        });

        Emoji.names[ res[i]['chars'] ] = res[i]['name'];

        var surrogate = "";
        for (var j=0; j < res[i]['codes'].length; j++) {
          // https://mathiasbynens.be/notes/javascript-encoding
          var C = parseInt(res[i]['codes'][j], 16);
          if (C > 0xFFFF) {
            var H = Math.floor((C - 0x10000) / 0x400) + 0xD800;
            var L = (C - 0x10000) % 0x400 + 0xDC00;
            surrogate += "\\u" + H.toString(16) + "\\u" + L.toString(16);
          }
          else {
            surrogate += "\\u" + C.toString(16);
          }
        }
        codepoints.push(surrogate);
      }
      var sorted = codepoints.sort(function(a, b) {
        if (a.length > b.length)
          return -1;
        else if (a.length == b.length)
          return 0;
        else
          return 1;
      });
      Emoji.regex = new RegExp("(" + sorted.join("|") + ")", "g");

      for (var i=0; i < Emoji.data.length; i++) {
        var li = document.createElement('LI');
        li.setAttribute('data-chars', Emoji.data[i]['chars']);
        li.setAttribute('data-keywords', Emoji.data[i]['keywords'].toLowerCase());
        li.setAttribute('data-name', Emoji.data[i]['name'].toLowerCase());
        li.setAttribute('title', Emoji.data[i]['name']);
        li.textContent = Emoji.data[i]['chars'];

        Emoji.list.appendChild(li);
      }
    });
};

Emoji.load();
