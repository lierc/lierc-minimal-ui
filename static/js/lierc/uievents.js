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
      $('.overlay').remove();
      liercd.overlayed = false;
      return;
    }
    else if (liercd.overlayed) {
      return;
    }

    /* task switcher is open, special keys */
    if (liercd.elem.switcher.hasClass('open')) {
      if (e.which == 27) {
        liercd.hide_switcher();
        liercd.focus_input();
        return;
      }
      else if (e.which == 40 || e.which == 9) {
        e.preventDefault();
        var items = liercd.elem.nav.find('li[data-name]:visible');

        for (var i=1; i < items.length; i++) {
          if (items[i - 1].classList.contains("selected")) {
            items[i - 1].classList.remove('selected');
            items[i].classList.add('selected');
            return;
          }
        }
      }
      else if (e.which == 38) {
        e.preventDefault();
        var items = liercd.elem.nav.find('li[data-name]:visible');

        for (var i=0; i < items.length - 1; i++) {
          if (items[i + 1].classList.contains("selected")) {
            items[i + 1].classList.remove('selected');
            items[i].classList.add('selected');
            return;
          }
        }
      }
      else if (e.which == 13) {
        var selected = liercd.elem.nav.find('li.selected');
        if (selected.length) {
          var id = selected.attr('data-panel-id');
          liercd.focus_panel(id);
          liercd.hide_switcher();
        }
      }
    }

    /* enter, send input */
    if (e.which == 13 && !mods['shift']) {
      e.preventDefault();
      liercd.elem.input.submit();
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
      var panels = liercd.elem.nav.find('#channels li,#privates li');
      if (panels[c - 1]) {
        liercd.focus_panel($(panels[c - 1]).attr("data-panel-id"));
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

  liercd.elem.switcher.on("input", function(e) {
    var val = liercd.elem.switcher.find('input').val();
    var items = liercd.elem.nav.find('li[data-name]');

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
      liercd.elem.nav.find('li[data-name]').addClass('match');
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

  $(document).on('click', '[data-nick]', function(e) {
    e.preventDefault();
    var nick = $(this).attr('data-nick');
    var connection = liercd.focused.connection;
    var panel = liercd.add_panel(nick, connection, true);
    liercd.focus_panel(panel.id);
  });

  $('.join-channel').on('click', function(e) {
    e.preventDefault();
    $('.flex-wrap').removeClass('open');
    var overlay = $('<div/>', {'class':'overlay'});
    overlay.append($('.dialog.join').clone());
    $('body').append(overlay);
    liercd.overlayed = true;

    overlay.on('touchstart click', '.overlay, .close', function(e) {
      e.preventDefault();
      overlay.remove();
      liercd.overlayed = false;
    });

    var select = overlay.find("select[name=connection]");
    for (connection in liercd.connections) {
      var option = $('<option/>', {
        value: connection
      }).text(liercd.connections[connection].config.Host);
      select.append(option);
    }

    overlay.on('submit', function(e) {
      e.preventDefault();
      var channel = $(this).find('input[name=channel]').val();
      var conn = $(this).find('select[name=connection]').val();
      fetch(liercd.baseurl + '/connection/' + conn, {
          'method': "POST",
          'body': "JOIN " + channel,
          'credentials': 'same-origin',
          'headers': {
            'content-type': "application/irc",
            'lierc-token' : liercd.post_token()
          },
        }).then(function(res) {
          overlay.remove();
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
  });

  $('.add-connection').on('click', liercd.config_modal);

  $('#nav .nav-title').on('click', function(e) { 
    if ($(e.target).is('.nav-title,.nav-title-text,.count')) {
      e.preventDefault();
      this.classList.toggle('collapsed');
    }
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

  liercd.elem.emoji.on('click', function(e) {
    e.preventDefault();
    var target = $(e.target);

    if (target.is('li[data-chars]')) {
      liercd.focus_input(true);
      document.execCommand("insertText", false, target.attr('data-chars'));

      liercd.elem.emoji.removeClass("open");
      $('.emoji-search input').val('');
      Emoji.filter(liercd.elem.emoji, '');
    }
    if (target.is('#emoji')) {
      target.toggleClass('open');
      if (!liercd.mobile) {
        if (target.hasClass('open')) {
          $('.emoji-search input').val('');
          Emoji.filter(liercd.elem.emoji, '');
          $('.emoji-search input').focus();
        }
      }
    }
  });

  liercd.elem.input.on("submit", function(e) {
    e.preventDefault();
    var input = $(e.target).find(".input");
    var value = Unformat(input.get(0).innerHTML);
    if (value == "") return;
    input.get(0).innerHTML = "";

    var panel = liercd.panels[input.attr('data-panel-id')];
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
  });

  $('#gist-upload-form').on('submit', function(e) {
    e.preventDefault();
    var form = $(this);
    var submit = form.find('input[name=upload]');
    var text = form.find('textarea');
    var ext = form.find('select');
    var filename = 'files1.' + ext.val();

    submit.attr('disabled','disabled');
    text.attr('disabled','disabled');

    var data = {
      'public': false,
      'files': {}
    };

    data['files'][filename] = { 'content': text.val() };

    fetch("https://api.github.com/gists", {
        'method': 'POST',
        'body': JSON.stringify(data)
      }).then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).then(function(res) {
        submit.get(0).removeAttribute('disabled');
        text.get(0).removeAttribute('disabled');
        text.val('');
        liercd.focus_input(true);
        document.execCommand("insertText", false, res.html_url);
        $('#upload').removeClass('open');
      }).catch(function(e) {
        alert("I'm sorry");
        submit.get(0).removeAttribute('disabled');
        text.get(0).removeAttribute('disabled');
      });
  });

  $('#image-upload-form').on('submit', function(e) {
    e.preventDefault();
    var form = $(this);
    var submit = form.find('input[name=upload]');
    var image = form.find('input[name=image]');
    var files = image.get(0).files;

    if (files.length == 0 || !files[0].type.match(/^image/)) {
      alert("Must select an image file");
      return;
    }

    var fd = new FormData();
    fd.append("image", files[0]);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "//api.imgur.com/3/image");
    xhr.setRequestHeader('Authorization', 'Client-ID 033f98700d8577c');

    submit.attr('disabled','disabled');

    xhr.addEventListener("load", function() {
      var res = JSON.parse(xhr.responseText);
      liercd.focus_input(true);
      document.execCommand("insertText", false, res.data.link);
      $('#upload').removeClass('open');
      image.val(null);
      submit.get(0).removeAttribute('disabled');
    });

    xhr.send(fd);
  });

  $('#upload').on('click touchstart', function(e) {
    if ($(e.target).is('#upload')) {
      e.preventDefault();
      this.classList.toggle("open");
    }
  });

  $('#help').on('click touchstart', function(e) {
    e.preventDefault();
    $('.flex-wrap').removeClass('open');
    var overlay = $('<div/>', {'class':'overlay'});
    overlay.append($('.help').clone());
    $('body').append(overlay);
    liercd.overlayed = true;

    overlay.on('touchstart click', '.overlay, .close', function(e) {
      e.preventDefault();
      overlay.remove();
      liercd.overlayed = false;
    });
  });

  $('#logout').on('click touchstart', function(e) {
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

  $(window).on('resize', function(e) {
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

  $('.flex-wrap-left header').on('touchstart click', function(e) {
    e.preventDefault();
    $('.flex-wrap').toggleClass("open");
  });

  $(document).on('input', '.emoji-search input', function(e) {
    var list = $(e.target).parents('.emoji-popup').find('ul');
    Emoji.filter(list, $(e.target).val());
  });

  $('#email-notify').on('click', function(e) {
      e.preventDefault();
      this.classList.toggle('enabled');
      var enabled = this.classList.contains('enabled');
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

  $('#panel').on('click', '.embed-toggle', function(e) {
    e.preventDefault();
    var toggle = this;
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

  $('#topic').on('click', function(e) {
    if (liercd.focused) {
      if (e.target.nodeName != 'A') {
        var elem = this;
        liercd.focused.scroll(function() {
          elem.classList.toggle('expanded');
        });
      }
    }
  });

  $('#panel').on('click', '.embed-wrap[data-embed-id]:not(.open)', function() {
    var id = this.getAttribute('data-embed-id');
    var a = document.querySelector(".embed-toggle[data-embed-id='" + id + "']");
    var embed = JSON.parse(a.getAttribute('data-embed'));
    this.classList.add('open');
    $(this).html(embed.html);
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

  liercd.elem.panel.on('transitionend', 'li.chat', function() {
    this.classList.remove('loading', 'loaded');
  });
}
