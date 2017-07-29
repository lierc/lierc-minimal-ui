if (!("forEach" in NodeList)) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

var App = function(url, user) {
  var app = this;

  app.user = user;
  app.api = new API(url);
  app.commands = new Commands(app);
  app.stream;
  app.connections = {};
  app.filling_backlog = false;
  app.dialog = null;
  app.sorting = [];
  app.last_seen = {};
  app.missed = {};
  app.panels = {};
  app.focused = null;
  app.last_panel_id = null;
  app.window_focused = true;
  app.default_panel = null;
  app.default_focused = false;
  app.prefs = {};
  app.touchstart = "ontouchstart" in document.documentElement;
  app.mobile = detect_mobile();
  app.post_tokens = [];

  app.elem = {
    panel: document.getElementById('panel'),
    nav: document.getElementById('nav'),
    'status': document.getElementById('status'),
    privates: document.getElementById('privates'),
    channels: document.getElementById('channels'),
    input: document.getElementById('input'),
    topic: document.getElementById('topic'),
    filler: document.getElementById('filler'),
    prefix: document.getElementById('prefix'),
    scroll: document.getElementById('panel-scroll'),
    title: document.getElementsByTagName('title')[0],
    nicks: document.getElementById('nicks'),
    body: document.body,
    audio: new Audio("/static/ent_communicator1.mp3"),
    emoji: document.getElementById('emoji'),
    switcher: document.getElementById('switcher-wrap'),
    panel_name: document.getElementById('panel-name'),
    flex_wrap: document.querySelector('.flex-wrap'),
    reconnect: document.getElementById('reconnect-status')
  };

  if (!app.mobile) {
    document.querySelectorAll('.sortable').forEach(function(el) {
      Sortable.create(el, {
        delay: 0,
        onSort: function(e) {
          app.save_channel_order();
        }
      });
    });
  }

  function panel_id(name, connection) {
    return [connection, name.toLowerCase()].join("-");
  }

  app.set_connected = function(conn_id, status, message) {
    var connection = app.connections[conn_id];
    connection.connected = status;

    for (id in app.panels) {
      var panel = app.panels[id];
      if (panel.connection == conn_id) {
        panel.set_connected(status, message);
      }
    }
  };

  app.setup_connection = function(id, host, nick) {
    if (app.connections[id])
      return;

    var connection = new Connection(id, host);
    app.connections[id] = connection;

    var panel = app.add_panel("status", connection.id);
    panel.change_name(host);
    panel.update_topic({value: "status."});

    connection.on("channel:new", function(conn, channel, message) {
      app.add_panel(channel, conn, ("Id" in message));
    });

    connection.on("private:msg", function(conn, nick, message) {
      var panel = app.add_panel(nick, conn, false);
      var connection = app.connections[conn];
      var from = message.Prefix.Name != connection.nick;

      panel.append(Render(message));

      if (from && (!app.is_focused(panel) || !panel.is_scrolled()))
        app.elem.audio.play();
    });

    connection.on("channel:msg", function(conn, channel, message) {
      var panel = app.get_panel(channel, conn);
      var html = Render(message);
      if (html) {
        panel.append(html);

        if (message.Highlight && (!app.is_focused(panel) || !panel.is_scrolled()))
          app.elem.audio.play();
      }
    });

    connection.on("channel:react", function(conn, channel, message) {
      var panel = app.get_panel(channel, conn);
      var parts = message.Params[1].split(" ");
      panel.handle_reaction(message.Prefix.Name, parts[1], parts[2]);
    });

    connection.on("private:react", function(conn, nick, message) {
      var panel = app.get_panel(nick, conn);
      var parts = message.Params[1].split(" ");
      panel.handle_reaction(message.Prefix.Name, parts[1], parts[2]);
    });

    connection.on("channel:nicks", function(conn, channel, nicks) {
      var panel = app.get_panel(channel, conn);
      if (panel.focused)
        panel.update_nicks(nicks);
    });

    connection.on("channel:mode", function(conn, channel, mode) {
      var panel = app.get_panel(channel, conn);
      panel.update_mode(mode);
    });

    connection.on("channel:close", function(conn, channel) {
      app.remove_panel(panel_id(channel, conn));
    });

    connection.on("status:raw", function(conn, message) {
      var panel = app.get_panel("status", conn);
      panel.append(Render(message, true));
    });

    connection.on("status", function(conn, message) {
      var panel = app.get_panel("status", conn);
      panel.append(Render(message));
    });

    connection.on("connect", function(conn, message) {
      app.set_connected(conn, true, message.Params[0]);
    });

    connection.on("disconnect", function(conn, message) {
      app.set_connected(conn, false, message.Params[0]);
    });

    connection.on("channel:topic", function(conn, channel, topic) {
      var panel = app.get_panel(channel, conn);
      panel.update_topic(topic);
    });
  };

  app.is_focused = function(panel) {
    return app.window_focused && app.focused && app.focused.id == panel.id;
  };

  app.find_default_panel = function() {
    var parts = window.location.hash.split("/").slice(1);
    if (parts.length == 2) {
      return panel_id(decodeURIComponent(parts[1]), parts[0]);
    }
    else if (app.sorting.length) {
      return app.sorting[0];
    }
    return null;
  };

  app.init = function() {
    app.default_panel = app.find_default_panel();
    app.api.get('/connection', {
      success: function(configs) {
        if (!configs.length)
          app.config_modal();

        configs.forEach(function(conn) {
          var conn_id   = conn.Id;
          var host = conn.Config.Alias || conn.Config.Host;
          var nick = conn.Nick;
          app.setup_connection(conn_id, host, nick);
        });

        if (app.stream)
          app.stream.destroy();

        app.connect();
      }
    });
  };

  app.add_recent_privates = function() {
    app.api.get("/privates", {
      success: function(privates) {
        privates.forEach(function(priv) {
          app.add_panel(priv.nick, priv.connection, false);
        });
      }
    });;
  };

  app.connect = function() {
    var stream = app.api.stream();

    stream.on('message', function(e) {
      var conn_id = e.ConnectionId;
      var message = e.Message;

      if (e.MessageId)
        message.Id =  e.MessageId;
      message.Highlight = e.Highlight;

      if (app.connections[conn_id]) {
        app.connections[conn_id].on_message(message);
      }
    });

    stream.on('create_connection', function(e) {
      var conn_id = e.ConnectionId;
      var message = e.Message;
      var nick    = message.Params[0];
      var host    = message.Params[1];
      app.setup_connection(conn_id, host, nick);
    });

    stream.on('delete_connection', function(e) {
      var conn_id = e.ConnectionId;

      for (id in app.panels) {
        var panel = app.panels[id];
        if (panel.connection == conn_id) {
          app.remove_panel(id);
        }
      }

      delete app.connections[conn_id];
    });

    stream.on('close', function(e) {
      for (id in app.panels) {
        app.panels[id].set_disabled(true);
      }
      if (app.focused) {
        app.focused.scroll(function() {
          app.elem.body.classList.add('disconnected');
        });
      }
      else {
        app.elem.body.classList.add('disconnected');
      }
    });

    stream.on('reconnect-status', function(text) {
      if (app.focused) {
        app.focused.scroll(function() {
          app.elem.reconnect.textContent = text;
        });
      }
      else {
        app.elem.reconnect.textContent = text;
      }
    });

    stream.on('open', function(e) {
      app.elem.body.classList.remove('disconnected');
      if (app.focused) {
        if (stream.last_id) {
          app.fill_missed(stream.last_id);
        }
      }

      for (var id in app.panels) {
        app.panels[id].set_disabled(false);
        if (!app.focused || id != app.focused.id) {
          app.panels[id].clear_lists();
        }
      }
    });

    app.sync_missed();
    app.add_recent_privates();
    app.stream = stream;
  };

  app.get_panel = function(name, connection) {
    var id = panel_id(name, connection);
    return app.panels[id];
  };

  app.close_panel = function(id) {
    var panel = app.panels[id];
    if (panel.type == "private") {
      var path = "/connection/" + panel.connection + "/nick/" + encodeURIComponent(panel.name);
      app.api.delete(path);
    }
    app.remove_panel(id);
  };

  app.remove_panel = function(id) {
    if (!app.panels[id])
      return;

    var focused = id == app.focused.id;
    app.panels[id].remove_elems();
    delete app.panels[id];

    if (focused) {
      if (app.last_panel_id && app.panels[app.last_panel_id])
        app.focus_panel(app.last_panel_id);
      else if (Object.keys(app.panels).length)
        app.focus_panel(Object.keys(app.panels)[0]);
      else
        app.focused = null;
    }

    app.update_nav_counts();
  };

  app.update_nav_counts = function() {
    app.elem.status
      .previousSibling.previousSibling
      .querySelector('.count')
      .textContent = app.elem.status.querySelectorAll("li").length

    app.elem.privates
      .previousSibling.previousSibling
      .querySelector(".count")
      .textContent = app.elem.privates.querySelectorAll("li").length;

    app.elem.channels
      .previousSibling.previousSibling
      .querySelector(".count")
      .textContent = app.elem.channels.querySelectorAll("li").length;
  };

  app.add_panel = function(name, connection, focus) {
    var id = panel_id(name, connection);

    if (app.panels[id])
      return app.panels[id];

    if (!app.connections[connection]) {
      console.log("Connection does not exist", connection);
      throw "Connection does not exist";
    }

    var conn = app.connections[connection];
    var panel = new Panel(name, id, conn, app.mobile);
    if (app.last_seen[panel.id])
      panel.last_seen = app.last_seen[panel.id];
    panel.update_nav();

    if (panel.type == "channel") {
      var channel = conn.channel(panel.name);
      panel.editor.completion.nicks = channel.nicks;
    }
    panel.editor.completion.commands = app.commands.completions();

    app.panels[id] = panel;

    if (panel.type == "status")
      app.elem.status.appendChild(panel.elem.nav);
    else if (panel.type == "private")
      app.elem.privates.appendChild(panel.elem.nav);
    else
      app.insert_sorted_nav(panel);

    app.update_nav_counts();

    if (panel.type == "channel")
      app.ignore_events_pref(panel);

    app.collapse_embeds_pref(panel);
    app.monospace_nicks_pref(panel);

    panel.elem.nav.addEventListener('click', function(e) {
      e.preventDefault();

      app.elem.flex_wrap.classList.remove("open");

      var id = this.getAttribute('data-panel-id');
      var panel = app.panels[id];

      if (e.target.classList.contains('close-panel')) {
        if (panel.type == "channel")
          app.part_channel(panel.name, panel.connection);
        else if (panel.type == "status")
          app.delete_connection(panel.connection);
        else
          app.close_panel(id);
      }
      else if (e.target.classList.contains('edit-panel')) {
        app.api.get("/connection/" + panel.connection, {
          success: function(res) {
            app.config_modal(null, res);
          },
          error: function(e) {
            alert(e);
          }
        });
      }
      else {
        app.focus_panel(id);
      }
    });

    // force focusing or no focused panel
    if (focus === true || !app.focused) {
      app.focus_panel(id);
    }
    // this channel was in the URL on load
    else if (app.default_panel && id == app.default_panel) {
      app.default_panel = null;
      app.default_focused = true;
      app.focus_panel(id);
    }
    // focus the first channel added
    else if (!app.default_focused && panel.type == "channel" && app.channel_panels() == 1) {
      app.focus_panel(id);
    }

    if (!panel.focused && app.missed[panel.id])
      app.apply_missed(panel, app.missed[panel.id]);

    delete app.missed[panel.id];

    return app.panels[id];
  };

  app.apply_missed = function(panel, missed) {
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

  app.post_token = function() {
    var token = app.post_tokens.pop();
    if (!token) {
      alert("No post tokens, tell Lee!");
      throw Error("No tokens");
    }
    return token;
  };

  app.part_channel = function(name, connection) {
    if (!confirm("Are you sure you want to leave " + name + "?"))
      return;

    var headers = new Headers();
    headers.append('lierc-token', app.post_token());
    headers.append('content-type', 'application/irc');

    app.api.post('/connection/' + connection, {
      body: 'PART ' + name,
      headers: headers,
      success: function(res) {
        app.remove_panel(panel_id(name, connection));
        app.post_tokens.push(res.token);
      },
      error: function(e) {
        alert("Error: " + e);
        app.load_token();
      }
    });
  };

  app.delete_connection = function(connection) {
    if (!confirm("Are you sure you want to remove this connection?"))
      return;
    app.api.delete('/connection/' + connection, {
      error: function(e) { alert(e); }
    });
  };

  app.channel_panels = function() {
    var panels = 0
    for (id in app.panels) {
      if (app.panels[id].type == "channel")
        panels++;
    }
    return panels;
  };

  app.insert_sorted_nav = function(panel) {
    var index = app.sorting.indexOf(panel.id);
    if (index == -1) {
      app.elem.channels.appendChild(panel.elem.nav);
      app.save_channel_order();
      return;
    }
    var items = app.elem.channels.childNodes;
    for (var i=0; i < items.length; i++) {
      var id = items[i].getAttribute('data-panel-id');
      if (index < app.sorting.indexOf(id)) {
        app.elem.channels.insertBefore(panel.elem.nav, items[i]);
        return;
      }
    }

    app.elem.channels.appendChild(panel.elem.nav);
  };

  app.fill_missed = function(start) {
    app.api.get("/log/" + start, {
      success: function(events) {
        for (var i=0; i < events.length; i++) {
          app.stream.fire('message', events[i]);
        }
      },
      error: function(e) {
        app.reset();
      }
    });
  };

  app.fill_backlog = function(panel, msgid) {
    if (panel.backlog_empty) return;

    var connection = app.connections[panel.connection];
    if (!connection) return;

    panel.set_loading(true);

    var limit = panel.ignore_events ? 150 : 50;
    var name = panel.type == "status" ? "status" : panel.name;
    var parts = [
      "connection", connection.id, "channel", encodeURIComponent(name), "events"
    ];

    if (msgid)
      parts.push(msgid);

    app.api.get("/" + parts.join("/"), {
      data: { limit: limit },
      success: function(events) {
        if (events.length < limit)
          panel.backlog_empty = true;

        var list = [];
        var reactions = [];

        events.forEach( function (e) {
          var message = e.Message;
          message.Id = e.MessageId;
          message.Highlight = e.Highlight;

          if (app.is_reaction(message))
            reactions.push(message);
          else {
            var el = Render(message);
            if (el)
              list.push(el);
          }
        });

        panel.prepend(list);
        app.filling_backlog = false;

        reactions.forEach(function(reaction) {
          var parts = reaction.Params[1].split(" ");
          panel.handle_reaction(reaction.Prefix.Name, parts[1], parts[2]);
        });

        panel.react_backlog_check();
        panel.set_loading(false);

      },
      error: function(e) {
        app.filling_backlog = false;
        panel.set_loading(false);
        console.log(e);
      }
    });
  };

  app.is_reaction = function(message) {
    return message.Command == "PRIVMSG"
    && (message.Params[1] || "").substring(0,5) == "\x01" + "FACE";
  };

  app.prev_panel = function() {
    var items = app.elem.nav.querySelectorAll("li");
    for (var i=items.length - 1; i >= 0; i--) {
      var item = items[i];
      if (item.classList.contains("active") && items[i - 1]) {
        var id = items[i - 1].getAttribute('data-panel-id');
        app.focus_panel(id);
        return;
      }
    }
  };

  app.prev_unread_panel = function() {
    var items = app.elem.nav.querySelectorAll("li");
    for (var i=items.length - 1; i >= 0; i--) {
      var item = items[i];
      if (item.classList.contains("active")) {
        for (var j=i; j > 0; j--) {
          var item = items[j - 1];
          if (item.classList.contains("unread")) {
            var id = item.getAttribute('data-panel-id');
            app.focus_panel(id);
            return;
          }
        }
        return;
      }
    }
  };

  app.next_panel = function() {
    var items = app.elem.nav.querySelectorAll("li");
    for (var i=0; i < items.length; i++) {
      var item = items[i];
      if (item.classList.contains("active") && items[i + 1]) {
        var id = items[i + 1].getAttribute('data-panel-id');
        app.focus_panel(id);
        return;
      }
    }
  }

  app.next_unread_panel = function() {
    var items = app.elem.nav.querySelectorAll("li");
    for (var i=0; i < items.length; i++) {
      var item = items[i];
      if (item.classList.contains("active")) {
        for (var j=i; j < items.length; j++) {
          var item = items[j + 1];
          if (item.classList.contains("unread")) {
            var id = item.getAttribute('data-panel-id');
            app.focus_panel(id);
            return;
          }
        }
        return;
      }
    }
  };

  app.focus_panel = function(id) {
    if (app.focused) {
      if (app.focused.id == id)
        return;
      app.last_panel_id = app.focused.id;
    }

    if (app.elem.switcher.classList.contains('open')) {
      app.hide_switcher();
    }

    var panel = app.panels[id];

    if (! panel)
      return;

    app.elem.panel_name.textContent = panel.name;
    app.replace_child("panel", panel.elem.list);
    app.replace_child("input", panel.elem.input);
    app.replace_child("topic", panel.elem.topic);
    app.replace_child("filler", panel.elem.filler);
    app.replace_child("prefix", panel.elem.prefix);

    app.elem.body.setAttribute("data-panel-type", panel.type);
    app.replace_child("nicks", panel.elem.nicks);

    app.elem.title.textContent = panel.name;

    if (app.focused) {
      app.focused.unfocus();
      app.save_seen(app.focused);
    }

    //app.scroll_to_nav(panel.elem.nav);

    if (panel.first_focus && panel.type == "channel")
      app.show_nicklist_pref(panel);

    panel.focus();
    app.focused = panel;
    window.history.replaceState({}, "", panel.path);
    app.check_scroll();

    if (panel.type == "channel") {
      var conn = app.connections[panel.connection];
      panel.update_nicks(
        conn.nicks(conn.channel(panel.name))
      );
    }
  };

  app.replace_child = function(p, c) {
    p = app.elem[p];
    while (p.firstChild) {
      p.removeChild(p.firstChild);
    }
    p.appendChild(c);
  };

  app.config_modal = function(e, connection) {
    if (e) e.preventDefault();

    var vars = {};

    if (connection) {
      var config = connection.Config;
      vars.Host = config.Host;
      vars.Port = config.Port;
      vars.Ssl = config.Ssl;
      vars.Nick = config.Nick;
      vars.User = config.User;
      vars.Pass = config.Pass;
      vars.Alias = config.Alias;
      vars.Channels = config.Channels.join(", ");
      vars.Highlight = config.Highlight.join(", ");

      vars.action = "/connection/" + connection.Id;
      vars.method = "PUT";
      vars.edit = true;
    }
    else {
      vars.Nick = app.user.user;
      vars.User = app.user.user;
      vars.Highlight = app.user.user;

      if (Object.keys(app.connections).length == 0) {
        vars.Host = "irc.freenode.com";
        vars.Port = "6697";
        vars.Ssl = true;
        vars.Channels = "#lierc";
        vars.Alias = "freenode";
      }

      vars.action = "/connection";
      vars.method = "POST";
      vars.edit = false;
    }

    app.elem.flex_wrap.classList.remove('open');

    var dialog = app.new_dialog("connection", vars);

    var del = dialog.el.querySelector('.delete-connection');
    if (del && connection) {
      del.addEventListener('click', function(e) {
        e.preventDefault();
        app.delete_connection(connection.Id);
        app.close_dialog();
      });
    }

    dialog.el.addEventListener("submit", function(e) {
      e.preventDefault();
      var form = e.target;
      var method = form.getAttribute('method');
      var action = form.getAttribute('action');

      var data = {
        Host: form.querySelector('input[name="Host"]').value,
        Port: parseInt(form.querySelector('input[name="Port"]').value),
        Ssl:  form.querySelector('input[name="Ssl"]').checked,
        Nick: form.querySelector('input[name="Nick"]').value,
        User: form.querySelector('input[name="User"]').value,
        Pass: form.querySelector('input[name="Pass"]').value,
        Alias: form.querySelector('input[name="Alias"]').value,
        Channels: form.querySelector('input[name="Channels"]').value.split(/\s*,\s*/),
        Highlight: form.querySelector('input[name="Highlight"]').value.split(/\s*,\s*/),
      };

      app.api.request(method, action, {
        body: JSON.stringify(data),
        success: function(res) {
          app.close_dialog();
        },
        error: function(e) {
          alert("i'm sorry");
        }
      });
    });
  };

  app.check_scroll = function() {
    if (app.filling_backlog
      || !app.focused
      || app.focused.backlog_empty
      || app.overlayed()
      || !app.connections[app.focused.connection]
      || app.elem.flex_wrap.classList.contains('open')
      || getComputedStyle(app.elem.scroll).display == "none")
    {
      return;
    }

    if (app.elem.scroll.scrollTop == 0) {
      app.filling_backlog = true;
      app.fill_backlog(
        app.focused, app.focused.oldest_message_id()
      );
    }
  };

  setInterval(app.check_scroll, 250);

  app.ping_server = function() {
    app.api.auth(
      function(res) {
        if (res.status == 200)
          return;

        if (res.status == 401) {
          //window.location.reload();
          return;
        }

        console.log(res.status);

        // ping failed, force a reconnect of stream...
        if (res.status == 0) {
          app.stream.close();
          return;
        }

        var data = res.json();
        if (data["error"]) {
          console.log(data["error"]);
        }
      }
    );
  };

  setInterval(app.ping_server, 1000 * 15);

  app.get_prefs = function(cb) {
    app.api.get("/preference", {
      success: function(data) {
        var prefs = {};
        for (var i=0; i < data.length; i++) {
          try {
            prefs[data[i].name] = JSON.parse(data[i].value);
          }
          catch(e) {
            console.log("Unable to parse JSON: ", data[i].value);
          }
        }
        cb(prefs);
      },
      error: function(e) { alert(e); }
    });
  };

  app.get_pref = function(name) {
    return app.prefs[name];
  };

  app.show_nicklist_pref = function(panel) {
    var value = app.get_pref(panel.id + "-show-nicklist");
    if (value != undefined)
      panel.set_show_nicklist(value);
  };

  app.ignore_events_pref = function(panel) {
    var value = app.get_pref(panel.id + "-ignore-events");
    if (value !== undefined)
      panel.set_ignore_events(value);
  };

  app.collapse_embeds_pref = function(panel) {
    var value = app.get_pref(panel.id + "-collapse-embeds");
    if (value !== undefined)
      panel.set_collapse_embeds(value);
  };

  app.monospace_nicks_pref = function(panel) {
    var value = app.get_pref(panel.id + '-monospace-nicks');
    if (value !== undefined)
      panel.monospace_nicks = value;
  };

  app.add_monospace_nick = function(panel, nick) {
    panel.add_monospace_nick(nick);
    app.update_pref(panel.id + "-monospace-nicks", panel.monospace_nicks);
  };

  app.remove_monospace_nick = function(panel, nick) {
    panel.remove_monospace_nick(nick);
    app.update_pref(panel.id + "-monospace-nicks", panel.monospace_nicks);
  };

  app.update_pref = function(name, value) {
    app.prefs[name] = value;
    app.api.post("/preference/" + encodeURIComponent(name), {
      body: JSON.stringify(value),
    });
  };

  app.load_token = function(cb) {
    app.api.get("/token", {
      success: function(data) {
        app.post_tokens.push(data.token);
        if (data.extra) {
          app.post_tokens = app.post_tokens.concat(data.extra);
        }
        if (cb) cb();
      },
      error: function(e) {
        if (cb) cb();
      }
    });
  };

  app.load_seen = function(cb) {
    app.api.get("/seen", {
      success: function(res) {
        for (i in res) {
          var id = panel_id(res[i]["channel"], res[i]["connection"]);
          app.last_seen[id] = res[i]["message_id"];
        }
        cb();
      },
      error: function(e) {
        cb();
      }
    });
  };

  app.save_seen = function(panel, force) {
    var diffs = 0;
    var id = panel.id;
    var last_seen = panel.last_seen;
    var send = last_seen && last_seen != app.last_seen[id];

    if (send || force) {
      var parts = [
        "connection", panel.connection,
        "channel", encodeURIComponent(panel.name), "seen"
      ];

      app.api.post("/" + parts.join("/"), {
        body: "" + last_seen
      });

      app.last_seen[id] = last_seen;
    }
  };

  app.sync_missed = function() {
    if (app.focused) {
      app.focused.update_seen();
      if (app.focused.last_seen)
        app.last_seen[app.focused.id] = app.focused.last_seen;
    }

    app.api.get("/missed", {
      data: app.last_seen,
      success: function(res) {
        app.missed = {};
        for (connection in res) {
          for (channel in res[connection]) {
            var id = panel_id(channel, connection);
            if (app.panels[id]) {
              app.apply_missed(app.panels[id], res[connection][channel]);
            }
            else {
              app.missed[id] = res[connection][channel];
            }
          }
        }
      }
    });
  };

  app.search_panel = function(panel, text) {
    var parts = [ "connection", panel.connection
      , "channel", encodeURIComponent(panel.name), "last" ];

    app.api.get("/" + parts.join("/"), {
      data: { query: text, limit: 10 },
      success: function(messages) {
        if (messages.length > 0) {
          panel.scroll(function() {
            var line = document.createElement('DIV');
            line.classList.add('search-start');
            panel.elem.list.appendChild(line);
          });
        }

        for (var i=messages.length - 1; i >= 0; i--) {
          var msg = messages[i].Message;
          msg.Search = true;
          panel.append(Render(msg));
        }
      }
    });
  };

  app.get_prefs(function(prefs) {
    app.prefs = prefs;
    app.sorting = app.prefs['sorting'] || [];
    delete app.prefs['sorting'];

    if (app.prefs['email'] === true) {
      document.getElementById('email-notify')
        .classList.add('enabled');
    }

    app.load_seen(function() {
      app.load_token(function() {
        app.init();
        Emoji.load();
      });
    });
  });

  app.update_email_pref = function(disabled) {

  };

  app.focus_input = function(force) {
    if (force) {
      app.focused.elem.input.focus();
      return;
    }

    if (app.mobile)
      return;
    if (!app.focused)
      return;
    if (app.overlayed())
      return;
    app.focused.elem.input.focus();
  };

  app.hide_switcher = function() {
    app.elem.switcher.classList.remove('open');
    app.elem.nav.classList.remove('filtering');
    app.elem.nav.querySelectorAll('li').forEach(function(li) {
      li.classList.remove('match', 'selected', 'candidate');
    });
  };

  app.toggle_switcher = function() {
    app.elem.switcher.querySelector('input').value = '';
    if (app.elem.switcher.classList.contains('open')) {
      app.hide_switcher();
    }
    else {
      app.elem.switcher.classList.add('open');
      app.elem.nav.classList.add('filtering');
      app.elem.nav.querySelectorAll('#channels li[data-name], #privates li[data-name]').forEach(function(li) {
        li.classList.add('candidate', 'match');
      });
      var matches = app.elem.nav.querySelectorAll('li[data-name].candidate');
      if (matches.length) {
        matches[0].classList.add('selected');
      }
      app.elem.switcher.querySelector('input').focus();
    }
  };

  app.save_channel_order = function() {
    var order = Array.prototype.map.call(
      app.elem.channels.querySelectorAll('li'),
      function(li) {
        return li.getAttribute('data-panel-id');
      });

    app.sorting = order;
    app.update_pref("sorting", order);
  };

  app.overlayed = function() {
    return app.dialog && app.dialog.open;
  };

  app.close_dialog = function() {
    if (app.dialog)
      app.dialog.close();
    app.dialog = null;
  };

  app.new_dialog = function(name, vars) {
    if (app.dialog)
      app.dialog.close();

    var dialog = new Dialog(name, vars);
    app.elem.flex_wrap.classList.remove('open');
    dialog.append(app.elem.body);
    var input = dialog.el.querySelector('input[type=text]')
    if (!app.mobile && input) {
      input.focus();
      input.select();
    }
    app.dialog = dialog;
    return dialog;
  };

  app.reset = function() {
    var path = app.focused ? app.focused.path : "";

    for (id in app.panels) {
      app.remove_panel(id);
    }

    window.history.replaceState({}, "", path);
    app.default_focused = false;
    app.connections = [];
    app.last_seen = {};
    app.missed = {};
    app.focused = null;

    app.load_seen(function() {
      app.load_token(function() {
        app.init();
      });
    });
  };

  function detect_mobile () {
    return (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) return true; return false;})(navigator.userAgent||navigator.vendor||window.opera);
  };

  var events = new UIEvents(app);
};
