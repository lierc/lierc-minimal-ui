var Connection = function(config) {
  var conn = this;

  conn.id = config.id;
  conn.config = config.Config;
  conn.nick = config.Nick;
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
      break;

    case "NICK":
      var old = message.Prefix.Name;
      var nick = message.Params[0];
      if (old == conn.nick) {
        conn.nick = nick;
        conn.channels.forEach(function(channel) {
          channel.rename_nick(old, nick);
          fire("channel:msg", conn.id, channel.name, message);
          fire("channel:nicks", conn.id, channel.name, channel.nicks)
        });
      }
      else {
        conn.channels.forEach( function(channel) {
          if (channel.rename_nick(old, nick)) {
            fire("channel:msg", conn.id, channel.name, message);
            fire("channel:nicks", conn.id, channel.name, channel.nicks)
          }
        });
      }
      break;

    case "PART":
      var nick = message.Prefix.Name;
      var name = message.Params[0];
      var msg = message.Params[1];

      var channel = conn.channel(name);

      if (channel) {
        if (nick == conn.nick) {
          conn.remove_channel(name);
          fire("channel:close", conn.id, name);
        }
        else {
          channel.remove_nick(nick);
          fire("channel:msg", conn.id, name, message);
          fire("channel:nicks", conn.id, name, channel.nicks)
        }
      };
      break;

    case "QUIT":
      var nick = message.Prefix.Name;
      var msg = message.Params[0];

      conn.channels.forEach( function(channel) {
        if (channel.remove_nick(nick)) {
          fire("channel:msg", conn.id, channel.name, message);
          fire("channel:nicks", conn.id, channel.name, channel.nicks)
        }
      });
      break;

    case "JOIN":
      var name = message.Params[0];
      var nick = message.Prefix.Name;
      if (nick == conn.nick) {
        var channel = new Channel(name);
        conn.channels.push(channel);
        fire("channel:new", conn.id, name, message);
      }
      else {
        var channel = conn.channel(name);
        if (channel) {
          channel.nicks.push(nick);
          fire("channel:msg", conn.id, name, message);
          fire("channel:nicks", conn.id, name, channel.nicks)
        }
      }
      break;

    case "332":
      var name = message.Params[1];
      var topic = message.Params[2];

      var channel = conn.channel(name);
      if (channel) {
        channel.topic = topic;
        fire("channel:msg", conn.id, name, message);
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
      var nicks = message.Params[3].split(" ");
      var channel = conn.channel(name);

      if (channel) {
        if (channel.nicks_done) {
          channel.nicks = [];
          channel.nicks_done = false;
        }
        channel.nicks = channel.nicks.concat(nicks);
      }
      break;

    case "366":
      var name = message.Params[1];
      var channel = conn.channel(name);

      if (channel) {
        channel.nicks_done = true;
        fire("channel:nicks", conn.id, name, channel.nicks)
      }
      break;

    case "PRIVMSG":
      var nick = message.Prefix.Name;
      var name = message.Params[0];
      var text = message.Params[1];

      if (conn.channel(name))
        fire("channel:msg", conn.id, name, message);
      else if (name == conn.nick)
        fire("private:msg", conn.id, nick, message);
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
};
