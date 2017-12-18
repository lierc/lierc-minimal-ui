var Connection = function(id, host, nick) {
  var conn = this;

  conn.id = id;
  conn.host = host;
  conn.nick = nick;
  conn.connected = false;
  conn.channels = [];
  conn.isupport = {};
  conn.prefix = [ ["v","+"],["o","@"],["h", "%"]];
  conn.chantypes = ["#","&"];

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

  conn.nick_mode = function(nick) {
    var first = nick.slice(0,1);
    for (var i=0; i < conn.prefix.length; i++) {
      if (first == conn.prefix[i][1]) {
        return [nick.slice(1), conn.prefix[i][0]];
      }
    }
    return [nick, ""]
  };

  conn.nicks = function(channel) {
    var ret = {};
    var nicks = channel.nicks;
    var l = nicks.length;

    for (var i=0; i < l; i++) {
      var nick = nicks[i];
      var modes = channel.nick_modes[nick];
      ret[nick] = "";

      for (var j=0; j < conn.prefix.length; j++) {
        if (modes && modes.indexOf( conn.prefix[j][0]) != -1) {
          ret[nick] = conn.prefix[j][1] + ret[nick];
        }
      }
    }

    return ret;
  };

  conn.on_message = function(message) {
    switch (String(message.Command)) {
    case "CONNECT":
      fire("connect", conn.id, message);
      fire("status", conn.id, message);
      break;

    case "DISCONNECT":
      fire("disconnect", conn.id, message);
      fire("status", conn.id, message);
      break;

    case "001":
      conn.nick = message.Params[0];
      fire("status:raw", conn.id, message);
      break;

    case "005":
      var parts = message.Params[1].split(" ");

      for (var i=0; i < parts.length; i++) {
        if (parts[i].indexOf("=") != -1) {
          var kv = parts[i].split("=", 2);
          conn.isupport[kv[0]] = kv[1];
          if (kv[0] == "PREFIX") {
            var match = kv[1].match(/\(([^\)]+)\)(.+)/);
            if (match) {
              var modes = match[1].split("");
              var prefixes = match[2].split("");
              conn.prefix = [];
              for (var j=0; j < modes.length; j++) {
                conn.prefix.push([modes[j], prefixes[j]]);
              }
            }
          }
          else if (kv[0] == "CHANTYPES") {
            conn.chantypes = kv[1].split("");
          }
        }
        else {
          conn.isupport[parts[i]] = true;
        }
      }
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
          fire("channel:nicks", conn.id, channel.name, conn.nicks(channel))
        });
      }
      else {
        conn.channels.forEach( function(channel) {
          if (channel.rename_nick(old, nick)) {
            fire("channel:msg", conn.id, channel.name, message);
            fire("channel:nicks", conn.id, channel.name, conn.nicks(channel))
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
          fire("channel:close", conn.id, name);
        }
        else {
          channel.remove_nick(nick);
          fire("channel:msg", conn.id, name, message);
          fire("channel:nicks", conn.id, name, conn.nicks(channel))
        }
      };
      break;

    case "QUIT":
      var nick = message.Prefix.Name;
      var msg = message.Params[0];

      conn.channels.forEach( function(channel) {
        if (channel.remove_nick(nick)) {
          fire("channel:msg", conn.id, channel.name, message);
          fire("channel:nicks", conn.id, channel.name, conn.nicks(channel))
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
          channel.add_nick(nick);
          fire("channel:msg", conn.id, name, message);
          fire("channel:nicks", conn.id, name, conn.nicks(channel))
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
            fire("channel:nicks", conn.id, name, conn.nicks(channel))
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
        channel.topic.value = topic;
        fire("channel:topic", conn.id, name, channel.topic);
      }
      break;

    case "333":
      var name = message.Params[1];
      var channel = conn.channel(name);

      if (channel) {
        channel.topic.user = message.Params[2];
        channel.topic.time = message.Params[3];
        fire("channel:topic", conn.id, name, channel.topic)
      }
      break;

    case "TOPIC":
      var nick = message.Prefix.Name;
      var name = message.Params[0];
      var text = message.Params[1];
      var channel = conn.channel(name);

      if (channel) {
        channel.topic.value = text;
        channel.topic.time = parseInt((new Date()).getTime() / 1000);
        channel.topic.user = nick;
        fire("channel:msg", conn.id, name, message);
        fire("channel:topic", conn.id, name, channel.topic);
      }
      break;

    case "353":
      var name  = message.Params[2];
      var nicks = message.Params[3].split(/\s+/);
      var channel = conn.channel(name);

      if (channel) {
        if (channel.synced) {
          channel.reset_nicks();
          channel.synced = false;
        }
        for (i in nicks) {
          if (nicks[i])
            var nick_mode = conn.nick_mode(nicks[i]);
            channel.add_nick(nick_mode[0], nick_mode[1]);
        }
      }
      break;

    case "366":
      var name = message.Params[1];
      var channel = conn.channel(name);

      if (channel) {
        channel.synced = true;
        fire("channel:nicks", conn.id, name, conn.nicks(channel))
      }
      break;

    case "401":
    case "403":
      var name = message.Params[1];
      fire("channel:error", conn.id, name,  message);
      break;

    case "NOTICE":
      var nick = message.Prefix.Name;
      var name = message.Params[0];

      if (name == conn.nick)
        fire("private:msg", conn.id, nick, message);
      else
        fire("status", conn.id, message);

      break;

    case "PRIVMSG":
      var nick = message.Prefix.Name;
      var name = message.Params[0];
      var text = message.Params[1];
      var priv = conn.chantypes.indexOf(name[0]) == -1;
      var type = "msg";

      if (text && text.substring(0,5) == "\x01" + "FACE")
        type = "react";

      var channel = conn.channel(name);

      if (name == conn.nick && priv)
        fire("private:"+type, conn.id, nick, message);
      else if (priv)
        fire("private:"+type, conn.id, name, message);
      else if (channel) {
        channel.bump_nick(nick);
        fire("channel:"+type, conn.id, name, message);
      }
      break;

    case "PING":
      break;

    case "PONG":
      break;

    default:
      fire("status", conn.id, message);
    };
  };

  conn.channel = function(name) {
    name = name.toLowerCase();
    for (var i=0; i < conn.channels.length; i++) {
      if (conn.channels[i].name.toLowerCase() == name) {
        return conn.channels[i];
      }
    }
    return false;
  };

  conn.is_channel = function(name) {
    return conn.chantypes.indexOf(name[0]) != -1;
  };
};
