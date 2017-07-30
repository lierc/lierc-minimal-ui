var UIEvents = function(app) {
  var app = app;
  var events = this;
  var max_userhost_len = 63 + 10 + 1;
  var lang = window.navigator.language;

  function clickTouchEvent(el, f) {
    ['click', 'touch'].forEach(function(type) {
      el.addEventListener(type, f);
    });
  }

  document.addEventListener("keydown", function(e) {
    var mods = {
      meta: e.altKey,
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      cmd: e.metaKey
    };

    if (e.which == 27 && app.overlayed()) {
      app.close_dialog();
      return;
    }
    else if (app.overlayed()) {
      return;
    }
    else if (e.which == 27) {
      var open = document.querySelectorAll('.popup-toggle.open');
      open.forEach(function(el) { el.classList.remove('open'); });
    }

    /* task switcher is open, special keys */
    if (app.elem.switcher.classList.contains('open')) {
      //escape
      if (e.which == 27) {
        app.hide_switcher();
        app.focus_input();
        return;
      }
      // down or tab
      else if (e.which == 40 || e.which == 9) {
        e.preventDefault();
        var items = app.elem.nav.querySelectorAll('li[data-name].candidate.match');

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
        var items = app.elem.nav.querySelectorAll('li[data-name].candidate.match');

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
        var selected = app.elem.nav.querySelector('li.selected');
        if (selected) {
          e.preventDefault();
          var id = selected.getAttribute('data-panel-id');
          app.focus_panel(id);
          app.hide_switcher();
          return;
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
      mods['shift'] ? app.prev_unread_panel() : app.prev_panel();
      return;
    }
    /* panel down */
    else if (e.which == 40 && mods['meta']) {
      e.preventDefault();
      mods['shift'] ? app.next_unread_panel() : app.next_panel();
      return;
    }
    /* toggle task switcher */
    else if ((e.which == 75 || e.which == 84) && mods['meta']) {
      e.preventDefault();
      app.toggle_switcher();
      return;
    }

    var c = String.fromCharCode(e.which);

    /* jump to panel by number */
    if ((mods['cmd'] || (!mods['ctrl'] && mods['meta'])) && c.match(/^[1-9]$/)) {
      var panels = app.elem.nav.querySelectorAll('#channels li,#privates li');
      if (panels[c - 1]) {
        app.focus_panel(panels[c - 1].getAttribute("data-panel-id"));
        return;
      }
    }

    if (app.focused) {
      /* send to editor (bold, italic, tab complete) */
      if (app.focused.editor.focused) {
        app.focused.editor.keydown(e, mods);
      }
      /* focus input area on a-z 0-9 keys */
      else if (
        e.target.nodeName != "INPUT"
        && e.target.nodeName != "TEXTAREA"
        && ! mods['meta'] && ! mods['ctrl'] && ! mods['cmd']
        && ( c.match(/[a-zA-Z0-9\/]/) || e.which == 191 )
      ) {
        app.focus_input();
      }
    }
  });

  app.elem.switcher.addEventListener("input", function(e) {
    var val = app.elem.switcher.querySelector('input').value;
    var items = app.elem.nav.querySelectorAll('li[data-name]');

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
      app.elem.nav.querySelectorAll('li[data-name]').forEach(function(el) {
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
    app.window_focused = false;
  });

  window.addEventListener("focus", function(e) {
    app.window_focused = true;
    app.focus_input();
  });

  document.addEventListener('click', function(e) {
    if (e.target.hasAttribute('data-nick')) {
      e.preventDefault();
      var nick = e.target.getAttribute('data-nick');
      var connection = app.focused.connection;
      app.add_panel(nick, connection, true);
    }
    document.querySelectorAll('.popup-toggle.open').forEach(function(el) {
      if (!el.contains(e.target)) {
        el.classList.remove('open');
      }
    });
  });

  function join_click(e) {
    e.preventDefault();
    app.elem.flex_wrap.classList.remove('open');
    var dialog = app.new_dialog("join", {
      connections: Object.values(app.connections)
    });

    dialog.el.addEventListener('submit', function(e) {
      e.preventDefault();
      var channel = dialog.el.querySelector('input[name=channel]').value;
      var select = dialog.el.querySelector('select');
      var conn = select.options[select.selectedIndex].value;
      app.api.post('/connection/' + conn, {
        body: "JOIN " + channel,
        headers: {
          'content-type': "application/irc",
          'lierc-token' : app.post_token()
        },
        success: function(res) {
          app.post_tokens.push(res.token);
          app.close_dialog();
        },
        error: function(e) {
          app.close_dialog();
          var res = JSON.parse(e.responseText);
          alert("Error: " + res.error);
          app.load_token();
        }
      });
    });
  }

  document.querySelectorAll('.join-channel').forEach(function(el) {
    el.addEventListener('click', join_click);
  });

  document.querySelectorAll('.add-connection').forEach(function(el) {
    el.addEventListener('click', app.config_modal);
  });

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

  clickTouchEvent(document.querySelector('#toggle-hideevents a'), function(e) {
    e.preventDefault();
    app.focused.set_ignore_events(!app.focused.ignore_events);
    app.update_pref(app.focused.id + "-ignore-events", app.focused.ignore_events);
  });

  clickTouchEvent(document.querySelector('#toggle-hideembeds a'), function(e) {
    e.preventDefault();
    app.focused.set_collapse_embeds(!app.focused.collapse_embeds);
    app.update_pref(app.focused.id + "-collapse-embeds", app.focused.collapse_embeds);
  });

  clickTouchEvent(document.querySelector('#toggle-nicks'), function(e) {
    e.preventDefault();
    app.focused.set_show_nicklist(!app.focused.show_nicklist);
    app.update_pref(app.focused.id + "-show-nicklist", app.focused.show_nicklist);
  });

  app.elem.emoji.addEventListener('click', function(e) {
    e.preventDefault();
    var emoji_search = document.querySelector('.emoji-search input');

    if (e.target.matches('li[data-chars]')) {
      app.focus_input(true);
      document.execCommand("insertText", false, e.target.getAttribute('data-chars'));

      app.elem.emoji.classList.remove("open");
      emoji_search.value = '';
      Emoji.filter(app.elem.emoji, '');
    }
    if (e.target.matches('#emoji')) {
      e.target.classList.toggle('open');
      if (!app.mobile) {
        if (e.target.classList.contains('open')) {
          emoji_search.value = '';
          Emoji.filter(app.elem.emoji, '');
          emoji_search.focus();
        }
      }
    }
  });

  function send_submit() {
    var input = app.elem.input.querySelector(".input");
    var panel = app.panels[input.getAttribute('data-panel-id')];
    var text = input.textContent.trim();
    if (text == "") return;

    panel.editor.history.record();

    var value = Unformat(input.innerHTML);
    input.innerHTML = "";
    panel.editor.save_selection();
    value = value.replace("\u200b", ""); // ew
    text = text.replace("\u200b", ""); // ew

    var connection = app.connections[panel.connection];
    var send = [];

    if (text.substring(0,1) == "/") {
      try {
         send.push(app.commands.handle(panel, text.substring(1)));
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

        // https://github.com/irssi/irssi/blob/fcd3ec467ff0e5943f34bb3a906bbe07ba6963ff/src/irc/core/irc-servers.c#L207
        var privmsg = "PRIVMSG " + panel.name + " :";
        var max = 510 - "!: PRIVMSG :".length - panel.name.length - connection.nick.length - max_userhost_len;
        if (value.length < max) {
          send.push(privmsg + value);
        }
        else {
          var words = value.split(/(\b)/);
          var len = 0;
          var buf = [];

          if (words.length > max * 20) {
            alert("This is too much text!");
            return;
          }

          for (var i=0; i < words.length; i++) {
            var word = words[i];
            if (len + word.length > max) {
              send.push(privmsg + buf.join(""));
              len = word.length;
              buf = [word];
            }
            else {
              buf.push(word);
              len += word.length;
            }
          }
          if (buf.length) {
            send.push(privmsg + buf.join(""));
          }
        }
      }
    }

    function sendlines(lines) {
      if (!lines.length) return;
      app.api.post("/connection/" + panel.connection, {
        headers:{
          'content-type': 'application/irc',
          'lierc-token' : app.post_token()
        },
        body: lines.shift(),
        success: function(res) {
          app.post_tokens.push(res.token);
          if (lines.length)
            sendlines(lines);
        },
        error: function(e) {;
          alert("Error: " + e);
          app.load_token();
        }
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
        app.focus_input(true);
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
      app.focus_input(true);
      document.execCommand("insertText", false, res.data.link);
      document.getElementById('upload').classList.remove('open');
      image.value = null;
      submit.removeAttribute('disabled');
    });

    xhr.send(fd);
  });

  clickTouchEvent(document.getElementById('upload'), function(e) {
    if (e.target.matches('#upload')) {
      e.preventDefault();
      e.target.classList.toggle("open");
    }
  });

  clickTouchEvent(document.getElementById("help"), function(e) {
    e.preventDefault();
    app.new_dialog("help");
  });

  clickTouchEvent(document.getElementById('logout'), function(e) {
    e.preventDefault();

    if (!confirm("Are you sure you want to log out?"))
      return;

    app.api.logout();
  });

  window.addEventListener('resize', function(e) {
    if (app.focused) {
      app.focused.scroll_bottom(0);
      app.focused.resize_filler();
    }
  });

  document.addEventListener('copy', function(e) {
    if ( app.overlayed() )
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
    if (app.overlayed())
      return;
    if (document.activeElement.matches('#gist-upload-input'))
      return;

    e.preventDefault();

    var clipboard = (e.clipboardData || e.originalEvent.clipboardData);
    var items = clipboard.items;
    for (i in items) {
      if (items[i].type && items[i].type.match(/^image\//)) {
        app.focus_input();
        var blob = items[i].getAsFile();
        var fd = new FormData();
        fd.append("image", blob);
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "//api.imgur.com/3/image");
        xhr.setRequestHeader('Authorization', 'Client-ID 033f98700d8577c');
        xhr.onload = function() {
          var res = JSON.parse(xhr.responseText);
          app.focus_input(true);
          document.execCommand("insertText", false, res.data.link);
        };
        xhr.send(fd);
        return;
      }
    }

    app.focus_input();
    var lines = clipboard.getData("Text").trim().split(/[\r\n]/);
    var text = lines.map(function(line) { return line.trim(); })
      .filter(function(line) { return line.match(/\S/); })
      .join("\n");
    document.execCommand("insertText", false, text);
  });

  clickTouchEvent(document.querySelector('.flex-wrap-left header'), function(e) {
    e.preventDefault();
    app.elem.flex_wrap.classList.toggle('open');
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
      app.update_pref("email", enabled);
  });

  app.elem.panel.addEventListener('click', function(e) {
    if (!e.target.matches('.message-menu, .message-menu *'))
      return;

    var target = e.target;
    var toggle = target;
    var controls = target;
    var message = target;

    while (toggle && !toggle.matches('.message-menu')) {
      toggle = toggle.parentNode;
    }

    while (controls && !controls.matches('.message-controls')) {
      controls = controls.parentNode;
    }

    while (message && !message.matches('li.message')) {
      message = message.parentNode;
    }

    var is_monospace = message.classList.contains('monospace');
    toggle.classList.toggle('open');

    if (target.matches('.message-menu')) {
      if (toggle.classList.contains('open')) {
        var has_child = toggle.querySelector('.message-menu-popup');
        if (!has_child) {
          var html = Template('message_menu', {
            is_monospace: is_monospace
          });
          toggle.insertAdjacentHTML('beforeend', html);
        }
        controls.classList.add('open');
      }
      else {
        controls.classList.remove('open');
      }
    }
    else if (target.matches('.message-privmsg')) {
      controls.classList.remove('open');
      message.querySelector('.message-nick').click();
    }
    else if (target.matches('.message-monospace')) {
      controls.classList.remove('open');
      var nick = message.querySelector('.message-nick').getAttribute('data-nick');
      if (is_monospace) {
        app.remove_monospace_nick(app.focused, nick);
      }
      else {
        app.add_monospace_nick(app.focused, nick);
      }
    }
  });

  app.elem.panel.addEventListener('click', function(e) {
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
      app.focused.scroll(function() {
        var a = toggle.previousSibling;
        app.focused.embed(a, embed, true);
      });
    }
  });

  app.elem.topic.addEventListener('click', function(e) {
    if (app.focused) {
      if (e.target.nodeName != 'A') {
        var elem = this;
        app.focused.scroll(function() {
          elem.classList.toggle('expanded');
        });
      }
    }
  });

  app.elem.panel.addEventListener('click', function(e) {
    if (!e.target.matches(
      '.embed-wrap[data-embed-id]:not(.open),' +
      '.embed-wrap[data-embed-id]:not(.open) *'
    ))
      return;

    var p = e.target;
    while (p && !p.matches('.embed-wrap[data-embed-id]')) {
      p = p.parentNode;
    }
    var id = p.getAttribute('data-embed-id');
    var a = document.querySelector(".embed-toggle[data-embed-id='" + id + "']");
    var embed = JSON.parse(a.getAttribute('data-embed'));

    app.focused.scroll(function() {
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

    var h = p.clientHeight;
    var panel = app.focused;

    var m = new MutationObserver(function(s) {
      var u = p.clientHeight;
      if (!panel.is_scrolled())
        panel.scroller.scrollTop += u - h;
      h = u;
    });

    var c = {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['class','style']
    };
    m.observe(p, c);

    setTimeout(function(){ m.disconnect(); }, 10000);
  });

  app.elem.panel.addEventListener('click', function(e) {
    if (!e.target.matches('.message-react, .message-react *'))
      return;

    var target = e.target;
    var react = target;
    var controls = target;

    while (react && !react.matches('.message-react')) {
      react = react.parentNode;
    }

    while (controls && !controls.matches('.message-controls')) {
      controls = controls.parentNode;
    }

    if (target.matches('.message-react')) {
      react.classList.toggle('open');
      if (react.classList.contains('open')) {
        var emoji = document.querySelector('#emoji .emoji-popup').cloneNode(true);
        react.appendChild(emoji);
        emoji.querySelector('.emoji-search input').focus();
        controls.classList.add('open');
      }
      else {
        var popup = react.querySelector('.emoji-popup');
        popup.parentNode.removeChild(popup);
        controls.classList.remove('open');
      }
    }
    if (target.matches('li[data-chars]')) {
      var emoji = target.getAttribute('data-chars');
      var message = react;
      while (message && !message.matches("li.message")) {
        message = message.parentNode;
      }
      var hash = message.getAttribute('data-message-hash');
      var panel = app.focused;

      react.classList.remove('open');
      controls.classList.remove('open');
      var popup = react.querySelector('.emoji-popup');
      popup.parentNode.removeChild(popup);

      if (! (emoji && hash && panel))
        return;

      app.api.post("/connection/" + panel.connection, {
        body: "PRIVMSG " + panel.name + " :\x01" + ["FACE", hash, emoji].join(" "),
        headers: {
          'lierc-token' : app.post_token(),
          'content-type': "application/irc",
        },
        success: function(res) {
          app.post_tokens.push(res.token);
        },
        error: function(e) {
          var res = JSON.parse(e.responseText);
          alert("Error: " + res.error);
          app.load_token();
        }
      });
    }
  });

  window.addEventListener("beforeunload", function() {
    if (app.focused) {
      app.focused.update_seen();
      app.save_seen(app.focused, true);
    }
  });

  app.elem.panel.addEventListener('transitionend', function(e) {
    if (e.target.matches('li.chat'))
      e.target.classList.remove('loading', 'loaded');
  });

  document.onselectionchange = function(e) {
    if (app.focused && app.focused.editor.focused) {
      app.focused.editor.save_selection();
    }
  };
}
