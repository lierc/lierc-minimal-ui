var Liercd = function(url) {
  var liercd = this;

  liercd.baseurl = url;
  liercd.stream;
  liercd.connections = {};
  liercd.filling_backlog = false;
  liercd.overlayed = false;
  liercd.sorting = [];
  liercd.panels = {};
  liercd.focused = null;
  liercd.last_panel_id = null;

  liercd.elem = {
    panel: $('#panel'),
    nav: $('#nav'),
    'status': $('#status'),
    privates: $('#privates'),
    channels: $('#channels'),
    input: $('#input'),
    topic: $('#topic'),
    filler: $('#filler'),
    prefix: $('#prefix'),
    scroll: $('#panel-scroll').get(0),
    title: $('title'),
    nicks: $('#nicks'),
    body: $(document.body)
  };

  sortable('.sortable');

  function panel_id(name, connection) {
    return [connection, name].join("-");
  }

  liercd.setup_connection = function(config) {
    if (liercd.connections[config.id])
      return;

    var connection = new Connection(config);

    var panel = liercd.add_panel("status", connection.id);
    panel.change_name(connection.config.Host);
    panel.update_topic("status.");

    connection.on("channel:new", function(conn, channel, message) {
      liercd.add_panel(channel, conn, true);
    });

    connection.on("private:msg", function(conn, nick, message) {
      var panel = liercd.add_panel(nick, conn, false);
      panel.append(Render(message));
    });

    connection.on("channel:msg", function(conn, channel, message) {
      var panel = liercd.get_panel(channel, conn);
      panel.append(Render(message));
    });

    connection.on("channel:nicks", function(conn, channel, nicks) {
      var panel = liercd.get_panel(channel, conn);
      panel.update_nicks(nicks);
    });

    connection.on("channel:close", function(conn, channel) {
      liercd.remove_panel(panel_id(channel, conn));
    });

    connection.on("status:raw", function(conn, message) {
      var panel = liercd.get_panel("status", conn);
      panel.append(Render(message, true));
    });

    connection.on("status", function(conn, message) {
      var panel = liercd.get_panel("status", conn);
      panel.append(Render(message));
    });

    connection.on("channel:topic", function(conn, channel, text) {
      var panel = liercd.get_panel(channel, conn);
      panel.update_topic(text);
    });

    liercd.connections[connection.id] = connection;
  };

  liercd.init = function() {
    $.ajax({
      url: liercd.baseurl + '/connection',
      type: "GET",
      dataType: "json",
      success: function(configs) {
        if (!configs.length)
          liercd.config_modal();

        configs.forEach( function(config) {
          liercd.setup_connection(config);
        });

        if (!liercd.stream)
          liercd.connect();
      }
    });
  };

  liercd.add_recent_privates = function() {
    $.ajax({
      url: liercd.baseurl + '/privates',
      type: "GET",
      dataType: "json",
      success: function(privates) {
        privates.forEach(function(priv) {
          liercd.add_panel(priv.nick, priv.connection, false);
        });
      }
    });
  };

  liercd.connect = function() {
    var stream = new Stream(liercd.baseurl);

    stream.on('message', function(e) {
      var conn_id = e.ConnectionId;
      var message = e.Message;

      if (e.MessageId)
        message.Id =  e.MessageId;

      if (liercd.connections[conn_id]) {
        liercd.connections[conn_id].on_message(message);
      }
    });

    stream.on('close', function(e) {
      if (liercd.focused)
        liercd.focused.stream_status_change(false);
    });

    stream.on('open', function(e) {
      if (liercd.focused) {
        liercd.focused.stream_status_change(true);
        if (stream.last_id) {
          var block = $('<div/>', {'class':'backlog-block'});
          liercd.focused.append(block);
          liercd.fill_missed(liercd.focused, stream.last_id, block);
        }
      }

      for (var id in liercd.panels) {
        if (!liercd.focused || id != liercd.focused.id) {
          liercd.panels[id].elem.list.html('');
        }
      }

      if (stream.last_id)
        liercd.sync_unread(stream.last_id);
    });


    liercd.add_recent_privates();
    liercd.stream = stream;
  };

  liercd.get_panel = function(name, connection) {
    var id = panel_id(name, connection);
    return liercd.panels[id];
  };

  liercd.remove_panel = function(id) {
    if (!liercd.panels[id])
      return;

    var focused = id == liercd.focused.id;
    liercd.panels[id].elem.input.remove();
    liercd.panels[id].elem.list.remove();
    liercd.panels[id].elem.nav.remove();
    liercd.panels[id].elem.topic.remove();
    delete liercd.panels[id];

    if (focused && liercd.last_panel_id) {
      liercd.focus_panel(liercd.last_panel_id);
    }

    liercd.update_nav_counts();
  };

  liercd.update_nav_counts = function() {
    liercd.elem.status.prev(".nav-title").find(".count").text(
      liercd.elem.status.find("li").length
    );

    liercd.elem.privates.prev(".nav-title").find(".count").text(
      liercd.elem.privates.find("li").length
    );

    liercd.elem.channels.prev(".nav-title").find(".count").text(
      liercd.elem.channels.find("li").length
    );
  };

  liercd.add_panel = function(name, connection, focus) {
    var id = panel_id(name, connection);

    if (liercd.panels[id])
      return liercd.panels[id];

    var panel = new Panel(name, id, connection);
    liercd.panels[id] = panel;

    if (panel.type == "status")
      liercd.elem.status.append(panel.elem.nav);
    else if (panel.type == "private")
      liercd.elem.privates.append(panel.elem.nav);
    else
      liercd.insert_sorted_nav(panel);

    liercd.update_nav_counts();

    panel.elem.nav.on('click', function(e) {
      e.preventDefault();

      var id = $(this).attr('data-panel-id');

      if ($(e.target).hasClass('close-panel')) {
        var panel = liercd.panels[id];
        if (panel.type == "channel")
          liercd.part_channel(panel.name, panel.connection);
        if (panel.type == "status")
          liercd.remove_connection(panel.connection);
        else
          liercd.remove_panel(id);
        return;
      }

      liercd.focus_panel(id);
    });

    sortable('.sortable');

    if (focus === true || !liercd.focused)
      liercd.focus_panel(id);
    else if (focus !== false && panel.type == "channel" && liercd.channel_panels() == 1) {
      liercd.focus_panel(id);
    }

    return liercd.panels[id];
  };

  liercd.part_channel = function(name, connection) {
    $.ajax({
      url: liercd.baseurl + '/connection/' + connection,
      type: "POST",
      dataType: "json",
      data: "PART " + name,
    });
  };

  liercd.remove_connection = function(connection) {
    if (!confirm("Are you sure you want to remove this connection?"))
      return;
    $.ajax({
      url: liercd.baseurl + '/connection/' + connection,
      type: "DELETE",
      dataType: "json",
      success: function(res) {
        for (id in liercd.panels) {
          var panel = liercd.panels[id];
          if (panel.connection == connection) {
            liercd.remove_panel(id);
          }
        }
      },
      error: function(res) {
        alert(res);
      }
    });
  };

  liercd.channel_panels = function() {
    var panels = 0
    for (id in liercd.panels) {
      if (liercd.panels[id].type == "channel")
        panels++;
    }
    return panels;
  };

  liercd.insert_sorted_nav = function(panel) {
    var index = liercd.sorting.indexOf(panel.id);
    if (index == -1) {
      liercd.elem.channels.append(panel.elem.nav);
      return;
    }
    var items = liercd.elem.channels.find('li');
    for (var i=0; i < items.length; i++) {
      var id = $(items[i]).attr('data-panel-id');
      if (index < liercd.sorting.indexOf(id)) {
        panel.elem.nav.insertBefore(items[i]);
        return;
      }
    }

    liercd.elem.channels.append(panel.elem.nav);
  };

  liercd.fill_missed = function(panel, stop, elem, start) {
    var connection = liercd.connections[panel.connection];
    if (!connection) return;

    var name = panel.type == "status" ? "status" : panel.name;
    var parts = [
      liercd.baseurl, "connection", connection.id, "channel", encodeURIComponent(name), "events"
    ];

    if (start)
      parts.push(start);

    $.ajax({
      url: parts.join("/"),
      type: "GET",
      dataType: "json",
      success: function(events) {
        var insert = [];

        // newest to oldest
        for (var i=0; i < events.length; i++) {
          var e = events[i];
          var message = e.Message;
          message.Id = e.MessageId;

          // done if message is older than stop
          if (message.Id <= stop)
            break;

          insert.push(message);
        }

        if (insert.length) {
          var block = $('<div/>');
          for (var i=insert.length -1; i >= 0; i--) {
            block.append(Render(insert[i]));
          }

          panel.prepend(block, elem);

          if (insert.length == 100) {
            var last = insert[ insert.length - 1];
            liercd.fill_missed(panel, stop, elem, last.Id);
          }
        }
      }
    });
  };

  liercd.fill_backlog = function(panel, msgid) {
    if (panel.backlog_empty) return;

    var connection = liercd.connections[panel.connection];
    if (!connection) return;

    var name = panel.type == "status" ? "status" : panel.name;
    var parts = [
      liercd.baseurl, "connection", connection.id, "channel", encodeURIComponent(name), "events"
    ];

    if (msgid)
      parts.push(msgid);

    $.ajax({
      url: parts.join("/"),
      type: "GET",
      dataType: "json",
      success: function(events) {
        if (events.length < 50)
          panel.backlog_empty = true;

        var block = $('<div/>', {'class':'backlog-block'});
        events.forEach( function (e) {
          var message = e.Message;
          message.Id = e.MessageId;
          block.prepend(Render(message));
        });

        panel.prepend(block);


        liercd.filling_backlog = false;
      }
    });
  };

  liercd.prev_panel = function() {
    var items = liercd.elem.nav.find("li");
    for (var i=items.length - 1; i >= 0; i--) {
      var item = $(items[i]);
      if (item.hasClass("active") && items[i - 1]) {
        var id = $(items[i - 1]).attr('data-panel-id');
        liercd.focus_panel(id);
        return;
      }
    }
  };

  liercd.prev_unread_panel = function() {
    var items = liercd.elem.nav.find("li");
    for (var i=items.length - 1; i >= 0; i--) {
      var item = $(items[i]);
      if (item.hasClass("active")) {
        for (var j=i; j >= 0; j--) {
          var item = $(items[j - 1]);
          if (item.hasClass("unread")) {
            var id = item.attr('data-panel-id');
            liercd.focus_panel(id);
            return;
          }
        }
        return;
      }
    }
  };

  liercd.next_panel = function() {
    var items = liercd.elem.nav.find("li");
    for (var i=0; i < items.length; i++) {
      var item = $(items[i]);
      if (item.hasClass("active") && items[i + 1]) {
        var id = $(items[i + 1]).attr('data-panel-id');
        liercd.focus_panel(id);
        return;
      }
    }
  }

  liercd.next_unread_panel = function() {
    var items = liercd.elem.nav.find("li");
    for (var i=0; i < items.length; i++) {
      var item = $(items[i]);
      if (item.hasClass("active")) {
        for (var j=i; j < items.length; j++) {
          var item = $(items[j + 1]);
          if (item.hasClass("unread")) {
            var id = item.attr('data-panel-id');
            liercd.focus_panel(id);
            return;
          }
        }
        return;
      }
    }
  };

  liercd.focus_panel = function(id) {
    if (liercd.focused) {
      if (liercd.focused.id == id)
        return;
      liercd.last_panel_id = liercd.focused.id;
    }

    var panel = liercd.panels[id];
    liercd.elem.panel.html(panel.elem.list);
    liercd.elem.input.html(panel.elem.input);
    liercd.elem.topic.html(panel.elem.topic);
    liercd.elem.filler.html(panel.elem.filler);
    liercd.elem.prefix.html(panel.elem.prefix);

    liercd.elem.body.attr("data-panel-type", panel.type);
    liercd.elem.nicks.html(panel.elem.nicks);

    liercd.elem.title.text(panel.name);

    for (id in liercd.panels) {
      liercd.panels[id].unfocus();
    }

    //liercd.scroll_to_nav(panel.elem.nav);

    panel.focus();
    liercd.focused = panel;
  };

  liercd.config_modal = function(e) {
    if (e) e.preventDefault();
    var url = liercd.baseurl + "/connection";
    var overlay = $('<div/>', {'class':'overlay'});
    overlay.append($('.config').clone().show());
    $('body').append(overlay);
    liercd.overlayed = true;

    overlay.on("click touchstart", '.overlay, .close', function(e) {
      e.preventDefault();
      liercd.overlayed = false;
      overlay.remove();
    });

    overlay.on("submit", function(e) {
      e.preventDefault();
      var form = $(e.target);

      var data = {
        Host: form.find('input[name=Host]').val(),
        Port: parseInt(form.find('input[name=Port]').val()),
        Ssl:  form.find('input[name=Ssl]').get(0).checked,
        Nick: form.find('input[name=Nick]').val(),
        User: form.find('input[name=User]').val(),
        Pass: form.find('input[name=Pass]').val(),
        Channels: form.find('input[name=Channels]').val().split(',')
      };

      $.ajax({
        url: url,
        type: "POST",
        dataType: "json",
        data: JSON.stringify(data),
        success: function(res) {
          overlay.remove();
          liercd.overlayed = false;
          liercd.init();
        },
        error: function(res) {
          console.log(res);
          alert("i'm sorry");
        }
      });
    });
  };

  liercd.check_scroll = function() {
    if (liercd.filling_backlog) return;
    if (!liercd.focused) return;
    if (!$(liercd.elem.scroll).is(':visible')) return;

    if (liercd.elem.scroll.scrollTop <= 100) {
      if (!liercd.connections[liercd.focused.connection])
        return;
      if (liercd.focused.backlog_empty) return;
      liercd.filling_backlog = true;
      liercd.fill_backlog(
        liercd.focused, liercd.focused.oldest_message_id()
      );
    }
  };

  setInterval(liercd.check_scroll, 1000);

  $('#toggle-nicks').on('click touchstart', function(e) {
    e.preventDefault();
    scroll = liercd.focused && liercd.focused.is_scrolled();
    $('.nicks-wrap').toggleClass("hidden");
    if (scroll) liercd.focused.scroll();
  });

  $('#nav .nav-title').on('click', function(e) { 
    if ($(e.target).hasClass('nav-title')|| $(e.target).hasClass('nav-title-text')) {
      e.preventDefault();
      $(this).toggleClass('collapsed');
    }
  });

  $('#add-connection').on('click', liercd.config_modal);

  liercd.elem.input.on("submit", function(e) {
    e.preventDefault();
    var input = $(e.target).find("input");
    var value = input.val();
    if (value == "") return;

    input.val("");

    var panel = liercd.panels[input.attr('data-panel-id')];
    var connection = liercd.connections[panel.connection];
    var privmsg = false;
    var method = "POST";

    if (value.substring(0,1) == "/") {
      var command = value.substring(1).split(/\s+/, 2);
      value = command[0].toUpperCase();
      if (value.match(/^PART|QUIT|CLOSE|WC/i)) {
        if (panel.type == "channel") {
          value = "PART " + panel.name;
        }
        else {
          return liercd.remove_panel(panel_id(panel.name, panel.connection));
        }
      }
      else if (value == "TOPIC") {
        value += " " + panel.name;
      }
      if (command.length == 2) {
        value += " :" + command[1];
      }
    }
    else if (panel.type != "status") {
      privmsg = value;
      value = "PRIVMSG " + panel.name + " :" + value;
    }

    $.ajax({
      url: liercd.baseurl + "/connection/" + panel.connection,
      type: method,
      dataType: "json",
      data: value,
      success: function(res) {
        if (method == "DELETE")
          window.location.reload();
      }
    });
  });

  $('#join-channel').on('click', function(e) {
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

  var meta_down = false;
  var shift_down = false;
  var ctrl_down = false;

  document.addEventListener("keydown", function(e) {
    if (e.which == 17) {
      ctrl_down = true;
      return;
    }

    if (e.which == 18) {
      meta_down = true;
      return;
    }

    if (e.which == 16) {
      shift_down = true;
      return;
    }

    if (e.which == 27 && liercd.overlayed) {
      $('.overlay').remove();
      liercd.overlayed = false;
      return;
    }

    if (liercd.overlayed) return;

    if ((e.which == 38 || e.which == 75) && meta_down) {
      e.preventDefault();
      shift_down ? liercd.prev_unread_panel() : liercd.prev_panel();
      return;
    }

    if ((e.which == 40 || e.which == 74) && meta_down) {
      e.preventDefault();
      shift_down ? liercd.next_unread_panel() : liercd.next_panel();
      return;
    }

    if (liercd.focused) {
      if (liercd.focused.keyboard.focused)
        liercd.focused.keyboard.keydown(e);
      else if (! meta_down && ! ctrl_down && String.fromCharCode(e.which).match(/[a-zA-Z0-9]/))
        liercd.focused.elem.input.focus();
    }
  });

  window.addEventListener("blur", function(e) {
    shift_down = false;
    meta_down = false;
    ctrl_down = false;
  });

  window.addEventListener("focus", function(e) {
    shift_down = false;
    meta_down = false;
    ctrl_down = false;
    if (liercd.focused && !$('.overlay').length)
      liercd.focused.elem.input.focus();
  });

  document.addEventListener("keyup", function(e) {
    if (e.which == 18)
      meta_down = false;
    if (e.which == 16)
      shift_down = false;
    if (e.which == 17)
      ctrl_down = false;
  });

  $(document).on('click', '[data-nick]', function(e) {
    e.preventDefault();
    var nick = $(this).attr('data-nick');
    var connection = liercd.focused.connection;
    var panel = liercd.add_panel(nick, connection, true);
    liercd.focus_panel(panel.id);
  });

  liercd.elem.prefix.on('click touchstart', function(e) {
    e.preventDefault();
    var visible = $(liercd.elem.scroll).is(":visible");

    $('.flex-wrap').toggleClass("open");

    // was closed, now open. so it's mobile and we
    // need to scroll this manually
    if (liercd.focused && !visible) {
      liercd.focused.resize_filler();
      liercd.focused.scroll();
    }
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
          var val = liercd.focused.elem.input.val();
          liercd.focused.elem.input.val([val, res.data.link].join(" "));
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

  $('#channels.sortable').on('sortupdate', function(e) {
    var order = $(this).find('li').toArray().map(function(li) {
      return $(li).attr('data-panel-id');
    });

    liercd.sorting = order;
    liercd.update_pref("sorting", order);
  });

  liercd.get_pref = function(name, cb) {
    $.ajax({
      url: liercd.baseurl + "/preference/" + encodeURIComponent(name),
      type: "GET",
      dataType: "json",
      error: function(e) {
        cb();
      },
      success: function(res) {
        cb(JSON.parse(res.value));
      }
    });
  };

  liercd.update_pref = function(name, value) {
    $.ajax({
      url: liercd.baseurl + "/preference/" + encodeURIComponent(name),
      type: "POST",
      dataType: "json",
      data: JSON.stringify(value),
      success: function(res) { }
    });
  };

  liercd.get_pref("sorting", function(order) {
    liercd.sorting = order || [];
    liercd.init();
  });

  liercd.sync_unread = function(last_id) {
    $.ajax({
      url: liercd.baseurl + "/unread/" + last_id,
      type: 'GET',
      dataType: 'json',
      error: function(res) {
        console.log(res);
      },
      success: function(res) {
        for (connection in res) {
          for (channel in res[connection]) {
            var panel = liercd.add_panel(channel, connection, false);
            if (!liercd.focused || panel.id != liercd.focused.id) {
              if (res[connection][channel].messages) {
                panel.unread = true;
                panel.update_nav();
              }
              else if (res[connection][channel].events) {
                panel.missed = true;
                panel.update_nav();
              }
            }
          }
        }
      }
    });
  };
};
