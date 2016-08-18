var Liercd = function(url) {
  this.baseurl = url;
  this.stream;
  this.meta_down = false;
  this.shift_down = false;
  this.connections = {};
  this.filling_backlog = false;
  this.panels = {};
  this.focused = null;

  this.elem = {
    panel: $('#panel'),
    nav: $('#nav'),
    'status': $('#status'),
    privates: $('#privates'),
    channels: $('#channels'),
    input: $('#input'),
    topic: $('#topic'),
    filler: $('#filler'),
    prefix: $('#prefix')
  };

  function panel_id(name, connection) {
    return window.btoa(name + connection).replace(/=+$/, "");
  }

  this.setup_connection = function(config) {
    if (this.connections[config.id])
      return;

    var connection = new Connection(config);

    var panel = this.add_panel("status", connection.id);
    panel.change_name(connection.config.Host);
    panel.update_topic("status.");

    connection.on("channel:new", function(conn, channel, message) {
      var panel = this.add_panel(channel, conn);
      panel.append(Render(message));
    }.bind(this));

    connection.on("private:msg", function(conn, nick, message) {
      var panel = this.add_panel(nick, conn);
      panel.append(Render(message));
    }.bind(this));

    connection.on("channel:msg", function(conn, channel, message) {
      var panel = this.get_panel(channel, conn);
      panel.append(Render(message));
    }.bind(this));

    connection.on("channel:nicks", function(conn, channel, nicks) {
      var panel = this.get_panel(channel, conn);
      panel.update_completions(nicks);
    }.bind(this));

    connection.on("channel:close", function(conn, channel) {
      this.remove_panel(channel, conn);
    }.bind(this));

    connection.on("status", function(conn, message) {
      var panel = this.get_panel("status", conn);
      panel.append(Render(message));
    }.bind(this));

    connection.on("channel:topic", function(conn, channel, message) {
      var panel = this.get_panel(channel, conn);
      panel.update_topic(message.Params[2]);
    }.bind(this));

    this.connections[connection.id] = connection;
  };

  this.init = function() {
    $.ajax({
      url: this.baseurl + '/connection',
      type: "GET",
      dataType: "json",
      success: function(configs) {
        if (!configs.length)
          this.config_modal();

        configs.forEach( function(config) {
          this.setup_connection(config);
        }.bind(this));

        if (!this.stream)
          this.connect();
      }.bind(this)
    });
  };

  this.connect = function() {
    var stream = new Stream(this.baseurl);

    stream.on('message', function(e) {
        var conn_id = e.ConnectionId;
        var message = e.Message;

        if (e.MessageId)
          message.Id =  e.MessageId;

        if (this.connections[conn_id]) {
          this.connections[conn_id].on_message(message);
        }
      }.bind(this));

    this.stream = stream;

    this.elem.nav.on('click', 'li', function(e) {
      var el = $(e.currentTarget);
      var id = el.attr('data-panel-id');
      this.focus_panel(id);
    }.bind(this));
  };

  this.get_panel = function(name, connection) {
    var id = panel_id(name, connection);
    return this.panels[id];
  };

  this.remove_panel = function(name, connection) {
    var id = panel_id(name, connection);
    this.panels[id].elem.input.remove();
    this.panels[id].elem.list.remove();
    this.panels[id].elem.nav.remove();
    this.panels[id].elem.topic.remove();
    delete this.panels[id];
  };

  this.add_panel = function(name, connection) {
    var id = panel_id(name, connection);

    if (this.panels[id])
      return this.panels[id];

    var panel = new Panel(name, id, connection);
    this.panels[id] = panel;

    if (panel.type == "status")
      this.elem.status.append(panel.elem.nav);
    else if (panel.type == "private")
      this.elem.privates.append(panel.elem.nav);
    else
      this.elem.channels.append(panel.elem.nav);

    if (!this.focused)
      this.focus_panel(id);

    return this.panels[id];
  };

  this.fill_backlog = function(panel, time) {
    if (panel.backlog_empty) return;

    var connection = this.connections[panel.connection];
    if (!connection) return;

    var name = panel.type == "status" ? "status" : panel.name;
    var parts = [
      this.baseurl, "connection", connection.id, "channel", encodeURIComponent(name), "events"
    ];

    if (time)
      parts.push(time);

    $.ajax({
      url: parts.join("/"),
      type: "GET",
      dataType: "json",
      success: function(events) {
        if (events.length < 100)
          panel.backlog_empty = true;

        var block = $('<div/>', {'class':'backlog-block'});
        events.forEach( function (e) {
          var message = e.Message;
          message.Id = e.MessageId;
          block.prepend(Render(message));
        }.bind(this));

        var height = document.documentElement.scrollHeight;
        var scroll = window.scrollY;
        panel.prepend(block);
        var diff = document.documentElement.scrollHeight - height;
        window.scroll(0, scroll + diff);

        this.filling_backlog = false;
      }.bind(this)
    });
  };

  this.prev_panel = function() {
    var panel = this.focused;
    var id = panel.elem.nav.prev("li").attr('data-panel-id');
    if (id && this.panels[id]) {
      this.focus_panel(id);
    }
  };

  this.prev_unread_panel = function() {
    var panel = this.focused;
    var id = panel.elem.nav.prevAll("li.unread:first").attr('data-panel-id');
    if (id && this.panels[id]) {
      this.focus_panel(id);
    }
  };

  this.next_panel = function() {
    var panel = this.focused;
    var id = panel.elem.nav.next("li").attr('data-panel-id');
    if (id && this.panels[id]) {
      this.focus_panel(id);
    }
  };

  this.next_unread_panel = function() {
    var panel = this.focused;
    var id = panel.elem.nav.nextAll("li.unread:first").attr('data-panel-id');
    if (id && this.panels[id]) {
      this.focus_panel(id);
    }
  };

  this.focus_panel = function(id) {
    var panel = this.panels[id];
    this.elem.panel.html(panel.elem.list);
    this.elem.input.html(panel.elem.input);
    this.elem.topic.html(panel.elem.topic);
    this.elem.filler.html(panel.elem.filler);
    this.elem.prefix.html(panel.elem.prefix);

    for (id in this.panels) {
      this.panels[id].unfocus();
    }

    panel.focus();
    this.focused = panel;

  };

  this.config_modal = function() {
    var url = this.baseurl + "/connection";
    var overlay = $('<div/>', {'class':'overlay'});
    overlay.append($('.config').clone().show());
    $('body').append(overlay);

    overlay.on("click", "a.close", function(e) {
      overlay.remove();
    });

    overlay.on("click", "input[type=submit]", function(e) {
      e.preventDefault();

      var data = {
        Host: overlay.find('input[name=Host]').val(),
        Port: parseInt(overlay.find('input[name=Port]').val()),
        Ssl:  overlay.find('input[name=Ssl]').get(0).checked,
        Nick: overlay.find('input[name=Nick]').val(),
        User: overlay.find('input[name=User]').val(),
        Pass: overlay.find('input[name=Pass]').val(),
        Channels: []
      };

      $.ajax({
        url: url,
        type: "POST",
        dataType: "json",
        data: JSON.stringify(data),
        success: function(res) {
          overlay.remove();
          this.init();
        }.bind(this),
        error: function(res) {
          console.log(res);
          alert("i'm sorry");
        }.bind(this)
      });
    }.bind(this));
  };

  this.check_scroll = function() {
    if (this.filling_backlog) return;
    if (!this.focused) return;

    if (window.scrollY == 0) {
      if (!this.connections[this.focused.connection])
        return;
      if (this.focused.backlog_empty) return;
      this.filling_backlog = true;
      this.fill_backlog(
        this.focused, this.focused.oldest_message_id()
      );
    }
  };

  setInterval(this.check_scroll.bind(this), 1000);

  $('#add-connection').on('click', this.config_modal.bind(this));

  this.elem.input.on("submit", function(e) {
    e.preventDefault();
    var input = $(e.target).find("input");
    var value = input.val();
    input.val("");

    var panel = this.panels[input.attr('data-panel-id')];
    var privmsg = false;

    if (value.substring(0,1) != "/") {
      privmsg = value;
      value = "PRIVMSG " + panel.name + " :" + value;
    }
    else {
      value = value.substring(1);
    }

    var method = value.match(/^quit\b/i) ? "DELETE" : "POST";
    var connection = this.connections[panel.connection];

    if (privmsg) {
      var el = panel.own_message(connection.nick, privmsg);
      el.addClass("sending");
    }

    $.ajax({
      url: this.baseurl + "/connection/" + panel.connection,
      type: method,
      dataType: "json",
      data: value,
      success: function(res) {
        if (method == "DELETE")
          window.location.reload();
        if (el)
          el.addClass("sent");
      }.bind(this)
    });
  }.bind(this));


  document.addEventListener("keydown", function(e) {
    if (e.which == 18)
      this.meta_down = true;

    if (e.which == 16)
      this.shift_down = true;

    if (e.which == 38 && this.meta_down) {
      e.preventDefault();
      if (this.shift_down)
        this.prev_unread_panel();
      else
        this.prev_panel();
    }

    if (e.which == 40 && this.meta_down) {
      e.preventDefault();
      if (this.shift_down)
        this.next_unread_panel();
      else
        this.next_panel();
    }

  }.bind(this));

  document.addEventListener("keyup", function(e) {
    if (e.which == 18)
      this.meta_down = false;
    if (e.which == 16)
      this.shift_down = false;
  }.bind(this));

  this.init();
};

