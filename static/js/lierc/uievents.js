var UIEvents = function(liercd) {
  var liercd = liercd;
  var events = this;

  var mods = {
    meta: false,
    shift: false,
    ctrl: false
  };

  var commands = new Commands();

  document.addEventListener("keydown", function(e) {
    if (e.which == 17) {
      mods['ctrl'] = true;
    }

    if (e.which == 18) {
      mods['meta'] = true;
    }

    if (e.which == 16) {
      mods['shift'] = true;
    }

    if (e.which == 13) {
      e.preventDefault();
      liercd.elem.input.submit();
      return;
    }

    if (e.which == 27 && liercd.overlayed) {
      $('.overlay').remove();
      liercd.overlayed = false;
      return;
    }

    if (liercd.overlayed) return;

    if ((e.which == 38 || e.which == 75) && mods['meta']) {
      e.preventDefault();
      mods['shift'] ? liercd.prev_unread_panel() : liercd.prev_panel();
      return;
    }

    if ((e.which == 40 || e.which == 74) && mods['meta']) {
      e.preventDefault();
      mods['shift'] ? liercd.next_unread_panel() : liercd.next_panel();
      return;
    }

    if (liercd.focused) {
      if (liercd.focused.keyboard.focused) {
        liercd.focused.keyboard.keydown(e, mods);
      }
      else if (
        e.target.nodeName != "INPUT"
        && e.target.nodeName != "TEXTAREA"
        && ! mods['meta'] && ! mods['ctrl']
        && String.fromCharCode(e.which).match(/[a-zA-Z0-9]/)
      ) {
        liercd.focused.elem.input.focus();
      }
    }
  });

  window.addEventListener("blur", function(e) {
    mods['shift'] = false;
    mods['meta'] = false;
    mods['ctrl'] = false;

    liercd.window_focused = false;
  });

  window.addEventListener("focus", function(e) {
    mods['shift'] = false;
    mods['meta'] = false;
    mods['ctrl'] = false;

    liercd.window_focused = true;

    if (liercd.focused && !$('.overlay').length)
      liercd.focused.elem.input.focus();
  });

  document.addEventListener("keyup", function(e) {
    if (e.which == 18)
      mods['meta'] = false;
    if (e.which == 16)
      mods['shift'] = false;
    if (e.which == 17)
      mods['ctrl'] = false;
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
    var overlay = $('<div/>', {'class':'overlay'});
    overlay.append($('.join').clone().show());
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
      $.ajax({
        url: liercd.baseurl + '/connection/' + conn,
        type: "POST",
        data: "JOIN " + channel,
        dataType: "json",
        complete: function(res) {
          overlay.remove();
          liercd.overlayed = false;
        }
      });
    });
  });

  $('.add-connection').on('click', liercd.config_modal);

  $('#nav .nav-title').on('click', function(e) { 
    if ($(e.target).is('.nav-title,.nav-title-text,.count')) {
      e.preventDefault();
      $(this).toggleClass('collapsed');
    }
  });

  $('#toggle-joinpart').on('click touchstart', function(e) {
    e.preventDefault();
    liercd.elem.body.toggleClass('hide-joinpartquit');
  });

  $('#toggle-nicks').on('click touchstart', function(e) {
    e.preventDefault();
    scroll = liercd.focused && liercd.focused.is_scrolled();
    liercd.elem.body.toggleClass('hide-nicklist');
    if (scroll) liercd.focused.scroll();
  });

  liercd.elem.emoji.on('click', function(e) {
    e.preventDefault();
    var target = $(e.target);

    if (target.is('li[data-chars]')) {
      liercd.focused.elem.input.focus();
      document.execCommand("insertText", false, target.attr('data-chars'));

      liercd.elem.emoji.removeClass("open");
      $('.emoji-search input').val('');
      liercd.emoji.filter(liercd.elem.emoji, '');
    }
    if (target.is('#emoji')) {
      target.toggleClass('open');
      if (!("ontouchstart" in document.documentElement)) {
        if (target.hasClass('open')) {
          $('.emoji-search input').val('');
          liercd.emoji.filter(liercd.elem.emoji, '');
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

    value = Markdown(value);

    var panel = liercd.panels[input.attr('data-panel-id')];
    var connection = liercd.connections[panel.connection];

    if (value.substring(0,1) == "/") {
      try {
        value = commands.handle_command(panel, value.substring(1));
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
      value = "PRIVMSG " + panel.name + " :" + value;
    }

    $.ajax({
      url: liercd.baseurl + "/connection/" + panel.connection,
      type: "POST",
      dataType: "json",
      jsonp: false,
      data: value,
      success: function(res) {}
    });
  });

  $('#help').on('click touchstart', function(e) {
    e.preventDefault();
    var overlay = $('<div/>', {'class':'overlay'});
    overlay.append($('.help').clone().show());
    $('body').append(overlay);
    liercd.overlayed = true;
    overlay.on('touchstart click', '.overlay', function(e) {
      e.preventDefault();
      overlay.remove();
      liercd.overlayed = false;
    });
  });

  $('#logout').on('click touchstart', function(e) {
    e.preventDefault();

    if (!confirm("Are you sure you want to log out?"))
      return;

    $.ajax({
      url: liercd.baseurl + "/logout",
      type: "POST",
      dataType: "json",
      complete: function() {
        window.location.reload();
      }
    });
  });

  $(window).on('resize', function(e) {
    if (liercd.focused)
      liercd.focused.scroll();
  });

  document.addEventListener('paste', function(e) {
    var items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (i in items) {
      if (items[i].type && items[i].type.match(/^image\//)) {
        e.preventDefault();
        liercd.focused.elem.input.focus();
        var blob = items[i].getAsFile();
        var fd = new FormData();
        fd.append("image", blob);
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "//api.imgur.com/3/image");
        xhr.setRequestHeader('Authorization', 'Client-ID 033f98700d8577c');
        xhr.onload = function() {
          var res = JSON.parse(xhr.responseText);
          liercd.focused.elem.input.focus();
          document.execCommand("insertText", false, res.data.link);
        };
        xhr.send(fd);
        return;
      }
    }
  });

  liercd.elem.panel.on('click', '[data-embed]', function(e) {
      e.preventDefault();
      var wrap = $(this);
      wrap.html(wrap.attr('data-embed'));
      wrap.addClass('open');
      wrap.removeAttr('data-embed');
  });

  $('.flex-wrap-left header').on('touchstart click', function(e) {
    e.preventDefault();
    $('.flex-wrap').toggleClass("open");
  });

  $(document).on('input', '.emoji-search input', function(e) {
    var list = $(e.target).parents('.emoji-popup').find('ul');
    liercd.emoji.filter(list, $(e.target).val());
  });

  $('#panel').on('mouseenter', 'li.message', function(e) {
    if ($('.react.open').length)
      return;

    $(this).append($('<div/>', {
      'class':'react',
      'title': $(this).find('time').attr('title')
    }));
  });

  $('#panel').on('mouseleave', 'li.message', function(e) {
    var react = $(this).find('.react:not(.open)');

    if (react.length)
      react.remove(); 
  });

  $('#panel').on('click', '.react', function(e) {
    var react = $(this);
    var target = $(e.target);

    if (target.is('.react')) {
      react.toggleClass('open');
      if (react.hasClass('open')) {
        var emoji = $('#emoji .emoji-popup').clone(true);
        react.append(emoji);
        emoji.find('.emoji-search input').focus();
      }
      else {
        react.find('.emoji-popup').remove();
      }
    }
    if (target.is('li[data-chars]')) {
      var emoji = target.attr('data-chars');
      var hash = react.parents('li.message').attr('data-message-hash');
      var panel = liercd.focused;

      react.remove();

      if (! (emoji && hash && panel))
        return;

      $.ajax({
        url: liercd.baseurl + "/connection/" + panel.connection,
        type: "POST",
        dataType: "json",
        jsonp: false,
        data: "PRIVMSG " + panel.name + " :\x01" + ["FACE", hash, emoji].join(" "),
        success: function(res) {}
      });
    }
  });
}
