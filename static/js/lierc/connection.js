import { Channel } from "./channel.js";

export class Connection {
  #listeners = {};

  constructor(id, host, nick) {
    this.id = id;
    this.host = host;
    this.nick = nick;
    this.connected = false;
    this.channels = [];
    this.isupport = {};
    this.prefix = [ ["v","+"],["o","@"],["h", "%"]];
    this.chantypes = ["#","&"];
    this.caps_enabled = {};
  }

  on(name, func) {
    if (!this.#listeners[name])
      this.#listeners[name] = [];
    this.#listeners[name].push(func);
  }

  #fire(name) {
    if (this.#listeners[name]) {
      const data = Array.prototype.slice.call(arguments, 1);
      this.#listeners[name].forEach((listener) => {
        listener.apply(undefined, data);
      });
    }
  }

  remove_channel(name) {
    const i = this.channels.indexOf(name);
    if (i != -1) {
      this.channels.splice(i, 1);
      return true;
    }
    return false;
  }

  nick_mode(nick) {
    const first = nick.slice(0,1);
    for (let i=0; i < this.prefix.length; i++) {
      if (first == this.prefix[i][1]) {
        return [nick.slice(1), this.prefix[i][0]];
      }
    }
    return [nick, ""]
  }

  nicks(channel) {
    const ret = {};
    const nicks = channel.nicks;
    const l = nicks.length;

    for (let i=0; i < l; i++) {
      const nick = nicks[i];
      const modes = channel.nick_modes[nick];
      ret[nick] = "";

      for (let j=0; j < this.prefix.length; j++) {
        if (modes && modes.indexOf( this.prefix[j][0]) != -1) {
          ret[nick] = this.prefix[j][1] + ret[nick];
        }
      }
    }

    return ret;
  }

  on_message(message) {
    switch (String(message.Command)) {
    case "CONNECT":
      this.#fire("connect", this.id, message);
      this.#fire("status", this.id, message);
      break;

    case "DISCONNECT":
      this.#fire("disconnect", this.id, message);
      this.#fire("status", this.id, message);
      break;

    case "001":
      this.nick = message.Params[0];
      this.#fire("status:raw", this.id, message);
      break;

    case "CAP": {
      const caps = message.Params[2].split(" ");
      for (let i=0; i < caps.length; i++) {
        this.caps_enabled[caps[i]] = true;
      }
      break;
    }

    case "005": {
      const parts = message.Params[1].split(" ");

      for (let i=0; i < parts.length; i++) {
        if (parts[i].indexOf("=") != -1) {
          const kv = parts[i].split("=", 2);
          this.isupport[kv[0]] = kv[1];
          if (kv[0] == "PREFIX") {
            const match = kv[1].match(/\(([^\)]+)\)(.+)/);
            if (match) {
              const modes = match[1].split("");
              const prefixes = match[2].split("");
              this.prefix = [];
              for (let j=0; j < modes.length; j++) {
                this.prefix.push([modes[j], prefixes[j]]);
              }
            }
          }
          else if (kv[0] == "CHANTYPES") {
            this.chantypes = kv[1].split("");
          }
        }
        else {
          this.isupport[parts[i]] = true;
        }
      }
      break;
    }

    case "NICK": {
      const old = message.Prefix.Name;
      const nick = message.Params[0];

      if (old == this.nick) {
        this.nick = nick;
        this.channels.forEach((channel) => {
          channel.rename_nick(old, nick);
          this.#fire("status:raw", this.id, message);
          this.#fire("channel:msg", this.id, channel.name, message);
          this.#fire("channel:nicks", this.id, channel.name, this.nicks(channel))
        });
      }
      else {
        this.channels.forEach( (channel) => {
          if (channel.rename_nick(old, nick)) {
            this.#fire("channel:msg", this.id, channel.name, message);
            this.#fire("channel:nicks", this.id, channel.name, this.nicks(channel))
          }
        });
      }
      break;
    }

    case "PART": {
      const nick = message.Prefix.Name;
      const name = message.Params[0];
      const msg = message.Params[1];

      let del = true;
      for (let i=0; i < this.channels; i++) {
        if (this.channels[i].contains_nick(nick)) {
          del = false;
          break;
        }
      }

      const channel = this.channel(name);

      if (channel) {
        if (nick == this.nick) {
          this.remove_channel(name);
          this.#fire("channel:close", this.id, name);
        }
        else {
          channel.remove_nick(nick);
          this.#fire("channel:msg", this.id, name, message);
          this.#fire("channel:nicks", this.id, name, this.nicks(channel))
        }
      };
      break;
    }

    case "QUIT": {
      const nick = message.Prefix.Name;
      const msg = message.Params[0];

      this.channels.forEach( (channel) => {
        if (channel.remove_nick(nick)) {
          this.#fire("channel:msg", this.id, channel.name, message);
          this.#fire("channel:nicks", this.id, channel.name, this.nicks(channel))
        }
      });
      break;
    }

    case "JOIN": {
      const name = message.Params[0];
      const nick = message.Prefix.Name;

      if (nick == this.nick) {
        const channel = new Channel(name);
        this.channels.push(channel);
        this.#fire("channel:new", this.id, name, message);
      }
      else {
        const channel = this.channel(name);
        if (channel) {
          channel.add_nick(nick);
          this.#fire("channel:msg", this.id, name, message);
          this.#fire("channel:nicks", this.id, name, this.nicks(channel))
        }
      }
      break;
    }

    case "324": {
      const name = message.Params[0];
      const channel = this.channel(name)
      if (channel) {
        channel.mode = message.Params[1].substring(1);
        this.#fire("channel:mode", this.id, name, channel.mode);
      }
      break;
    }

    case "MODE":
      if (message.Prefix.Name == message.Params[0]) {
        // user mode, ignored for now
      }
      else {
        const name = message.Params[0];
        const channel = this.channel(name);
        if (channel) {
          if (message.Params[1].match(/[+-][voh]/)) {
            channel.nick_mode(message.Params[2], message.Params[1]);
            this.#fire("channel:nicks", this.id, name, this.nicks(channel))
          }
          else {
            channel.set_mode(message.Params[1]);
            this.#fire("channel:mode", this.id, name, channel.mode);
          }
          this.#fire("channel:msg", this.id, name, message);
        }
      }
      break;

    case "332": {
      const name = message.Params[1];
      const topic = message.Params[2];

      const channel = this.channel(name);
      if (channel) {
        channel.topic.value = topic;
        this.#fire("channel:topic", this.id, name, channel.topic);
      }
      break;
    }

    case "333": {
      const name = message.Params[1];
      const channel = this.channel(name);

      if (channel) {
        channel.topic.user = message.Params[2];
        channel.topic.time = message.Params[3];
        this.#fire("channel:topic", this.id, name, channel.topic)
      }
      break;
    }

    case "TOPIC": {
      const nick = message.Prefix.Name;
      const name = message.Params[0];
      const text = message.Params[1];
      const channel = this.channel(name);

      if (channel) {
        channel.topic.value = text;
        channel.topic.time = parseInt((new Date()).getTime() / 1000);
        channel.topic.user = nick;
        this.#fire("channel:msg", this.id, name, message);
        this.#fire("channel:topic", this.id, name, channel.topic);
      }
      break;
    }

    case "353": {
      const name  = message.Params[2];
      const nicks = message.Params[3].split(/\s+/);
      const channel = this.channel(name);

      if (channel) {
        if (channel.synced) {
          channel.reset_nicks();
          channel.synced = false;
        }
        for (const i in nicks) {
          if (nicks[i]) {
            const nick_mode = this.nick_mode(nicks[i]);
            channel.add_nick(nick_mode[0], nick_mode[1]);
          }
        }
      }
      break;
    }

    case "366": {
      const name = message.Params[1];
      const channel = this.channel(name);

      if (channel) {
        channel.synced = true;
        this.#fire("channel:nicks", this.id, name, this.nicks(channel))
      }
      break;
    }

    case "401":
    case "403":
    case "482": {
      const name = message.Params[1];
      this.#fire("channel:error", this.id, name,  message);
      break;
    }

    case "NOTICE": {
      const nick = message.Prefix.Name;
      const name = message.Params[0];

      if (name == this.nick)
        this.#fire("private:msg", this.id, nick, message);
      else
        this.#fire("status", this.id, message);

      break;
    }

    case "TAGMSG": {
      const nick = message.Prefix.Name;
      const name = message.Params[0];
      const text = message.Params[1];
      const priv = this.chantypes.indexOf(name[0]) == -1;
      const channel = this.channel(name);
      let type;

      if (message.Tags && message.Tags["+draft/react"]) {
        type = "react";
      } else if (message.Tags && ( message.Tags["+draft/typing"] || message.Tags["+typing"] )) {
        type = "typing";
      } else {
        return;
      }

      if (name == this.nick && priv)
        this.#fire(`private:${type}`, this.id, nick, message);
      else if (priv)
        this.#fire(`private:${type}`, this.id, name, message);
      else if (channel) {
        this.#fire(`channel:${type}`, this.id, name, message);
      }
      break;
    }

    case "PRIVMSG": {
      const nick = message.Prefix.Name;
      const name = message.Params[0];
      const text = message.Params[1];
      const priv = this.chantypes.indexOf(name[0]) == -1;
      const channel = this.channel(name);

      if (name == this.nick && priv)
        this.#fire("private:msg", this.id, nick, message);
      else if (priv)
        this.#fire("private:msg", this.id, name, message);
      else if (channel) {
        channel.bump_nick(nick);
        this.#fire("channel:msg", this.id, name, message);
      }
      break;
    }

    case "PING":
    case "PONG":
      break;

    default:
      this.#fire("status", this.id, message);
    };
  }

  channel(name) {
    name = name.toLowerCase();
    for (let i=0; i < this.channels.length; i++) {
      if (this.channels[i].name.toLowerCase() == name) {
        return this.channels[i];
      }
    }
    return false;
  }

  is_channel(name) {
    return this.chantypes.indexOf(name[0]) != -1;
  }
}
