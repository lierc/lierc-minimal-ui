var Connection = function(config) {
  this.id = config.id;
  this.config = config.Config;
  this.nick = config.Nick;
  this.channels = [];

  var listeners = {};

  this.on = function(name, func) {
    if (!listeners[name])
      listeners[name] = [];
    listeners[name].push(func.bind(this));
  };

  fire = function (name) {
    if (listeners[name]) {
      var data = Array.prototype.slice.call(arguments, 1);
      listeners[name].forEach(function(listener) {
        listener.apply(undefined, data);
      });
    }
  }

  this.remove_channel = function(name) {
    var i = this.channels.indexOf(name);
    if (i != -1) {
      this.channels.splice(i, 1);
      return true;
    }
    return false;
  };

  this.on_message = function(message) {
    switch (String(message.Command)) {
    case "001":
      this.nick = message.Params[0];
      break;

    case "NICK":
      var old = message.Prefix.Name;
      var nick = message.Params[0];
      if (old == this.nick) {
        this.nick = nick;
        this.channels.forEach(function(channel) {
          channel.rename_nick(old, nick);
          fire("channel:msg", this.id, channel.name, message);
          fire("channel:nicks", this.id, channel.name, channel.nicks)
        }.bind(this));
      }
      else {
        this.channels.forEach( function(channel) {
          if (channel.rename_nick(old, nick)) {
            fire("channel:msg", this.id, channel.name, message);
            fire("channel:nicks", this.id, channel.name, channel.nicks)
          }
        }.bind(this));
      }
      break;

    case "PART":
      var nick = message.Prefix.Name;
      var name = message.Params[0];
      var msg = message.Params[1];

      var channel = this.channel(name);

      if (channel) {
        if (nick == this.nick) {
          this.remove_channel(name);
          fire("channel:close", this.id, name);
        }
        else {
          channel.remove_nick(nick);
          fire("channel:msg", this.id, name, message);
          fire("channel:nicks", this.id, name, channel.nicks)
        }
      };
      break;

    case "QUIT":
      var nick = message.Prefix.Name;
      var msg = message.Params[0];

      this.channels.forEach( function(channel) {
        if (channel.remove_nick(nick)) {
          fire("channel:msg", this.id, channel.name, message);
          fire("channel:nicks", this.id, channel.name, channel.nicks)
        }
      }.bind(this));
      break;

    case "JOIN":
      var name = message.Params[0];
      var nick = message.Prefix.Name;
      if (nick == this.nick) {
        var channel = new Channel(name);
        this.channels.push(channel);
        fire("channel:new", this.id, name, message);
      }
      else {
        var channel = this.channel(name);
        if (channel) {
          channel.nicks.push(nick);
          fire("channel:msg", this.id, name, message);
          fire("channel:nicks", this.id, name, channel.nicks)
        }
      }
      break;

    case "332":
      var name = message.Params[1];
      var topic = message.Params[2];

      var channel = this.channel(name);
      if (channel) {
        channel.topic = topic;
        fire("channel:msg", this.id, name, message);
        fire("channel:topic", this.id, name, message);
      }
      break;

    case "353":
      var name  = message.Params[2];
      var nicks = message.Params[3].split(" ");
      var channel = this.channel(name);

      if (channel) {
        if (channel.nicks_done) {
          channel.nicks =[];
          channel.nicks_done = false;
        }
        channel.nicks = channel.nicks.concat(nicks);
      }
      break;

    case "366":
      var name = message.Params[1];
      var channel = this.channel(name);

      if (channel) {
        channel.nicks_done = true;
        fire("channel:nicks", this.id, name, channel.nicks)
      }
      break;

    case "PRIVMSG":
      var nick = message.Prefix.Name;
      var name = message.Params[0];
      var text = message.Params[1];

      if (this.channel(name))
        fire("channel:msg", this.id, name, message);
      else if (name == this.nick)
        fire("private:msg", this.id, nick, message);

      break;

    default:
      fire("status", this.id, message);
    };
  };

  this.channel = function(name) {
    var i = this.channels.indexOf(name);
    for (var i=0; i < this.channels.length; i++) {
      if (this.channels[i].name == name) {
        return this.channels[i];
      }
    }
    return false;
  };

  this.in_channel = function(name) {
    return this.channels.indexOf(name) != -1;
  };
};
