var Liercd = function(url) {
  var liercd = this;

  liercd.baseurl = url;
  liercd.stream;
  liercd.connections = {};
  liercd.filling_backlog = false;
  liercd.overlayed = false;
  liercd.sorting = [];
  liercd.last_seen = {};
  liercd.missed = {};
  liercd.panels = {};
  liercd.focused = null;
  liercd.last_panel_id = null;
  liercd.window_focused = true;
  liercd.emoji = new Emoji();
  liercd.default_panel = null;
  liercd.default_focused = false;

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
    body: $(document.body),
    audio: new Audio("/static/ent_communicator1.mp3"),
    emoji: $('#emoji')
  };

  $('.sortable').each(function() {
    Sortable.create(this, {
      delay: "ontouchstart" in document.documentElement ? 250 : 0,
      onSort: function(e) {
        var order = $(this.el).find('li').toArray().map(function(li) {
          return $(li).attr('data-panel-id');
        });

        liercd.sorting = order;
        liercd.update_pref("sorting", order);
      }
    });
  });

  function panel_id(name, connection) {
    return [connection, name].join("-");
  }

  liercd.setup_connection = function(config) {
    if (liercd.connections[config.id])
      return;

    var connection = new Connection(config);
    liercd.connections[connection.id] = connection;

    var panel = liercd.add_panel("status", connection.id);
    panel.change_name(connection.config.Host);
    panel.update_topic({value: "status."});

    connection.on("channel:new", function(conn, channel, message) {
      liercd.add_panel(channel, conn, ("Id" in message));
    });

    connection.on("private:msg", function(conn, nick, message) {
      var panel = liercd.add_panel(nick, conn, false);
      var connection = liercd.connections[conn];
      var highlight = !liercd.is_focused(panel) && message.Prefix.Name != connection.nick;

      panel.append(Render(message), highlight);

      if ( highlight )
        liercd.elem.audio.play();
    });

    connection.on("channel:msg", function(conn, channel, message) {
      var html = Render(message);
      if (html) {
        var panel = liercd.get_panel(channel, conn);
        var highlight = !liercd.is_focused(panel) && liercd.is_highlight(conn, message);
        panel.append(html, highlight);

        if ( highlight )
          liercd.elem.audio.play();
      }
    });

    connection.on("channel:react", function(conn, channel, message) {
      var panel = liercd.get_panel(channel, conn);
      var parts = message.Params[1].split(" ");
      panel.handle_reaction(message.Prefix.Name, parts[1], parts[2]);
    });

    connection.on("private:react", function(conn, nick, message) {
      var panel = liercd.get_panel(nick, conn);
      var parts = message.Params[1].split(" ");
      panel.handle_reaction(message.Prefix.Name, parts[1], parts[2]);
    });

    connection.on("channel:nicks", function(conn, channel, nicks) {
      var panel = liercd.get_panel(channel, conn);
      panel.update_nicks(nicks);
    });

    connection.on("channel:mode", function(conn, channel, mode) {
      var panel = liercd.get_panel(channel, conn);
      panel.update_mode(mode);
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

    connection.on("channel:topic", function(conn, channel, topic) {
      var panel = liercd.get_panel(channel, conn);
      panel.update_topic(topic);
    });
  };

  liercd.is_focused = function(panel) {
    return liercd.window_focused && liercd.focused && liercd.focused.id == panel.id;
  };

  liercd.is_highlight = function(conn, message) {
    if (message.Prefix.Nick == conn.nick)
      return false;
    var nick = liercd.connections[conn].nick;
    return message.Command == "PRIVMSG" && message.Params[1].indexOf(nick) != -1;
  };

  liercd.find_default_panel = function() {
    var parts = window.location.hash.split("/").slice(1);
    if (parts.length == 2) {
      return panel_id(decodeURIComponent(parts[1]), parts[0]);
    }
    else if (liercd.sorting.length) {
      return liercd.sorting[0];
    }
    return null;
  };

  liercd.init = function() {
    liercd.default_panel = liercd.find_default_panel();
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

    stream.on('connect', function(e) {
      var conn_id   = e.Id;
      var connected = e.Connected;

      if (liercd.connections[conn_id]) {
        liercd.connections[conn_id].connected = connected;
        for (id in liercd.panels) {
          var panel = liercd.panels[id];
          if (panel.connection == conn_id) {
            panel.set_connected(connected, e.Message);
          }
        }
      }
    });

    stream.on('close', function(e) {
      for (id in liercd.panels) {
        liercd.panels[id].set_disabled(true);
      }
      var scrolled = liercd.focused && liercd.focused.is_scrolled();
      liercd.elem.body.addClass('disconnected');
      if (scrolled)
        liercd.focused.scroll();
    });

    stream.on('timer', function(time) {
      $('#reconnect-counter-wrap').show();
      $('#reconnect-counter').text(time);
    });

    stream.on('open', function(e) {
      liercd.elem.body.removeClass('disconnected');
      $('#reconnect-counter-wrap').hide();
      if (liercd.focused) {
        if (stream.last_id) {
          var block = $('<div/>', {'class':'backlog-block'});
          liercd.focused.append(block);
          liercd.fill_missed(liercd.focused, stream.last_id, block);
        }
      }

      for (var id in liercd.panels) {
        liercd.panels[id].set_disabled(false);
        if (!liercd.focused || id != liercd.focused.id) {
          liercd.panels[id].elem.list.html('');
        }
      }

      liercd.sync_missed();
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
    liercd.panels[id].elem.nicks.remove();
    liercd.panels[id].elem.topic.remove();
    liercd.panels[id].elem.filler.remove();
    liercd.panels[id].elem.prefix.remove();
    liercd.panels[id].elem.nav.remove();
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

    var conn = liercd.connections[connection];
    var panel = new Panel(name, id, conn);
    if (liercd.last_seen[panel.id])
      panel.last_seen = liercd.last_seen[panel.id];
    panel.update_nav();

    liercd.panels[id] = panel;

    if (panel.type == "status")
      liercd.elem.status.append(panel.elem.nav);
    else if (panel.type == "private")
      liercd.elem.privates.append(panel.elem.nav);
    else
      liercd.insert_sorted_nav(panel);

    liercd.update_nav_counts();

    if (panel.type == "channel")
      liercd.ignore_events_pref(panel);

    panel.elem.nav.on('click', function(e) {
      e.preventDefault();

      $('.flex-wrap').removeClass("open");

      var id = $(this).attr('data-panel-id');
      var panel = liercd.panels[id];

      if ($(e.target).hasClass('close-panel')) {
        if (panel.type == "channel")
          liercd.part_channel(panel.name, panel.connection);
        else if (panel.type == "status")
          liercd.remove_connection(panel.connection);
        else
          liercd.remove_panel(id);
      }
      else if ($(e.target).hasClass('edit-panel')) {
        var connection = liercd.connections[panel.connection];
        liercd.config_modal(null, connection);
      }
      else {
        liercd.focus_panel(id);
      }
    });

    // force focusing or no focused panel
    if (focus === true || !liercd.focused) {
      liercd.focus_panel(id);
    }
    // this channel was in the URL on load
    else if (liercd.default_panel && id == liercd.default_panel) {
      liercd.default_panel = null;
      liercd.default_focused = true;
      liercd.focus_panel(id);
    }
    // focus the first channel added
    else if (!liercd.default_focused && panel.type == "channel" && liercd.channel_panels() == 1) {
      liercd.focus_panel(id);
    }

    if (!panel.focused && liercd.missed[panel.id])
      liercd.apply_missed(panel, liercd.missed[panel.id]);

    delete liercd.missed[panel.id];

    return liercd.panels[id];
  };

  liercd.apply_missed = function(panel, missed) {
    if (missed.messages) {
      panel.unread = true;
      if (panel.type == "private")
        panel.highlighted = true;
      panel.update_nav();
    }
    else if (missed.events) {
      panel.missed = true;
      panel.update_nav();
    }
  };

  liercd.part_channel = function(name, connection) {
    if (!confirm("Are you sure you want to leave this channel?"))
      return;
    $.ajax({
      url: liercd.baseurl + '/connection/' + connection,
      type: "POST",
      dataType: "json",
      data: "PART " + name,
      success: function() {
        liercd.remove_panel(panel_id(name, connection));
      }
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
          var reactions = [];
          for (var i=insert.length -1; i >= 0; i--) {
            if (liercd.is_reaction(insert[i]))
              reactions.push(insert[i]);
            else
              block.append(Render(insert[i]));
          }

          panel.prepend(block, elem);
          reactions.forEach(function(reaction) {
            var parts = reaction.Params[1].split(" ");
            panel.handle_reaction(reaction.Prefix.Name, parts[1], parts[2]);
          });

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

    panel.set_loading(true);

    var limit = panel.ignore_events ? 150 : 50;
    var name = panel.type == "status" ? "status" : panel.name;
    var parts = [
      liercd.baseurl, "connection", connection.id, "channel", encodeURIComponent(name), "events"
    ];

    if (msgid)
      parts.push(msgid);

    $.ajax({
      url: parts.join("/"),
      type: "GET",
      data: { limit: limit },
      dataType: "json",
      error: function(e) {
        liercd.filling_backlog = false;
        panel.set_loading(false);
      },
      success: function(events) {
        if (events.length < limit)
          panel.backlog_empty = true;

        var list = [];
        var reactions = [];
        var block = $('<div/>', {'class':'backlog-block'});

        events.forEach( function (e) {
          var message = e.Message;
          message.Id = e.MessageId;
          if (liercd.is_reaction(message))
            reactions.push(message);
          else
            list.push(Render(message));
        });

        panel.prepend(block.append(list.reverse()));
        liercd.filling_backlog = false;
        reactions.forEach(function(reaction) {
          var parts = reaction.Params[1].split(" ");
          panel.handle_reaction(reaction.Prefix.Name, parts[1], parts[2]);
        });
        panel.react_backlog_check();
        panel.set_loading(false);
        panel.last_seen_separator();
      }
    });
  };

  liercd.is_reaction = function(message) {
    return message.Command == "PRIVMSG"
      && message.Params[1].substring(0,5) == "\x01" + "FACE";
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
      liercd.save_seen(liercd.focused);
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

    if (liercd.focused)
      liercd.focused.unfocus();

    //liercd.scroll_to_nav(panel.elem.nav);

    if (panel.first_focus && panel.type == "channel")
      liercd.show_nicklist_pref(panel);

    panel.focus();
    liercd.focused = panel;
    window.history.replaceState({}, "", panel.path);
    liercd.check_scroll();
  };

  liercd.config_modal = function(e, connection) {
    if (e) e.preventDefault();
    $('.flex-wrap').removeClass('open');

    var method = "POST";
    var url = liercd.baseurl + "/connection";

    var overlay = $('<div/>', {'class':'overlay'});
    overlay.append($('.config').clone());

    if (connection) {
      var config = connection.config;
      var form = overlay.find('form');
      form.find('input[name=Host]').val(config.Host);
      form.find('input[name=Port]').val(config.Port);
      if (config.Ssl)
        form.find('input[name=Ssl]').get(0).checked ="checked";
      form.find('input[name=Nick]').val(config.Nick);
      form.find('input[name=User]').val(config.User);
      form.find('input[name=Pass]').val(config.Pass);
      form.find('input[name=Channels]').val(config.Channels);

      overlay.find('h2').text('Edit connection');
      overlay.find('input[type=submit]').val('Save & Reconnect').css('font-weight', 'bold');
      overlay.find('input[type=submit]').before($('<input/>', {
        type: "submit",
        value: "\uf071 Delete",
        'class': 'delete-connection'
      }));
      url += '/' + connection.id;
      method = "PUT";
    }

    $('body').append(overlay);
    liercd.overlayed = true;

    overlay.on("click touchstart", '.overlay, .close', function(e) {
      e.preventDefault();
      liercd.overlayed = false;
      overlay.remove();
    });

    overlay.find('.delete-connection').on('click', function(e) {
      e.preventDefault();
      liercd.remove_connection(connection.id);
      overlay.remove();
      liercd.overlayed = false;
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
        type: method,
        dataType: "json",
        data: JSON.stringify(data),
        success: function(res) {
          if (connection) {
            for (panel in liercd.panels) {
              if (panel.type == "channel") {
                liercd.remove_panel(panel.id);
              }
            }
            delete liercd.connections[connection.id];
          }
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

    if (liercd.elem.scroll.scrollTop <= 150) {
      if (!liercd.connections[liercd.focused.connection])
        return;
      if (liercd.focused.backlog_empty) return;
      liercd.filling_backlog = true;
      liercd.fill_backlog(
        liercd.focused, liercd.focused.oldest_message_id()
      );
    }
  };

  setInterval(liercd.check_scroll, 250);

  liercd.ping_server = function() {
    $.ajax({
      url: liercd.baseurl + "/auth",
      type: "GET",
      dataType: "json",
      complete: function(res) {
        if (res.status == 200)
          return;

        console.log(res.status);

        // ping failed, force a reconnect of stream...
        if (res.status == 0) {
          liercd.stream.close();
          return;
        }

        var data = JSON.parse(res.responseText);
        if (data["error"]) {
          console.log(data["error"]);
        }
      }
    });
  };

  setInterval(liercd.ping_server, 1000 * 15);

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

  liercd.show_nicklist_pref = function(panel) {
    liercd.get_pref(panel.id + "-show-nicklist", function(value) {
      if (value != undefined)
        panel.set_show_nicklist(value);
    });
  };

  liercd.ignore_events_pref = function(panel) {
    liercd.get_pref(panel.id + "-ignore-events", function(value) {
      if (value !== undefined)
        panel.set_ignore_events(value);
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

  liercd.load_seen = function(cb) {
    $.ajax({
      url: liercd.baseurl + "/seen",
      type: "GET",
      dataType: "json",
      complete: function(e) {
        cb();
      },
      success: function(res) {
        for (i in res) {
          var id = panel_id(res[i]["channel"], res[i]["connection"]);
          liercd.last_seen[id] = res[i]["message_id"];
        }
      }
    });
  };

  liercd.save_seen = function(panel, force) {
    var diffs = 0;
    var id = panel.id;
    var last_seen = panel.last_seen;
    var send = last_seen && last_seen != liercd.last_seen[id];

    if (send || force) {
      var parts = [
        liercd.baseurl, "connection", panel.connection,
        "channel", encodeURIComponent(panel.name), "seen"
      ];

      $.ajax({
        url: parts.join("/"),
        type: "POST",
        dataType: "json",
        data: "" + last_seen,
        error: function(e) {
          console.log("error saving", e);
        }
      });

      liercd.last_seen[id] = last_seen;
    }
  };

  liercd.sync_missed = function() {
    $.ajax({
      url: liercd.baseurl + "/missed",
      type: 'GET',
      data: liercd.last_seen,
      dataType: 'json',
      error: function(res) {
        console.log(res);
      },
      success: function(res) {
        liercd.missed = {};
        for (connection in res) {
          for (channel in res[connection]) {
            var id = panel_id(channel, connection);
            if (liercd.panels[id]) {
              liercd.apply_missed(liercd.panels[id], res[connection][channel]);
            }
            else {
              liercd.missed[id] = res[connection][channel];
            }
          }
        }
      }
    });
  };

  liercd.get_pref("sorting", function(order) {
    liercd.sorting = order || [];
    liercd.load_seen(function() {
      liercd.init();
    });
  });

  var events = new UIEvents(liercd);
};
