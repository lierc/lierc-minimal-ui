if (!("forEach" in NodeList)) {
  NodeList.prototype.forEach = Array.prototype.forEach;
}

var Lierc = function(url, user) {
  var lierc = this;

  lierc.user = user;
  lierc.api = new API(url);
  lierc.commands = new Commands(lierc);
  lierc.stream;
  lierc.connections = {};
  lierc.filling_backlog = false;
  lierc.dialog = null;
  lierc.sorting = [];
  lierc.last_seen = {};
  lierc.missed = {};
  lierc.panels = {};
  lierc.focused = null;
  lierc.last_panel_id = null;
  lierc.window_focused = true;
  lierc.default_panel = null;
  lierc.default_focused = false;
  lierc.prefs = {};
  lierc.touchstart = "ontouchstart" in document.documentElement;
  lierc.mobile = detect_mobile();
  lierc.post_tokens = [];

  lierc.elem = {
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

  if (!lierc.mobile) {
    document.querySelectorAll('.sortable').forEach(function(el) {
      Sortable.create(el, {
        delay: 0,
        onSort: function(e) {
          lierc.save_channel_order();
        }
      });
    });
  }

  function panel_id(name, connection) {
    return [connection, name.toLowerCase()].join("-");
  }

  lierc.set_connected = function(conn_id, status, message) {
    var connection = lierc.connections[conn_id];
    connection.connected = status;

    for (id in lierc.panels) {
      var panel = lierc.panels[id];
      if (panel.connection == conn_id) {
        panel.set_connected(status, message);
      }
    }
  };

  lierc.setup_connection = function(id, host, nick) {
    if (lierc.connections[id])
      return;

    var connection = new Connection(id, host);
    lierc.connections[id] = connection;

    var panel = lierc.add_panel("status", connection.id);
    panel.change_name(host);
    panel.update_topic({value: "status."});

    connection.on("channel:new", function(conn, channel, message) {
      lierc.add_panel(channel, conn, ("Id" in message));
    });

    connection.on("private:msg", function(conn, nick, message) {
      var panel = lierc.add_panel(nick, conn, false);
      var connection = lierc.connections[conn];
      var from = message.Prefix.Name != connection.nick;

      panel.append(Render(message));

      if (from && (!lierc.is_focused(panel) || !panel.is_scrolled()))
        lierc.elem.audio.play();
    });

    connection.on("channel:msg", function(conn, channel, message) {
      var panel = lierc.get_panel(channel, conn);
      var html = Render(message);
      if (html) {
        panel.append(html);

        if (message.Highlight && (!lierc.is_focused(panel) || !panel.is_scrolled()))
          lierc.elem.audio.play();
      }
    });

    connection.on("channel:react", function(conn, channel, message) {
      var panel = lierc.get_panel(channel, conn);
      var parts = message.Params[1].split(" ");
      panel.handle_reaction(message.Prefix.Name, parts[1], parts[2]);
    });

    connection.on("private:react", function(conn, nick, message) {
      var panel = lierc.get_panel(nick, conn);
      var parts = message.Params[1].split(" ");
      panel.handle_reaction(message.Prefix.Name, parts[1], parts[2]);
    });

    connection.on("channel:nicks", function(conn, channel, nicks) {
      var panel = lierc.get_panel(channel, conn);
      if (panel.focused)
        panel.update_nicks(nicks);
    });

    connection.on("channel:mode", function(conn, channel, mode) {
      var panel = lierc.get_panel(channel, conn);
      panel.update_mode(mode);
    });

    connection.on("channel:close", function(conn, channel) {
      lierc.remove_panel(panel_id(channel, conn));
    });

    connection.on("status:raw", function(conn, message) {
      var panel = lierc.get_panel("status", conn);
      panel.append(Render(message, true));
    });

    connection.on("status", function(conn, message) {
      var panel = lierc.get_panel("status", conn);
      panel.append(Render(message));
    });

    connection.on("connect", function(conn, message) {
      lierc.set_connected(conn, true, message.Params[0]);
    });

    connection.on("disconnect", function(conn, message) {
      lierc.set_connected(conn, false, message.Params[0]);
    });

    connection.on("channel:topic", function(conn, channel, topic) {
      var panel = lierc.get_panel(channel, conn);
      panel.update_topic(topic);
    });
  };

  lierc.is_focused = function(panel) {
    return lierc.window_focused && lierc.focused && lierc.focused.id == panel.id;
  };

  lierc.find_default_panel = function() {
    var parts = window.location.hash.split("/").slice(1);
    if (parts.length == 2) {
      return panel_id(decodeURIComponent(parts[1]), parts[0]);
    }
    else if (lierc.sorting.length) {
      return lierc.sorting[0];
    }
    return null;
  };

  lierc.init = function() {
    lierc.default_panel = lierc.find_default_panel();
    lierc.api.get('/connection', {
      success: function(configs) {
        if (!configs.length)
          lierc.config_modal();

        configs.forEach(function(conn) {
          var conn_id   = conn.Id;
          var host = conn.Config.Alias || conn.Config.Host;
          var nick = conn.Nick;
          lierc.setup_connection(conn_id, host, nick);
        });

        if (lierc.stream)
          lierc.stream.destroy();

        lierc.connect();
      }
    });
  };

  lierc.add_recent_privates = function() {
    lierc.api.get("/privates", {
      success: function(privates) {
        privates.forEach(function(priv) {
          lierc.add_panel(priv.nick, priv.connection, false);
        });
      }
    });;
  };

  lierc.connect = function() {
    var stream = lierc.api.stream();

    stream.on('message', function(e) {
      var conn_id = e.ConnectionId;
      var message = e.Message;

      if (e.MessageId)
        message.Id =  e.MessageId;
      message.Highlight = e.Highlight;

      if (lierc.connections[conn_id]) {
        lierc.connections[conn_id].on_message(message);
      }
    });

    stream.on('create_connection', function(e) {
      var conn_id = e.ConnectionId;
      var message = e.Message;
      var nick    = message.Params[0];
      var host    = message.Params[1];
      lierc.setup_connection(conn_id, host, nick);
    });

    stream.on('delete_connection', function(e) {
      var conn_id = e.ConnectionId;

      for (id in lierc.panels) {
        var panel = lierc.panels[id];
        if (panel.connection == conn_id) {
          lierc.remove_panel(id);
        }
      }

      delete lierc.connections[conn_id];
    });

    stream.on('close', function(e) {
      for (id in lierc.panels) {
        lierc.panels[id].set_disabled(true);
      }
      if (lierc.focused) {
        lierc.focused.scroll(function() {
          lierc.elem.body.classList.add('disconnected');
        });
      }
      else {
        lierc.elem.body.classList.add('disconnected');
      }
    });

    stream.on('reconnect-status', function(text) {
      if (lierc.focused) {
        lierc.focused.scroll(function() {
          lierc.elem.reconnect.textContent = text;
        });
      }
      else {
        lierc.elem.reconnect.textContent = text;
      }
    });

    stream.on('open', function(e) {
      lierc.elem.body.classList.remove('disconnected');
      if (lierc.focused) {
        if (stream.last_id) {
          lierc.fill_missed(stream.last_id);
        }
      }

      for (var id in lierc.panels) {
        lierc.panels[id].set_disabled(false);
        if (!lierc.focused || id != lierc.focused.id) {
          lierc.panels[id].clear_lists();
        }
      }
    });

    lierc.sync_missed();
    lierc.add_recent_privates();
    lierc.stream = stream;
  };

  lierc.get_panel = function(name, connection) {
    var id = panel_id(name, connection);
    return lierc.panels[id];
  };

  lierc.close_panel = function(id) {
    var panel = lierc.panels[id];
    if (panel.type == "private") {
      var path = "/connection/" + panel.connection + "/nick/" + encodeURIComponent(panel.name);
      lierc.api.delete(path);
    }
    lierc.remove_panel(id);
  };

  lierc.remove_panel = function(id) {
    if (!lierc.panels[id])
      return;

    var focused = id == lierc.focused.id;
    lierc.panels[id].remove_elems();
    delete lierc.panels[id];

    if (focused) {
      if (lierc.last_panel_id && lierc.panels[lierc.last_panel_id])
        lierc.focus_panel(lierc.last_panel_id);
      else if (Object.keys(lierc.panels).length)
        lierc.focus_panel(Object.keys(lierc.panels)[0]);
      else
        lierc.focused = null;
    }

    lierc.update_nav_counts();
  };

  lierc.update_nav_counts = function() {
    lierc.elem.status
      .previousSibling.previousSibling
      .querySelector('.count')
      .textContent = lierc.elem.status.querySelectorAll("li").length

    lierc.elem.privates
      .previousSibling.previousSibling
      .querySelector(".count")
      .textContent = lierc.elem.privates.querySelectorAll("li").length;

    lierc.elem.channels
      .previousSibling.previousSibling
      .querySelector(".count")
      .textContent = lierc.elem.channels.querySelectorAll("li").length;
  };

  lierc.add_panel = function(name, connection, focus) {
    var id = panel_id(name, connection);

    if (lierc.panels[id])
      return lierc.panels[id];

    if (!lierc.connections[connection]) {
      console.log("Connection does not exist", connection);
      throw "Connection does not exist";
    }

    var conn = lierc.connections[connection];
    var panel = new Panel(name, id, conn, lierc.mobile);
    if (lierc.last_seen[panel.id])
      panel.last_seen = lierc.last_seen[panel.id];
    panel.update_nav();

    if (panel.type == "channel") {
      var channel = conn.channel(panel.name);
      panel.editor.completion.completions = channel.nicks;
    }

    lierc.panels[id] = panel;

    if (panel.type == "status")
      lierc.elem.status.append(panel.elem.nav);
    else if (panel.type == "private")
      lierc.elem.privates.append(panel.elem.nav);
    else
      lierc.insert_sorted_nav(panel);

    lierc.update_nav_counts();

    if (panel.type == "channel")
      lierc.ignore_events_pref(panel);

    lierc.collapse_embeds_pref(panel);
    lierc.monospace_nicks_pref(panel);

    panel.elem.nav.addEventListener('click', function(e) {
      e.preventDefault();

      lierc.elem.flex_wrap.classList.remove("open");

      var id = this.getAttribute('data-panel-id');
      var panel = lierc.panels[id];

      if (e.target.classList.contains('close-panel')) {
        if (panel.type == "channel")
          lierc.part_channel(panel.name, panel.connection);
        else if (panel.type == "status")
          lierc.delete_connection(panel.connection);
        else
          lierc.close_panel(id);
      }
      else if (e.target.classList.contains('edit-panel')) {
        lierc.api.get("/connection/" + panel.connection, {
          success: function(res) {
            lierc.config_modal(null, res);
          },
          error: function(e) {
            alert(e);
          }
        });
      }
      else {
        lierc.focus_panel(id);
      }
    });

    // force focusing or no focused panel
    if (focus === true || !lierc.focused) {
      lierc.focus_panel(id);
    }
    // this channel was in the URL on load
    else if (lierc.default_panel && id == lierc.default_panel) {
      lierc.default_panel = null;
      lierc.default_focused = true;
      lierc.focus_panel(id);
    }
    // focus the first channel added
    else if (!lierc.default_focused && panel.type == "channel" && lierc.channel_panels() == 1) {
      lierc.focus_panel(id);
    }

    if (!panel.focused && lierc.missed[panel.id])
      lierc.apply_missed(panel, lierc.missed[panel.id]);

    delete lierc.missed[panel.id];

    return lierc.panels[id];
  };

  lierc.apply_missed = function(panel, missed) {
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

  lierc.post_token = function() {
    var token = lierc.post_tokens.pop();
    if (!token) {
      alert("No post tokens, tell Lee!");
      throw Error("No tokens");
    }
    return token;
  };

  lierc.part_channel = function(name, connection) {
    if (!confirm("Are you sure you want to leave " + name + "?"))
      return;

    var headers = new Headers();
    headers.append('lierc-token', lierc.post_token());
    headers.append('content-type', 'application/irc');

    lierc.api.post('/connection/' + connection, {
      body: 'PART ' + name,
      headers: headers,
      success: function(res) {
        lierc.remove_panel(panel_id(name, connection));
        lierc.post_tokens.push(res.token);
      },
      error: function(e) {
        alert("Error: " + e);
        lierc.load_token();
      }
    });
  };

  lierc.delete_connection = function(connection) {
    if (!confirm("Are you sure you want to remove this connection?"))
      return;
    lierc.api.delete('/connection/' + connection, {
      error: function(e) { alert(e); }
    });
  };

  lierc.channel_panels = function() {
    var panels = 0
    for (id in lierc.panels) {
      if (lierc.panels[id].type == "channel")
        panels++;
    }
    return panels;
  };

  lierc.insert_sorted_nav = function(panel) {
    var index = lierc.sorting.indexOf(panel.id);
    if (index == -1) {
      lierc.elem.channels.appendChild(panel.elem.nav);
      lierc.save_channel_order();
      return;
    }
    var items = lierc.elem.channels.childNodes;
    for (var i=0; i < items.length; i++) {
      var id = items[i].getAttribute('data-panel-id');
      if (index < lierc.sorting.indexOf(id)) {
        lierc.elem.channels.insertBefore(panel.elem.nav, items[i]);
        return;
      }
    }

    lierc.elem.channels.appendChild(panel.elem.nav);
  };

  lierc.fill_missed = function(start) {
    lierc.api.get("/log/" + start, {
      success: function(events) {
        for (var i=0; i < events.length; i++) {
          lierc.stream.fire('message', events[i]);
        }
      },
      error: function(e) {
        lierc.reset();
      }
    });
  };

  lierc.fill_backlog = function(panel, msgid) {
    if (panel.backlog_empty) return;

    var connection = lierc.connections[panel.connection];
    if (!connection) return;

    panel.set_loading(true);

    var limit = panel.ignore_events ? 150 : 50;
    var name = panel.type == "status" ? "status" : panel.name;
    var parts = [
      "connection", connection.id, "channel", encodeURIComponent(name), "events"
    ];

    if (msgid)
      parts.push(msgid);

    lierc.api.get("/" + parts.join("/"), {
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

          if (lierc.is_reaction(message))
            reactions.push(message);
          else {
            var el = Render(message);
            if (el)
              list.push(el);
          }
        });

        panel.prepend(list);
        lierc.filling_backlog = false;

        reactions.forEach(function(reaction) {
          var parts = reaction.Params[1].split(" ");
          panel.handle_reaction(reaction.Prefix.Name, parts[1], parts[2]);
        });

        panel.react_backlog_check();
        panel.set_loading(false);

      },
      error: function(e) {
        lierc.filling_backlog = false;
        panel.set_loading(false);
        console.log(e);
      }
    });
  };

  lierc.is_reaction = function(message) {
    return message.Command == "PRIVMSG"
    && (message.Params[1] || "").substring(0,5) == "\x01" + "FACE";
  };

  lierc.prev_panel = function() {
    var items = lierc.elem.nav.querySelectorAll("li");
    for (var i=items.length - 1; i >= 0; i--) {
      var item = items[i];
      if (item.classList.contains("active") && items[i - 1]) {
        var id = items[i - 1].getAttribute('data-panel-id');
        lierc.focus_panel(id);
        return;
      }
    }
  };

  lierc.prev_unread_panel = function() {
    var items = lierc.elem.nav.querySelectorAll("li");
    for (var i=items.length - 1; i >= 0; i--) {
      var item = items[i];
      if (item.classList.contains("active")) {
        for (var j=i; j > 0; j--) {
          var item = items[j - 1];
          if (item.classList.contains("unread")) {
            var id = item.getAttribute('data-panel-id');
            lierc.focus_panel(id);
            return;
          }
        }
        return;
      }
    }
  };

  lierc.next_panel = function() {
    var items = lierc.elem.nav.querySelectorAll("li");
    for (var i=0; i < items.length; i++) {
      var item = items[i];
      if (item.classList.contains("active") && items[i + 1]) {
        var id = items[i + 1].getAttribute('data-panel-id');
        lierc.focus_panel(id);
        return;
      }
    }
  }

  lierc.next_unread_panel = function() {
    var items = lierc.elem.nav.querySelectorAll("li");
    for (var i=0; i < items.length; i++) {
      var item = items[i];
      if (item.classList.contains("active")) {
        for (var j=i; j < items.length; j++) {
          var item = items[j + 1];
          if (item.classList.contains("unread")) {
            var id = item.getAttribute('data-panel-id');
            lierc.focus_panel(id);
            return;
          }
        }
        return;
      }
    }
  };

  lierc.focus_panel = function(id) {
    if (lierc.focused) {
      if (lierc.focused.id == id)
        return;
      lierc.last_panel_id = lierc.focused.id;
    }

    if (lierc.elem.switcher.classList.contains('open')) {
      lierc.hide_switcher();
    }

    var panel = lierc.panels[id];

    if (! panel)
      return;

    lierc.elem.panel_name.textContent = panel.name;
    lierc.replace_child("panel", panel.elem.list);
    lierc.replace_child("input", panel.elem.input);
    lierc.replace_child("topic", panel.elem.topic);
    lierc.replace_child("filler", panel.elem.filler);
    lierc.replace_child("prefix", panel.elem.prefix);

    lierc.elem.body.setAttribute("data-panel-type", panel.type);
    lierc.replace_child("nicks", panel.elem.nicks);

    lierc.elem.title.textContent = panel.name;

    if (lierc.focused) {
      lierc.focused.unfocus();
      lierc.save_seen(lierc.focused);
    }

    //lierc.scroll_to_nav(panel.elem.nav);

    if (panel.first_focus && panel.type == "channel")
      lierc.show_nicklist_pref(panel);

    panel.focus();
    lierc.focused = panel;
    window.history.replaceState({}, "", panel.path);
    lierc.check_scroll();

    if (panel.type == "channel") {
      var conn = lierc.connections[panel.connection];
      panel.update_nicks(
        conn.nicks(conn.channel(panel.name))
      );
    }
  };

  lierc.replace_child = function(p, c) {
    p = lierc.elem[p];
    while (p.firstChild) {
      p.removeChild(p.firstChild);
    }
    p.appendChild(c);
  };

  lierc.config_modal = function(e, connection) {
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
      vars.Nick = lierc.user.user;
      vars.User = lierc.user.user;
      vars.Highlight = lierc.user.user;

      if (Object.keys(lierc.connections).length == 0) {
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

    lierc.elem.flex_wrap.classList.remove('open');

    var dialog = lierc.new_dialog("connection", vars);

    var del = dialog.el.querySelector('.delete-connection');
    if (del && connection) {
      del.addEventListener('click', function(e) {
        e.preventDefault();
        lierc.delete_connection(connection.Id);
        lierc.close_dialog();
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

      lierc.api.request(method, action, {
        body: JSON.stringify(data),
        success: function(res) {
          lierc.close_dialog();
        },
        error: function(e) {
          alert("i'm sorry");
        }
      });
    });
  };

  lierc.check_scroll = function() {
    if (lierc.filling_backlog
      || !lierc.focused
      || lierc.focused.backlog_empty
      || lierc.overlayed()
      || !lierc.connections[lierc.focused.connection]
      || lierc.elem.flex_wrap.classList.contains('open')
      || getComputedStyle(lierc.elem.scroll).display == "none")
    {
      return;
    }

    if (lierc.elem.scroll.scrollTop <= 150) {
      lierc.filling_backlog = true;
      lierc.fill_backlog(
        lierc.focused, lierc.focused.oldest_message_id()
      );
    }
  };

  setInterval(lierc.check_scroll, 250);

  lierc.ping_server = function() {
    lierc.api.auth(
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
          lierc.stream.close();
          return;
        }

        var data = res.json();
        if (data["error"]) {
          console.log(data["error"]);
        }
      }
    );
  };

  setInterval(lierc.ping_server, 1000 * 15);

  lierc.get_prefs = function(cb) {
    lierc.api.get("/preference", {
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

  lierc.get_pref = function(name) {
    return lierc.prefs[name];
  };

  lierc.show_nicklist_pref = function(panel) {
    var value = lierc.get_pref(panel.id + "-show-nicklist");
    if (value != undefined)
      panel.set_show_nicklist(value);
  };

  lierc.ignore_events_pref = function(panel) {
    var value = lierc.get_pref(panel.id + "-ignore-events");
    if (value !== undefined)
      panel.set_ignore_events(value);
  };

  lierc.collapse_embeds_pref = function(panel) {
    var value = lierc.get_pref(panel.id + "-collapse-embeds");
    if (value !== undefined)
      panel.set_collapse_embeds(value);
  };

  lierc.monospace_nicks_pref = function(panel) {
    var value = lierc.get_pref(panel.id + '-monospace-nicks');
    if (value !== undefined)
      panel.monospace_nicks = value;
  };

  lierc.add_monospace_nick = function(panel, nick) {
    panel.add_monospace_nick(nick);
    lierc.update_pref(panel.id + "-monospace-nicks", panel.monospace_nicks);
  };

  lierc.remove_monospace_nick = function(panel, nick) {
    panel.remove_monospace_nick(nick);
    lierc.update_pref(panel.id + "-monospace-nicks", panel.monospace_nicks);
  };

  lierc.update_pref = function(name, value) {
    lierc.prefs[name] = value;
    lierc.api.post("/preference/" + encodeURIComponent(name), {
      body: JSON.stringify(value),
    });
  };

  lierc.load_token = function(cb) {
    lierc.api.get("/token", {
      success: function(data) {
        lierc.post_tokens.push(data.token);
        if (data.extra) {
          lierc.post_tokens = lierc.post_tokens.concat(data.extra);
        }
        if (cb) cb();
      },
      error: function(e) {
        if (cb) cb();
      }
    });
  };

  lierc.load_seen = function(cb) {
    lierc.api.get("/seen", {
      success: function(res) {
        for (i in res) {
          var id = panel_id(res[i]["channel"], res[i]["connection"]);
          lierc.last_seen[id] = res[i]["message_id"];
        }
        cb();
      },
      error: function(e) {
        cb();
      }
    });
  };

  lierc.save_seen = function(panel, force) {
    var diffs = 0;
    var id = panel.id;
    var last_seen = panel.last_seen;
    var send = last_seen && last_seen != lierc.last_seen[id];

    if (send || force) {
      var parts = [
        "connection", panel.connection,
        "channel", encodeURIComponent(panel.name), "seen"
      ];

      lierc.api.post("/" + parts.join("/"), {
        body: "" + last_seen
      });

      lierc.last_seen[id] = last_seen;
    }
  };

  lierc.sync_missed = function() {
    if (lierc.focused) {
      lierc.focused.update_seen();
      if (lierc.focused.last_seen)
        lierc.last_seen[lierc.focused.id] = lierc.focused.last_seen;
    }

    lierc.api.get("/missed", {
      data: lierc.last_seen,
      success: function(res) {
        lierc.missed = {};
        for (connection in res) {
          for (channel in res[connection]) {
            var id = panel_id(channel, connection);
            if (lierc.panels[id]) {
              lierc.apply_missed(lierc.panels[id], res[connection][channel]);
            }
            else {
              lierc.missed[id] = res[connection][channel];
            }
          }
        }
      }
    });
  };

  lierc.search_panel = function(panel, text) {
    var parts = [ "connection", panel.connection
      , "channel", encodeURIComponent(panel.name), "last" ];

    lierc.api.get("/" + parts.join("/"), {
      data: { query: text, limit: 10 },
      success: function(messages) {
        if (messages.length > 0) {
          var line = document.createElement('DIV');
          line.classList.add('search-start');
          var scrolled = panel.is_scrolled();
          panel.elem.list.appendChild(line);
          if (scrolled)
            panel.scroll();
        }

        for (var i=messages.length - 1; i >= 0; i--) {
          var msg = messages[i].Message;
          msg.Search = true;
          panel.append(Render(msg));
        }
      }
    });
  };

  lierc.get_prefs(function(prefs) {
    lierc.prefs = prefs;
    lierc.sorting = lierc.prefs['sorting'] || [];
    delete lierc.prefs['sorting'];

    if (lierc.prefs['email'] === true) {
      document.getElementById('email-notify')
        .classList.add('enabled');
    }

    lierc.load_seen(function() {
      lierc.load_token(function() {
        lierc.init();
      });
    });
  });

  lierc.update_email_pref = function(disabled) {

  };

  lierc.focus_input = function(force) {
    if (force) {
      lierc.focused.elem.input.focus();
      return;
    }

    if (lierc.mobile)
      return;
    if (!lierc.focused)
      return;
    if (lierc.overlayed())
      return;
    lierc.focused.elem.input.focus();
  };

  lierc.hide_switcher = function() {
    lierc.elem.switcher.classList.remove('open');
    lierc.elem.nav.classList.remove('filtering');
    lierc.elem.nav.querySelectorAll('li').forEach(function(li) {
      li.classList.remove('match', 'selected', 'candidate');
    });
  };

  lierc.toggle_switcher = function() {
    lierc.elem.switcher.querySelector('input').value = '';
    if (lierc.elem.switcher.classList.contains('open')) {
      lierc.hide_switcher();
    }
    else {
      lierc.elem.switcher.classList.add('open');
      lierc.elem.nav.classList.add('filtering');
      lierc.elem.nav.querySelectorAll('#channels li[data-name], #privates li[data-name]').forEach(function(li) {
        li.classList.add('candidate', 'match');
      });
      var matches = lierc.elem.nav.querySelectorAll('li[data-name].candidate');
      if (matches.length) {
        matches[0].classList.add('selected');
      }
      lierc.elem.switcher.querySelector('input').focus();
    }
  };

  lierc.save_channel_order = function() {
    var order = Array.prototype.map.call(
      lierc.elem.channels.querySelectorAll('li'),
      function(li) {
        return li.getAttribute('data-panel-id');
      });

    lierc.sorting = order;
    lierc.update_pref("sorting", order);
  };

  lierc.overlayed = function() {
    return lierc.dialog && lierc.dialog.open;
  };

  lierc.close_dialog = function() {
    if (lierc.dialog)
      lierc.dialog.close();
    lierc.dialog = null;
  };

  lierc.new_dialog = function(name, vars) {
    if (lierc.dialog)
      lierc.dialog.close();

    var dialog = new Dialog(name, vars);
    lierc.elem.flex_wrap.classList.remove('open');
    dialog.append(lierc.elem.body);
    var input = dialog.el.querySelector('input[type=text]')
    if (!lierc.mobile && input) {
      input.focus();
      input.select();
    }
    lierc.dialog = dialog;
    return dialog;
  };

  lierc.reset = function() {
    var path = lierc.focused ? lierc.focused.path : "";

    for (id in lierc.panels) {
      lierc.remove_panel(id);
    }

    window.history.replaceState({}, "", path);
    lierc.default_focused = false;
    lierc.connections = [];
    lierc.last_seen = {};
    lierc.missed = {};
    lierc.focused = null;

    lierc.load_seen(function() {
      lierc.load_token(function() {
        lierc.init();
      });
    });
  };

  lierc.template = function(name, vars) {
    return Handlebars.templates[name](vars);
  };

  function detect_mobile () {
    return (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) return true; return false;})(navigator.userAgent||navigator.vendor||window.opera);
  };

  var events = new UIEvents(lierc);
  Emoji.load();
};
