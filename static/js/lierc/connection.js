var Connection = function(config) {
  var conn = this;

  conn.id = config.id;
  conn.config = config.Config;
  conn.nick = config.Nick;
  conn.connected = false;
  conn.channels = [];

  var listeners = {};

  conn.on = function(name, func) {
    if (!listeners[name])
      listeners[name] = [];
    listeners[name].push(func);
  };

  fire = function (name) {
    if (listeners[name]) {
      var data = Array.prototype.slice.call(arguments, 1);
      listeners[name].forEach(function(listener) {
        listener.apply(undefined, data);
      });
    }
  }

  conn.remove_channel = function(name) {
    var i = conn.channels.indexOf(name);
    if (i != -1) {
      conn.channels.splice(i, 1);
      return true;
    }
    return false;
  };

  conn.on_message = function(message) {
    switch (String(message.Command)) {
    case "001":
      conn.nick = message.Params[0];
      fire("status:raw", conn.id, message);
      break;

    case "NICK":
      var old = message.Prefix.Name;
      var nick = message.Params[0];

      if (old == conn.nick) {
        conn.nick = nick;
        conn.channels.forEach(function(channel) {
          channel.rename_nick(old, nick);
          fire("status:raw", conn.id, message);
          fire("channel:msg", conn.id, channel.name, message);
          fire("channel:nicks", conn.id, channel.name, channel.nicks())
        });
      }
      else {
        conn.channels.forEach( function(channel) {
          if (channel.rename_nick(old, nick)) {
            fire("channel:msg", conn.id, channel.name, message);
            fire("channel:nicks", conn.id, channel.name, channel.nicks())
          }
        });
      }
      break;

    case "PART":
      var nick = message.Prefix.Name;
      var name = message.Params[0];
      var msg = message.Params[1];

      var del = true;
      for (var i=0; i < conn.channels; i++) {
        if (conn.channels[i].contains_nick(nick)) {
          del = false;
          break;
        }
      }

      var channel = conn.channel(name);

      if (channel) {
        if (nick == conn.nick) {
          conn.remove_channel(name);
          fire("status:raw", conn.id, message);
          fire("channel:close", conn.id, name);
        }
        else {
          channel.remove_nick(nick);
          fire("channel:msg", conn.id, name, message);
          fire("channel:nicks", conn.id, name, channel.nicks())
        }
      };
      break;

    case "QUIT":
      var nick = message.Prefix.Name;
      var msg = message.Params[0];

      conn.channels.forEach( function(channel) {
        if (channel.remove_nick(nick)) {
          fire("channel:msg", conn.id, channel.name, message);
          fire("channel:nicks", conn.id, channel.name, channel.nicks())
        }
      });
      break;

    case "JOIN":
      var name = message.Params[0];
      var nick = message.Prefix.Name;

      if (nick == conn.nick) {
        var channel = new Channel(name);
        conn.channels.push(channel);
        fire("status:raw", conn.id, message);
        fire("channel:new", conn.id, name, message);
      }
      else {
        var channel = conn.channel(name);
        if (channel) {
          channel.add_nick(nick);
          fire("channel:msg", conn.id, name, message);
          fire("channel:nicks", conn.id, name, channel.nicks())
        }
      }
      break;

    case "324":
      var name = message.Params[0];
      var channel = conn.channel(name)
      if (channel) {
        channel.mode = message.Params[1].substring(1);
        fire("channel:mode", conn.id, name, channel.mode);
      }
      break;

    case "MODE":
      if (message.Prefix.Name == message.Params[0]) {
        // user mode, ignored for now
      }
      else {
        var name = message.Params[0];
        var channel = conn.channel(name);
        if (channel) {
          if (message.Params[1].match(/[+-][voh]/)) {
            channel.nick_mode(message.Params[2], message.Params[1]);
            fire("channel:nicks", conn.id, name, channel.nicks())
          }
          else {
            channel.set_mode(message.Params[1]);
            fire("channel:mode", conn.id, name, channel.mode);
          }
          fire("channel:msg", conn.id, name, message);
        }
      }
      break;

    case "332":
      var name = message.Params[1];
      var topic = message.Params[2];

      var channel = conn.channel(name);
      if (channel) {
        channel.topic = topic;
        fire("channel:topic", conn.id, name, topic);
      }
      break;

    case "TOPIC":
      var nick = message.Prefix.Name;
      var name = message.Params[0];
      var text = message.Params[1];
      var channel = conn.channel(name);

      if (channel) {
        channel.topic = topic;
        fire("channel:msg", conn.id, name, message);
        fire("channel:topic", conn.id, name, text);
      }
      break;

    case "353":
      var name  = message.Params[2];
      var nicks = message.Params[3].split(/\s+/);
      var channel = conn.channel(name);

      if (channel) {
        if (channel.nicks_done) {
          channel.reset_nicks();
          channel.nicks_done = false;
        }
        for (i in nicks) {
          if (nicks[i])
            channel.add_nick(nicks[i]);
        }
      }
      break;

    case "366":
      var name = message.Params[1];
      var channel = conn.channel(name);

      if (channel) {
        channel.nicks_done = true;
        fire("channel:nicks", conn.id, name, channel.nicks())
      }
      break;

    case "PRIVMSG":
      var nick = message.Prefix.Name;
      var name = message.Params[0];
      var text = message.Params[1];
      var priv = name.match(/^[^#&!+]/);
      var type = "msg";

      if (text.substring(0,5) == "\x01" + "FACE")
        type = "react";

      if (name == conn.nick && priv)
        fire("private:"+type, conn.id, nick, message);
      else if (priv)
        fire("private:"+type, conn.id, name, message);
      else if (conn.channel(name))
        fire("channel:"+type, conn.id, name, message);
      break;

    case "PING":
      break;

    default:
      fire("status", conn.id, message);
    };
  };

  conn.channel = function(name) {
    var i = conn.channels.indexOf(name);
    for (var i=0; i < conn.channels.length; i++) {
      if (conn.channels[i].name == name) {
        return conn.channels[i];
      }
    }
    return false;
  };

  conn.in_channel = function(name) {
    return conn.channels.indexOf(name) != -1;
  };

  conn.send = function(line, success) {
    $.ajax({
      url: liercd.baseurl + '/connection/' + conn.id,
      type: "POST",
      dataType: "json",
      data: line,
      success: function() {
        if (success)
          success();
      }
    });
  };
};
