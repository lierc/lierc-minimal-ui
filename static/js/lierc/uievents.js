var UIEvents = function(liercd) {
  var liercd = liercd;
  var events = this;

  var mods = {
    meta: false,
    shift: false,
    ctrl: false,
    cmd: false
  };

  var commands = new Commands(liercd);

  document.addEventListener("keydown", function(e) {
    /* track modifier keys */
    if (e.which == 17) {
      mods['ctrl'] = true;
      return;
    }
    else if (e.which == 18) {
      mods['meta'] = true;
      return;
    }
    else if (e.which == 16) {
      mods['shift'] = true;
      return;
    }
    else if (e.which == 91 || e.which == 93 || e.which == 224 ) {
      mods['cmd'] = true;
      return;
    }
    else if (e.which == 27 && liercd.overlayed) {
      document.querySelectorAll('.overlay').forEach(function(el) {
        el.parentNode.removeChild(el);
      });
      liercd.overlayed = false;
      return;
    }
    else if (liercd.overlayed) {
      return;
    }

    /* task switcher is open, special keys */
    if (liercd.elem.switcher.classList.contains('open')) {
      //escape
      if (e.which == 27) {
        liercd.hide_switcher();
        liercd.focus_input();
        return;
      }
      // down or tab
      else if (e.which == 40 || e.which == 9) {
        e.preventDefault();
        var items = liercd.elem.nav.querySelectorAll('li[data-name].candidate.match');

        for (var i=1; i < items.length; i++) {
          if (items[i - 1].classList.contains("selected")) {
            items[i - 1].classList.remove('selected');
            items[i].classList.add('selected');
            return;
          }
        }
      }
      // up
      else if (e.which == 38) {
        e.preventDefault();
        var items = liercd.elem.nav.querySelectorAll('li[data-name].candidate.match');

        for (var i=0; i < items.length - 1; i++) {
          if (items[i + 1].classList.contains("selected")) {
            items[i + 1].classList.remove('selected');
            items[i].classList.add('selected');
            return;
          }
        }
      }
      // enter
      else if (e.which == 13) {
        var selected = liercd.elem.nav.querySelector('li.selected');
        if (selected) {
          var id = selected.getAttribute('data-panel-id');
          liercd.focus_panel(id);
          liercd.hide_switcher();
        }
      }
    }

    /* enter, send input */
    if (e.which == 13 && !mods['shift']) {
      e.preventDefault();
      send_submit();
      return;
    }
    /* panel up */
    else if (e.which == 38 && mods['meta']) {
      e.preventDefault();
      mods['shift'] ? liercd.prev_unread_panel() : liercd.prev_panel();
      return;
    }
    /* panel down */
    else if (e.which == 40 && mods['meta']) {
      e.preventDefault();
      mods['shift'] ? liercd.next_unread_panel() : liercd.next_panel();
      return;
    }
    /* toggle task switcher */
    else if ((e.which == 75 || e.which == 84) && mods['meta']) {
      e.preventDefault();
      liercd.toggle_switcher();
      return;
    }

    var c = String.fromCharCode(e.which);

    /* jump to panel by number */
    if ((mods['cmd'] || mods['meta']) && c.match(/^[1-9]$/)) {
      var panels = liercd.elem.nav.querySelectorAll('#channels li,#privates li');
      if (panels[c - 1]) {
        liercd.focus_panel(panels[c - 1].getAttribute("data-panel-id"));
        return;
      }
    }

    if (liercd.focused) {
      /* send to keyboard (bold, italic, tab complete) */
      if (liercd.focused.keyboard.focused) {
        liercd.focused.keyboard.keydown(e, mods);
      }
      /* focus input area on a-z 0-9 keys */
      else if (
        e.target.nodeName != "INPUT"
        && e.target.nodeName != "TEXTAREA"
        && ! mods['meta'] && ! mods['ctrl'] && ! mods['cmd']
        && ( c.match(/[a-zA-Z0-9\/]/) || e.which == 191 )
      ) {
        liercd.focus_input();
      }
    }
  });

  liercd.elem.switcher.addEventListener("input", function(e) {
    var val = liercd.elem.switcher.querySelector('input').value;
    var items = liercd.elem.nav.querySelectorAll('li[data-name]');

    val = val.toLowerCase();
    if (val) {
      for (var i=0; i < items.length; i++) {
        var item = items[i];
        var text = item.getAttribute("data-name").toLowerCase();
        if (text.indexOf(val) == -1) {
          item.classList.remove("match");
        }
        else {
          item.classList.add("match");
        }
      }
    }
    else {
      liercd.elem.nav.querySelectorAll('li[data-name]').forEach(function(el) {
        el.classList.add('match');
      });
    }

    for (var i=0; i < items.length; i++) {
      if (items[i].classList.contains("selected")) {
        if (items[i].classList.contains("match"))
          return;
        for (var j=i; j < items.length; j++) {
          if (items[j].classList.contains("match")) {
            items[i].classList.remove("selected");
            items[j].classList.add("selected");
            return;
          }
        }
        for (var k=i; k >= 0; k--) {
          if (items[k].classList.contains("match")) {
            items[i].classList.remove("selected");
            items[k].classList.add("selected");
            return;
          }
        }
      }
    }
  });

  window.addEventListener("blur", function(e) {
    mods['shift'] = false;
    mods['meta'] = false;
    mods['ctrl'] = false;
    mods['cmd'] = false;

    liercd.window_focused = false;
  });

  window.addEventListener("focus", function(e) {
    mods['shift'] = false;
    mods['meta'] = false;
    mods['ctrl'] = false;
    mods['cmd'] = false;

    liercd.window_focused = true;
    liercd.focus_input();
  });

  document.addEventListener("keyup", function(e) {
    if (e.which == 18)
      mods['meta'] = false;
    if (e.which == 16)
      mods['shift'] = false;
    if (e.which == 17)
      mods['ctrl'] = false;
    if (e.which == 91)
      mods['cmd'] = false;
  });

  document.addEventListener('click', function(e) {
    if (e.target.hasAttribute('data-nick')) {
      e.preventDefault();
      var nick = e.target.getAttribute('data-nick');
      var connection = liercd.focused.connection;
      var panel = liercd.add_panel(nick, connection, true);
      liercd.focus_panel(panel.id);
    }
  });

  function join_click(e) {
    e.preventDefault();
    liercd.elem.flex_wrap.classList.remove('open');
    var overlay = document.createElement('DIV');
    overlay.classList.add('overlay');
    var join = document.querySelector('.dialog.join').cloneNode(true);
    overlay.appendChild(join);
    liercd.elem.body.appendChild(overlay);
    liercd.overlayed = true;

    ['touchstart','click'].forEach(function(t) {
      overlay.addEventListener(t, function(e) {
        if (e.target.matches('.overlay, .close')) {
          e.preventDefault();
          overlay.parentNode.removeChild(overlay);
          liercd.overlayed = false;
        }
      });
    });

    var select = overlay.querySelector("select[name=connection]");
    for (connection in liercd.connections) {
      var option = document.createElement('OPTION');
      option.setAttribute('value', connection);
      option.textContent = liercd.connections[connection].host;
      select.appendChild(option);
    }

    overlay.addEventListener('submit', function(e) {
      e.preventDefault();
      var channel = overlay.querySelector('input[name=channel]').value;
      var conn = select.options[select.selectedIndex].value;
      fetch(liercd.baseurl + '/connection/' + conn, {
          'method': "POST",
          'body': "JOIN " + channel,
          'credentials': 'same-origin',
          'headers': {
            'content-type': "application/irc",
            'lierc-token' : liercd.post_token()
          },
        }).then(function(res) {
          overlay.parentNode.removeChild(overlay);
          liercd.overlayed = false;

          if (!res.ok)
            throw Error(res.statusText);
          return res.json();
        }).then(function(res) {
          liercd.post_tokens.push(res.token);
        }).catch(function(e) {
          var res = JSON.parse(e.responseText);
          alert("Error: " + res.error);
          liercd.load_token();
        });
    });
  }

  document.querySelectorAll('.join-channel').forEach(function(el) {
    el.addEventListener('click', join_click);
  });

  document.querySelector('.add-connection')
    .addEventListener('click', liercd.config_modal);

  document.querySelectorAll('#nav .nav-title')
    .forEach(function(el) {
      el.addEventListener('click', function(e) {
        if (
          e.target.classList.contains('nav-title')
          || e.target.classList.contains('nav-title-text')
          || e.target.classList.contains('count')
        ) {
          e.preventDefault();
          el.classList.toggle('collapsed');
        }
      });
    });

  $('#toggle-hideevents a').on('click touchstart', function(e) {
    e.preventDefault();
    liercd.focused.set_ignore_events(!liercd.focused.ignore_events);
    liercd.update_pref(liercd.focused.id + "-ignore-events", liercd.focused.ignore_events);
  });

  $('#toggle-hideembeds a').on('click touchstart', function(e) {
    e.preventDefault();
    liercd.focused.set_collapse_embeds(!liercd.focused.collapse_embeds);
    liercd.update_pref(liercd.focused.id + "-collapse-embeds", liercd.focused.collapse_embeds);
  });

  $('#toggle-nicks').on('click touchstart', function(e) {
    e.preventDefault();
    liercd.focused.set_show_nicklist(!liercd.focused.show_nicklist);
    liercd.update_pref(liercd.focused.id + "-show-nicklist", liercd.focused.show_nicklist);
  });

  liercd.elem.emoji.addEventListener('click', function(e) {
    e.preventDefault();

    if (e.target.matches('li[data-chars]')) {
      liercd.focus_input(true);
      document.execCommand("insertText", false, e.target.getAttribute('data-chars'));

      liercd.elem.emoji.classList.remove("open");
      $('.emoji-search input').val('');
      Emoji.filter(liercd.elem.emoji, '');
    }
    if (e.target.matches('#emoji')) {
      e.target.classList.toggle('open');
      if (!liercd.mobile) {
        if (e.target.classList.contains('open')) {
          $('.emoji-search input').val('');
          Emoji.filter(liercd.elem.emoji, '');
          $('.emoji-search input').focus();
        }
      }
    }
  });

  function send_submit() {
    var input = liercd.elem.input.querySelector(".input");
    var value = Unformat(input.innerHTML);
    if (value == "") return;
    input.innerHTML = "";

    var panel = liercd.panels[input.getAttribute('data-panel-id')];
    var connection = liercd.connections[panel.connection];
    var send = [];

    if (value.substring(0,1) == "/") {
      try {
         send.push(commands.handle_command(panel, value.substring(1)));
      }
      catch (e) {
        alert(e);
        return;
      }
    }
    else if (panel.type == "status") {
      throw "Can not message a status";
    }
    else {
      var lines = value.split(/[\r\n]/);

      for (var j=0; j < lines.length; j++) {
        var value = lines[j];
        if (!value)
          continue;

        var privmsg = "PRIVMSG " + panel.name + " :";
        if (value.length + privmsg.length < 510) {
          send.push(privmsg + value);
        }
        else {
          var words = value.split(" ");
          var len = privmsg.length;
          var buf = [];

          for (var i=0; i < words.length; i++) {
            var word = words[i];
            if (len + word.length > 510) {
              send.push(privmsg + buf.join(" "));
              len = privmsg.length + word.length;
              buf = [word];
            }
            else {
              buf.push(word);
              len += word.length + 1;
            }
          }
          if (buf.length) {
            send.push(privmsg + buf.join(" "));
          }
        }
      }
    }

    function sendlines(lines) {
      if (!lines.length) return;
      fetch(liercd.baseurl + "/connection/" + panel.connection, {
          credentials: 'same-origin',
          method: "POST",
          headers:{
            'content-type': 'application/irc',
            'lierc-token' : liercd.post_token()
          },
          body: lines.shift(),
        }).then(function(res) {
          if (!res.ok)
            throw Error(res.statusText);
          return res.json();
        }).then(function(res) {
          liercd.post_tokens.push(res.token);
          if (lines.length)
            sendlines(lines);
        }).catch(function(e) {;
          alert("Error: " + e);
          liercd.load_token();
        });
    }

    sendlines(send);
  }

  document.getElementById('gist-upload-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var form = e.target;
    var submit = form.querySelector('input[name=upload]');
    var text = form.querySelector('textarea');
    var ext = form.querySelector('select');
    var filename = 'files1.' + ext.options[ext.selectedIndex].value;

    submit.setAttribute('disabled','disabled');
    text.setAttribute('disabled','disabled');

    var data = {
      'public': false,
      'files': {}
    };

    data['files'][filename] = { 'content': text.value };

    fetch("https://api.github.com/gists", {
        'method': 'POST',
        'body': JSON.stringify(data)
      }).then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).then(function(res) {
        submit.removeAttribute('disabled');
        text.removeAttribute('disabled');
        text.value = '';
        liercd.focus_input(true);
        document.execCommand("insertText", false, res.html_url);
        document.getElementById('upload').classList.remove('open');
      }).catch(function(e) {
        alert("I'm sorry");
        submit.removeAttribute('disabled');
        text.removeAttribute('disabled');
      });
  });

  document.getElementById('image-upload-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var submit = e.target.querySelector('input[name="upload"]');
    var image = e.target.querySelector('input[name="image"]');
    var files = image.files;

    if (files.length == 0 || !files[0].type.match(/^image/)) {
      alert("Must select an image file");
      return;
    }

    var fd = new FormData();
    fd.append("image", files[0]);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "//api.imgur.com/3/image");
    xhr.setRequestHeader('Authorization', 'Client-ID 033f98700d8577c');

    submit.setAttribute('disabled','disabled');

    xhr.addEventListener("load", function() {
      var res = JSON.parse(xhr.responseText);
      liercd.focus_input(true);
      document.execCommand("insertText", false, res.data.link);
      document.getElementById('upload').classList.remove('open');
      image.value = null;
      submit.removeAttribute('disabled');
    });

    xhr.send(fd);
  });

  ['touchstart', 'click'].forEach(function(type) {
    document.getElementById('upload').addEventListener(type, function(e) {
      if (e.target.matches('#upload')) {
        e.preventDefault();
        e.target.classList.toggle("open");
      }
    });
  });

  ['click', 'touchstart'].forEach(function(type) {
    document.getElementById("help").addEventListener(type, function(e) {
      e.preventDefault();
      liercd.elem.flex_wrap.classList.remove('open');

      var overlay = document.createElement('DIV');
      overlay.classList.add('overlay');

      var help = document.querySelector('.help').cloneNode(true);
      overlay.appendChild(help);

      liercd.elem.body.appendChild(overlay);
      liercd.overlayed = true;

      ['click', 'touchstart'].forEach(function(type) {
        overlay.addEventListener(type, function(e) {
          if (!e.target.matches(".overlay, .close"))
            return;
          e.preventDefault();
          overlay.parentNode.removeChild(overlay);
          liercd.overlayed = false;
        });
      });
    });
  });

  ['click', 'touchstart'].forEach(function(type) {
    document.getElementById('logout').addEventListener(type, function(e) {
      e.preventDefault();

      if (!confirm("Are you sure you want to log out?"))
        return;

      fetch(liercd.baseurl + "/logout", {
        'method': 'POST',
        'credentials': 'same-origin',
      }).then(function(res) {
        if (!res.ok)
          alert('Error!');
        else
          window.location.reload();
      });
    });
  });

  window.addEventListener('resize', function(e) {
    if (liercd.focused) {
      liercd.focused.scroll();
      liercd.focused.resize_filler();
    }
  });

  document.addEventListener('copy', function(e) {
    if ( $('.dialog:visible').length)
      return;

    e.preventDefault();

    var selected = window.getSelection().toString().split("\n");
    var lines = [];

    var nick;

    for (i in selected) {
      var line = selected[i].trim();

      if (line.match(/^\d\d:\d\d$/))
        continue;

      if (! nick && line.match(/^< [^>]+>$/)) {
        nick = line;
        continue;
      }

      if (nick) {
        lines.push(nick + " " + line);
        nick = null;
        continue;
      }

      if (line.match(/\S/))
        lines.push(line);
    }

    e.clipboardData.setData('Text', lines.join("\n"));
  });

  document.addEventListener('paste', function(e) {
    if ( $('.dialog:visible').length)
      return;
    if ( $('#gist-upload-input:focus').length )
      return;

    e.preventDefault();

    var clipboard = (e.clipboardData || e.originalEvent.clipboardData);
    var items = clipboard.items;
    for (i in items) {
      if (items[i].type && items[i].type.match(/^image\//)) {
        liercd.focus_input();
        var blob = items[i].getAsFile();
        var fd = new FormData();
        fd.append("image", blob);
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "//api.imgur.com/3/image");
        xhr.setRequestHeader('Authorization', 'Client-ID 033f98700d8577c');
        xhr.onload = function() {
          var res = JSON.parse(xhr.responseText);
          liercd.focus_input(true);
          document.execCommand("insertText", false, res.data.link);
        };
        xhr.send(fd);
        return;
      }
    }

    liercd.focus_input();
    var text = clipboard.getData("Text");
    document.execCommand("insertText", false, text);
  });

  ['touchstart', 'click'].forEach(function(type) {
    document.querySelector('.flex-wrap-left header')
      .addEventListener(type, function(e) {
        e.preventDefault();
        liercd.elem.flex_wrap.classList.toggle('open');
      });
  });

  document.addEventListener('input', function(e) {
    if (e.target.matches('.emoji-search input')) {
      var list = e.target.parentNode.previousSibling;
      Emoji.filter(list, e.target.value);
    }
  });

  document.getElementById('email-notify').addEventListener('click', function(e) {
      e.preventDefault();
      this.classList.toggle('enabled');
      var enabled = e.target.classList.contains('enabled');
      liercd.update_pref("email", enabled);
  });

  $('#panel').on('click', '.message-menu', function(e) {
    var toggle = $(this);
    var target = $(e.target);
    var controls  = toggle.parent('.message-controls');
    var message = toggle.parents('li.message');
    var is_monospace = message.hasClass('monospace');
    toggle.toggleClass('open');

    if (target.is('.message-menu')) {
      if (toggle.hasClass('open')) {
        var popup = $('<div/>', {'class':'message-menu-popup'});
        var list = $('<ul/>');
        var privmsg = $('<li/>', {'class':'message-privmsg'})
        .text('Direct message');
        var mono = $('<li/>', {'class':'message-monospace'})
        .text('Monospace text ');
        mono.append(is_monospace ? "off" : "on");
        list.append(privmsg, mono);
        controls.addClass('open');
        popup.append(list);
        toggle.append(popup);
      }
      else {
        controls.removeClass('open');
        toggle.html('');
      }
    }
    else if (target.is('.message-privmsg')) {
      controls.removeClass('open');
      toggle.html('');
      var nick = message.find('.message-nick');
      nick.trigger('click');
    }
    else if (target.is('.message-monospace')) {
      controls.removeClass('open');
      toggle.html('');
      var nick = message.find('.message-nick').attr('data-nick');
      if (is_monospace) {
        liercd.remove_monospace_nick(liercd.focused, nick);
      }
      else {
        liercd.add_monospace_nick(liercd.focused, nick);
      }
    }
  });

  liercd.elem.panel.addEventListener('click', function(e) {
    if (!e.target.matches('.embed-toggle'))
      return;

    e.preventDefault();
    var toggle = e.target;
    var embed = JSON.parse(toggle.getAttribute('data-embed'));

    toggle.classList.toggle('hidden');
    if (toggle.classList.contains('hidden')) {
      var wrap = document.querySelector(".embed-wrap[data-embed-id='"+embed.id+"']");
      wrap.parentNode.parentNode.removeChild(wrap.parentNode);
    }
    else {
      var a = toggle.previousSibling;
      liercd.focused.embed(a, embed, true);
    }
  });

  liercd.elem.topic.addEventListener('click', function(e) {
    if (liercd.focused) {
      if (e.target.nodeName != 'A') {
        var elem = this;
        liercd.focused.scroll(function() {
          elem.classList.toggle('expanded');
        });
      }
    }
  });

  liercd.elem.panel.addEventListener('click', function(e) {
    if (!e.target.matches('.embed-wrap[data-embed-id]:not(.open) *'))
      return;

    var p = e.target;
    while (p && !p.matches('.embed-wrap[data-embed-id]')) {
      p = p.parentNode;
    }
    var id = p.getAttribute('data-embed-id');
    var a = document.querySelector(".embed-toggle[data-embed-id='" + id + "']");
    var embed = JSON.parse(a.getAttribute('data-embed'));
    p.classList.add('open');
    p.innerHTML = embed.html;

    var head = document.querySelector('head');
    p.querySelectorAll('script').forEach(function(el) {
      var s = el.parentNode.removeChild(el);
      var script = document.createElement('SCRIPT');
      var attrs = s.attributes;
      for (var i=0; i < attrs.length; i ++) {
        script.setAttribute(attrs[i].name, attrs[i].value);
      }
      head.appendChild(script);
    });
  });

  $('#panel').on('click', '.message-react', function(e) {
    var react = $(this);
    var target = $(e.target);
    var controls = react.parent('.message-controls');

    if (target.is('.message-react')) {
      react.toggleClass('open');
      if (react.hasClass('open')) {
        var emoji = $('#emoji .emoji-popup').clone(true);
        react.append(emoji);
        emoji.find('.emoji-search input').focus();
        controls.addClass('open');
      }
      else {
        react.find('.emoji-popup').remove();
        controls.removeClass('open');
      }
    }
    if (target.is('li[data-chars]')) {
      var emoji = target.attr('data-chars');
      var hash = react.parents('li.message').attr('data-message-hash');
      var panel = liercd.focused;

      react.removeClass('open');
      controls.removeClass('open');
      react.find('.emoji-popup').remove();

      if (! (emoji && hash && panel))
        return;

      fetch(liercd.baseurl + "/connection/" + panel.connection, {
          'method': "POST",
          'credentials': 'same-origin',
          'content-type': "application/irc",
          'body': "PRIVMSG " + panel.name + " :\x01" + ["FACE", hash, emoji].join(" "),
          'headers': {
            'lierc-token' : liercd.post_token()
          }
        }).then(function(res) {
          if (!res.ok)
            throw Error(res.statusText);
          return res.json();
        }).then(function(res) {
          liercd.post_tokens.push(res.token);
        }).catch(function(e) {
          var res = JSON.parse(e.responseText);
          alert("Error: " + res.error);
          liercd.load_token();
        });
    }
  });

  window.addEventListener("beforeunload", function() {
    if (liercd.focused) {
      liercd.focused.update_seen();
      liercd.save_seen(liercd.focused, true);
    }
  });

  liercd.elem.panel.addEventListener('transitionend', function(e) {
    if (e.target.matches('li.chat'))
      e.target.classList.remove('loading', 'loaded');
  });
}
