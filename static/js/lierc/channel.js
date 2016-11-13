var Channel = function(name) {
  this.name = name;
  this.topic = "No topic set";
  this.nicks_map = {};
  this.nicks_done = true;
  this.mode = "";

  this.nicks = function() {
    var ret = {};

    for (nick in this.nicks_map) {
      var modes = this.nicks_map[nick];
      ret[nick] = "";

      if (modes.indexOf("v") != -1)
        ret[nick] = "+" + ret[nick];
      if (modes.indexOf("o") != -1)
        ret[nick] = "@" + ret[nick];
    }

    return ret;
  };

  this.reset_nicks = function() {
    this.nicks_map = {};
  };

  this.add_nick = function(nick) {
    var match = nick.match(/^([@+]*)(.+)/);
    var modes = "";

    if (match[1].indexOf("+") != -1)
      modes += "v";
    if (match[1].indexOf("@") != -1)
      modes += "o";

    this.nicks_map[match[2]] = modes;
  };

  this.set_mode = function(param) {
    var action  = param.substring(0, 1);
    var modes   = param.substring(1);

    for (var i=0; i < modes.length; i++) {
      var current = this.mode;
      var mode = modes[i];
      if (action == "+" && current.indexOf(mode) == -1)
        this.mode = current + mode;
      else if (action == "-" && current.indexOf(mode) != -1)
        this.mode = current.replace(mode, "");
    }
  };

  this.nick_mode = function(nick, param) {
    var action  = param.substring(0, 1);
    var modes   = param.substring(1);

    for (var i=0; i < modes.length; i++ ) {
      var current = this.nicks_map[nick];
      var mode = modes[i];
      if (action == "+" && current.indexOf(mode) == -1)
        this.nicks_map[nick] = current + mode;
      else if (action == "-" && current.indexOf(mode) != -1)
        this.nicks_map[nick] = current.replace(mode, "");
    }
  }

  this.contains_nick = function(nick) {
    return nick in this.nicks_map;
  };

  this.remove_nick = function(nick) {
    if (nick in this.nicks_map) {
      delete this.nicks_map[nick];
      return true;
    }
    return false;
  };

  this.rename_nick = function(old, nick) {
    if (old in this.nicks_map) {
      this.nicks_map[nick] = this.nicks_map[old];
      delete this.nicks_map[old];
      return true;
    }
    return false;
  };
};
