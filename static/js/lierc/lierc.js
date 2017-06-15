var Liercd = function(url, user) {
  var liercd = this;

  liercd.user = user;
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
  liercd.default_panel = null;
  liercd.default_focused = false;
  liercd.prefs = {};
  liercd.touchstart = "ontouchstart" in document.documentElement;
  liercd.mobile = detect_mobile();
  liercd.post_tokens = [];

  liercd.elem = {
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

  if (!liercd.mobile) {
    document.querySelectorAll('.sortable').forEach(function(el) {
      Sortable.create(el, {
        delay: 0,
        onSort: function(e) {
          liercd.save_channel_order();
        }
      });
    });
  }

  function panel_id(name, connection) {
    return [connection, name.toLowerCase()].join("-");
  }

  liercd.set_connected = function(conn_id, status, message) {
    var connection = liercd.connections[conn_id];
    connection.connected = status;

    for (id in liercd.panels) {
      var panel = liercd.panels[id];
      if (panel.connection == conn_id) {
        panel.set_connected(status, message);
      }
    }
  };

  liercd.setup_connection = function(id, host, nick) {
    if (liercd.connections[id])
      return;

    var connection = new Connection(id, host);
    liercd.connections[id] = connection;

    var panel = liercd.add_panel("status", connection.id);
    panel.change_name(host);
    panel.update_topic({value: "status."});

    connection.on("channel:new", function(conn, channel, message) {
      liercd.add_panel(channel, conn, ("Id" in message));
    });

    connection.on("private:msg", function(conn, nick, message) {
      var panel = liercd.add_panel(nick, conn, false);
      var connection = liercd.connections[conn];
      var from = message.Prefix.Name != connection.nick;

      panel.append(Render(message));

      if (from && (!liercd.is_focused(panel) || !panel.is_scrolled()))
        liercd.elem.audio.play();
    });

    connection.on("channel:msg", function(conn, channel, message) {
      var panel = liercd.get_panel(channel, conn);
      var html = Render(message);
      if (html) {
        panel.append(html);

        if (message.Highlight && (!liercd.is_focused(panel) || !panel.is_scrolled()))
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
      if (panel.focused)
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

    connection.on("connect", function(conn, message) {
      liercd.set_connected(conn, true, message.Params[0]);
    });

    connection.on("disconnect", function(conn, message) {
      liercd.set_connected(conn, false, message.Params[0]);
    });

    connection.on("channel:topic", function(conn, channel, topic) {
      var panel = liercd.get_panel(channel, conn);
      panel.update_topic(topic);
    });
  };

  liercd.is_focused = function(panel) {
    return liercd.window_focused && liercd.focused && liercd.focused.id == panel.id;
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
    fetch(liercd.baseurl + '/connection', {
        credentials: 'same-origin'
      }).then(function(res) {
        return res.json();
      }).then(function(configs) {
        if (!configs.length)
          liercd.config_modal();

        configs.forEach(function(conn) {
          var conn_id   = conn.Id;
          var host = conn.Config.Host;
          var nick = conn.Nick;
          liercd.setup_connection(conn_id, host, nick);
        });

        if (liercd.stream)
          liercd.stream.destroy();

        liercd.connect();
      });
  };

  liercd.add_recent_privates = function() {
    fetch(liercd.baseurl + '/privates', {
        credentials: 'same-origin'
      }).then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).then(function(privates) {
        privates.forEach(function(priv) {
          liercd.add_panel(priv.nick, priv.connection, false);
        });
      }).catch(function(e) {
        console.log(e);
      });;
  };

  liercd.connect = function() {
    var stream = new Stream(liercd.baseurl);

    stream.on('message', function(e) {
      var conn_id = e.ConnectionId;
      var message = e.Message;

      if (e.MessageId)
        message.Id =  e.MessageId;
      message.Highlight = e.Highlight;

      if (liercd.connections[conn_id]) {
        liercd.connections[conn_id].on_message(message);
      }
    });

    stream.on('create_connection', function(e) {
      var conn_id = e.ConnectionId;
      var message = e.Message;
      var nick    = message.Params[0];
      var host    = message.Params[1];
      liercd.setup_connection(conn_id, host, nick);
    });

    stream.on('delete_connection', function(e) {
      var conn_id = e.ConnectionId;

      for (id in liercd.panels) {
        var panel = liercd.panels[id];
        if (panel.connection == conn_id) {
          liercd.remove_panel(id);
        }
      }

      delete liercd.connections[conn_id];
    });

    stream.on('close', function(e) {
      for (id in liercd.panels) {
        liercd.panels[id].set_disabled(true);
      }
      if (liercd.focused) {
        liercd.focused.scroll(function() {
          liercd.elem.body.classList.add('disconnected');
        });
      }
      else {
        liercd.elem.body.classList.add('disconnected');
      }
    });

    stream.on('reconnect-status', function(text) {
      if (liercd.focused) {
        liercd.focused.scroll(function() {
          liercd.elem.reconnect.textContent = text;
        });
      }
      else {
        liercd.elem.reconnect.textContent = text;
      }
    });

    stream.on('open', function(e) {
      liercd.elem.body.classList.remove('disconnected');
      if (liercd.focused) {
        if (stream.last_id) {
          liercd.fill_missed(stream.last_id);
        }
      }

      for (var id in liercd.panels) {
        liercd.panels[id].set_disabled(false);
        if (!liercd.focused || id != liercd.focused.id) {
          liercd.panels[id].clear_lists();
        }
      }
    });

    liercd.sync_missed();
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
    liercd.panels[id].remove_elems();
    delete liercd.panels[id];

    if (focused && liercd.last_panel_id) {
      liercd.focus_panel(liercd.last_panel_id);
    }

    liercd.update_nav_counts();
  };

  liercd.update_nav_counts = function() {
    liercd.elem.status
      .previousSibling.previousSibling
      .querySelector('.count')
      .textContent = liercd.elem.status.querySelectorAll("li").length

    liercd.elem.privates
      .previousSibling.previousSibling
      .querySelector(".count")
      .textContent = liercd.elem.privates.querySelectorAll("li").length;

    liercd.elem.channels
      .previousSibling.previousSibling
      .querySelector(".count")
      .textContent = liercd.elem.channels.querySelectorAll("li").length;
  };

  liercd.add_panel = function(name, connection, focus) {
    var id = panel_id(name, connection);

    if (liercd.panels[id])
      return liercd.panels[id];

    if (!liercd.connections[connection]) {
      console.log("Connection does not exist", connection);
      throw "Connection does not exist";
    }

    var conn = liercd.connections[connection];
    var panel = new Panel(name, id, conn, liercd.mobile);
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

    liercd.collapse_embeds_pref(panel);
    liercd.monospace_nicks_pref(panel);

    panel.elem.nav.addEventListener('click', function(e) {
      e.preventDefault();

      liercd.elem.flex_wrap.classList.remove("open");

      var id = this.getAttribute('data-panel-id');
      var panel = liercd.panels[id];

      if (e.target.classList.contains('close-panel')) {
        if (panel.type == "channel")
          liercd.part_channel(panel.name, panel.connection);
        else if (panel.type == "status")
          liercd.delete_connection(panel.connection);
        else
          liercd.remove_panel(id);
      }
      else if (e.target.classList.contains('edit-panel')) {
        fetch(liercd.baseurl + "/connection/" + panel.connection, {
            credentials: 'same-origin'
          }).then(function(res) {
            if (!res.ok)
              throw Error(res.statusText);
            return res.json();
          }).then(function(res) {
            liercd.config_modal(null, res);
          }).catch(function(e) {
            alert("I'm sorry: " + e);
          });
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

  liercd.post_token = function() {
    var token = liercd.post_tokens.pop();
    if (!token) {
      alert("No post tokens, tell Lee!");
      throw Error("No tokens");
    }
    return token;
  };
  liercd.part_channel = function(name, connection) {
    if (!confirm("Are you sure you want to leave " + name + "?"))
      return;

    var headers = new Headers();
    headers.append('lierc-token', liercd.post_token());
    headers.append('content-type', 'application/irc');

    fetch(liercd.baseurl + '/connection/' + connection, {
        credentials: 'same-origin',
        method: 'POST',
        body: 'PART ' + name,
        headers: headers
      }).then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).then(function(res) {
        liercd.remove_panel(panel_id(name, connection));
        liercd.post_tokens.push(res.token);
      }).catch(function(e) {
        alert("Error: " + e);
        liercd.load_token();
      });
  };

  liercd.delete_connection = function(connection) {
    if (!confirm("Are you sure you want to remove this connection?"))
      return;
    fetch(liercd.baseurl + '/connection/' + connection, {
        credentials: 'same-origin',
        method: 'DELETE'
      }).then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).catch(function(e) {
        alert(res);
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
      liercd.elem.channels.appendChild(panel.elem.nav);
      liercd.save_channel_order();
      return;
    }
    var items = liercd.elem.channels.childNodes;
    for (var i=0; i < items.length; i++) {
      var id = items[i].getAttribute('data-panel-id');
      if (index < liercd.sorting.indexOf(id)) {
        liercd.elem.channels.insertBefore(panel.elem.nav, items[i]);
        return;
      }
    }

    liercd.elem.channels.appendChild(panel.elem.nav);
  };

  liercd.fill_missed = function(start) {
    fetch(liercd.baseurl + "/log/" + start, {
        credentials: 'same-origin'
      }).then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).then(function(events) {
        for (var i=0; i < events.length; i++) {
          liercd.stream.fire('message', events[i]);
        }
      }).catch(function(e) {
        liercd.reset();
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

    fetch(parts.join("/") + '?limit=' + limit, {
        credentials: 'same-origin',
      }).then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).then(function(events) {
        if (events.length < limit)
          panel.backlog_empty = true;

        var list = [];
        var reactions = [];

        events.forEach( function (e) {
          var message = e.Message;
          message.Id = e.MessageId;
          message.Highlight = e.Highlight;

          if (liercd.is_reaction(message))
            reactions.push(message);
          else {
            var el = Render(message);
            if (el)
              list.push(el);
          }
        });

        panel.prepend(list);
        liercd.filling_backlog = false;

        reactions.forEach(function(reaction) {
          var parts = reaction.Params[1].split(" ");
          panel.handle_reaction(reaction.Prefix.Name, parts[1], parts[2]);
        });

        panel.react_backlog_check();
        panel.set_loading(false);

      }).catch(function(e) {
        liercd.filling_backlog = false;
        panel.set_loading(false);
        console.log(e);
      });
  };

  liercd.is_reaction = function(message) {
    return message.Command == "PRIVMSG"
    && (message.Params[1] || "").substring(0,5) == "\x01" + "FACE";
  };

  liercd.prev_panel = function() {
    var items = liercd.elem.nav.querySelectorAll("li");
    for (var i=items.length - 1; i >= 0; i--) {
      var item = items[i];
      if (item.classList.contains("active") && items[i - 1]) {
        var id = items[i - 1].getAttribute('data-panel-id');
        liercd.focus_panel(id);
        return;
      }
    }
  };

  liercd.prev_unread_panel = function() {
    var items = liercd.elem.nav.querySelectorAll("li");
    for (var i=items.length - 1; i >= 0; i--) {
      var item = items[i];
      if (item.classList.contains("active")) {
        for (var j=i; j > 0; j--) {
          var item = items[j - 1];
          if (item.classList.contains("unread")) {
            var id = item.getAttribute('data-panel-id');
            liercd.focus_panel(id);
            return;
          }
        }
        return;
      }
    }
  };

  liercd.next_panel = function() {
    var items = liercd.elem.nav.querySelectorAll("li");
    for (var i=0; i < items.length; i++) {
      var item = items[i];
      if (item.classList.contains("active") && items[i + 1]) {
        var id = items[i + 1].getAttribute('data-panel-id');
        liercd.focus_panel(id);
        return;
      }
    }
  }

  liercd.next_unread_panel = function() {
    var items = liercd.elem.nav.querySelectorAll("li");
    for (var i=0; i < items.length; i++) {
      var item = items[i];
      if (item.classList.contains("active")) {
        for (var j=i; j < items.length; j++) {
          var item = items[j + 1];
          if (item.classList.contains("unread")) {
            var id = item.getAttribute('data-panel-id');
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

    if (liercd.elem.switcher.classList.contains('open')) {
      liercd.hide_switcher();
    }

    var panel = liercd.panels[id];

    if (! panel)
      return;

    liercd.elem.panel_name.textContent = panel.name;
    liercd.replace_child("panel", panel.elem.list);
    liercd.replace_child("input", panel.elem.input);
    liercd.replace_child("topic", panel.elem.topic);
    liercd.replace_child("filler", panel.elem.filler);
    liercd.replace_child("prefix", panel.elem.prefix);

    liercd.elem.body.setAttribute("data-panel-type", panel.type);
    liercd.replace_child("nicks", panel.elem.nicks);

    liercd.elem.title.textContent = panel.name;

    if (liercd.focused) {
      liercd.focused.unfocus();
      liercd.save_seen(liercd.focused);
    }

    //liercd.scroll_to_nav(panel.elem.nav);

    if (panel.first_focus && panel.type == "channel")
      liercd.show_nicklist_pref(panel);

    panel.focus();
    liercd.focused = panel;
    window.history.replaceState({}, "", panel.path);
    liercd.check_scroll();

    if (panel.type == "channel") {
      var conn = liercd.connections[panel.connection];
      panel.update_nicks(
        conn.nicks(conn.channel(panel.name))
      );
    }
  };

  liercd.replace_child = function(p, c) {
    p = liercd.elem[p];
    while (p.firstChild) {
      p.removeChild(p.firstChild);
    }
    p.appendChild(c);
  };

  liercd.config_modal = function(e, connection) {
    if (e) e.preventDefault();
    liercd.elem.flex_wrap.classList.remove('open');

    var method = "POST";
    var url = liercd.baseurl + "/connection";

    var overlay = $('<div/>', {'class':'overlay'});
    overlay.append($('.config').clone());

    if (connection) {
      var config = connection.Config;
      var form = overlay.find('form');
      form.find('input[name=Host]').val(config.Host);
      form.find('input[name=Port]').val(config.Port);
      if (config.Ssl)
        form.find('input[name=Ssl]').get(0).checked ="checked";
      form.find('input[name=Nick]').val(config.Nick);
      form.find('input[name=User]').val(config.User);
      form.find('input[name=Pass]').val(config.Pass);
      form.find('input[name=Channels]').val(config.Channels.join(", "));

      if (config.Highlight)
        form.find('input[name=Highlight]').val(config.Highlight.join(", "));

      overlay.find('h2').text('Edit connection');
      overlay.find('input[type=submit]').val('Save & Reconnect').css('font-weight', 'bold');
      overlay.find('input[type=submit]').before($('<input/>', {
        type: "submit",
        value: "\uf071 Delete",
        'class': 'delete-connection'
      }));
      url += '/' + connection.Id;
      method = "PUT";
    }
    else {
      var form = overlay.find('form');
      form.find('input[name=Nick]').val(liercd.user.user);
      form.find('input[name=User]').val(liercd.user.user);
      form.find('input[name=Highlight]').val(liercd.user.user);
      if (Object.keys(liercd.connections).length == 0) {
        form.find('input[name=Host]').val("irc.freenode.com");
        form.find('input[name=Port]').val("6697");
        form.find('input[name=Ssl]').get(0).checked ="checked";
        form.find('input[name=Channels]').val("#liercd");
      }
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
      liercd.delete_connection(connection.Id);
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
        Channels: form.find('input[name=Channels]').val().split(/\s*,\s*/),
        Highlight: form.find('input[name=Highlight]').val().split(/\s*,\s*/),
      };

      fetch(url, {
          method: method,
          body: JSON.stringify(data),
          credentials: 'same-origin'
        }).then(function(res) {
          if (!res.ok)
            throw Error(res.statusText);
          return res.json();
        }).then(function(res) {
          if (method == "DELETE") {
            for (panel in liercd.panels) {
              if (panel.type == "channel") {
                liercd.remove_panel(panel.id);
              }
            }
            delete liercd.connections[connection.Id];
          }
          overlay.remove();
          liercd.overlayed = false;
        }).catch(function(e) {
          console.log(e);
          alert("i'm sorry");
        });
    });
  };

  liercd.check_scroll = function() {
    if (liercd.filling_backlog
      || !liercd.focused
      || liercd.focused.backlog_empty
      || !liercd.connections[liercd.focused.connection]
      || getComputedStyle(liercd.elem.scroll).display == "none")
    {
      return;
    }

    if (liercd.elem.scroll.scrollTop <= 150) {
      liercd.filling_backlog = true;
      liercd.fill_backlog(
        liercd.focused, liercd.focused.oldest_message_id()
      );
    }
  };

  setInterval(liercd.check_scroll, 250);

  liercd.ping_server = function() {
    fetch(liercd.baseurl + "/auth", {
        credentials: 'same-origin'
      })
      .then(function(res) {
        if (res.status == 200)
          return;

        if (res.status == 401) {
          //window.location.reload();
          return;
        }

        console.log(res.status);

        // ping failed, force a reconnect of stream...
        if (res.status == 0) {
          liercd.stream.close();
          return;
        }

        var data = res.json();
        if (data["error"]) {
          console.log(data["error"]);
        }
      });
  };

  setInterval(liercd.ping_server, 1000 * 15);

  liercd.get_prefs = function(cb) {
    fetch(liercd.baseurl + "/preference", {
        credentials: 'same-origin'
      }).then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).then(function(data) {
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
      }).catch(function() {
        cb();
      });
  };

  liercd.get_pref = function(name) {
    return liercd.prefs[name];
  };

  liercd.show_nicklist_pref = function(panel) {
    var value = liercd.get_pref(panel.id + "-show-nicklist");
    if (value != undefined)
      panel.set_show_nicklist(value);
  };

  liercd.ignore_events_pref = function(panel) {
    var value = liercd.get_pref(panel.id + "-ignore-events");
    if (value !== undefined)
      panel.set_ignore_events(value);
  };

  liercd.collapse_embeds_pref = function(panel) {
    var value = liercd.get_pref(panel.id + "-collapse-embeds");
    if (value !== undefined)
      panel.set_collapse_embeds(value);
  };

  liercd.monospace_nicks_pref = function(panel) {
    var value = liercd.get_pref(panel.id + '-monospace-nicks');
    if (value !== undefined)
      panel.monospace_nicks = value;
  };

  liercd.add_monospace_nick = function(panel, nick) {
    panel.add_monospace_nick(nick);
    liercd.update_pref(panel.id + "-monospace-nicks", panel.monospace_nicks);
  };

  liercd.remove_monospace_nick = function(panel, nick) {
    panel.remove_monospace_nick(nick);
    liercd.update_pref(panel.id + "-monospace-nicks", panel.monospace_nicks);
  };

  liercd.update_pref = function(name, value) {
    liercd.prefs[name] = value;
    fetch(liercd.baseurl + "/preference/" + encodeURIComponent(name), {
      method: 'POST',
      body: JSON.stringify(value),
      credentials: 'same-origin',
    });
  };

  liercd.load_token = function(cb) {
    fetch(liercd.baseurl + "/token", {
        credentials: 'same-origin'
      })
      .then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).then(function(data) {
        liercd.post_tokens.push(data.token);
        if (data.extra) {
          liercd.post_tokens = liercd.post_tokens.concat(data.extra);
        }
        if (cb) cb();
      }).catch(function(e) {
        alert("Error fetching token: " + e);
        if (cb) cb();
      });
  };

  liercd.load_seen = function(cb) {
    fetch(liercd.baseurl + "/seen", {
        credentials: 'same-origin'
      }).then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).then(function(res) {
        for (i in res) {
          var id = panel_id(res[i]["channel"], res[i]["connection"]);
          liercd.last_seen[id] = res[i]["message_id"];
        }
        cb();
      }).catch(function(e) {
        cb();
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

      fetch(parts.join("/"), {
          credentials: 'same-origin',
          method: 'POST',
          body: "" + last_seen
        });

      liercd.last_seen[id] = last_seen;
    }
  };

  liercd.sync_missed = function() {
    if (liercd.focused) {
      liercd.focused.update_seen();
      if (liercd.focused.last_seen)
        liercd.last_seen[liercd.focused.id] = liercd.focused.last_seen;
    }

    var query = [];

    for (k in liercd.last_seen) {
      query.push([
        encodeURIComponent(k),
        encodeURIComponent(liercd.last_seen[k])
      ].join('='));
    }

    var url = liercd.baseurl + "/missed?" + query.join('&');

    fetch(url, {
        credentials: 'same-origin',
      }).then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).then(function(res) {
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
      }).catch(function(e) {
        console.log(e);
      });
  };

  liercd.search_panel = function(panel, text) {
    var url = liercd.baseurl + "/connection/" + panel.connection
      + "/channel/" + encodeURIComponent(panel.name) + "/last?"
      + "query=" + encodeURIComponent(text) + "&limit=10";

    fetch(url, {
        credentials: 'same-origin'
      }).then(function(res) {
        if (!res.ok)
          throw Error(res.statusText);
        return res.json();
      }).then(function(messages) {
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
      });
  };

  liercd.get_prefs(function(prefs) {
    liercd.prefs = prefs;
    liercd.sorting = liercd.prefs['sorting'] || [];
    delete liercd.prefs['sorting'];

    if (liercd.prefs['email'] === true) {
      document.getElementById('email-notify')
        .classList.add('enabled');
    }

    liercd.load_seen(function() {
      liercd.load_token(function() {
        liercd.init();
      });
    });
  });

  liercd.update_email_pref = function(disabled) {

  };

  liercd.focus_input = function(force) {
    if (force) {
      liercd.focused.elem.input.focus();
      return;
    }

    if (liercd.mobile)
      return;
    if (!liercd.focused)
      return;
    if (document.querySelectorAll('.overlay').length)
      return;
    liercd.focused.elem.input.focus();
  };

  liercd.hide_switcher = function() {
    liercd.elem.switcher.classList.remove('open');
    liercd.elem.nav.classList.remove('filtering');
    liercd.elem.nav.querySelectorAll('li').forEach(function(li) {
      li.classList.remove('match', 'selected', 'candidate');
    });
  };

  liercd.toggle_switcher = function() {
    liercd.elem.switcher.querySelector('input').value = '';
    if (liercd.elem.switcher.classList.contains('open')) {
      liercd.hide_switcher();
    }
    else {
      liercd.elem.switcher.classList.add('open');
      liercd.elem.nav.classList.add('filtering');
      liercd.elem.nav.querySelectorAll('#channels li[data-name], #privates li[data-name]').forEach(function(li) {
        li.classList.add('candidate', 'match');
      });
      var matches = liercd.elem.nav.querySelectorAll('li[data-name].candidate');
      if (matches.length) {
        matches[0].classList.add('selected');
      }
      liercd.elem.switcher.querySelector('input').focus();
    }
  };

  liercd.save_channel_order = function() {
    var order = Array.prototype.map.call(
      liercd.elem.channels.querySelectorAll('li'),
      function(li) {
        return li.getAttribute('data-panel-id');
      });

    liercd.sorting = order;
    liercd.update_pref("sorting", order);
  };

  liercd.reset = function() {
    var path = liercd.focused ? liercd.focused.path : "";

    for (id in liercd.panels) {
      liercd.remove_panel(id);
    }

    window.history.replaceState({}, "", path);
    liercd.default_focused = false;
    liercd.connections = [];
    liercd.last_seen = {};
    liercd.missed = {};
    liercd.focused = null;

    liercd.load_seen(function() {
      liercd.load_token(function() {
        liercd.init();
      });
    });
  }

  function detect_mobile () {
    return (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) return true; return false;})(navigator.userAgent||navigator.vendor||window.opera);
  };

  var events = new UIEvents(liercd);
};
