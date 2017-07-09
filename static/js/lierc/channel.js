var Channel = function(name) {
  this.name = name;

  this.topic = {
    value: "No topic set",
    user: null,
    time: null
  };

  this.nicks = [];
  this.nick_modes;
  this.synced = true;
  this.mode = "";

  this.reset_nicks = function() {
    this.nicks.splice(0, this.nicks.length);
    this.nick_modes = {};
  };

  this.bump_nick = function(nick) {
    var i = this.nicks.indexOf(nick);
    if (i != -1) {
      this.nicks.splice(i, 1);
      this.nicks.unshift(nick);
    }
  };

  this.add_nick = function(nick, mode) {
    if (!mode) mode = "";
    this.nicks.unshift(nick);
    this.nick_modes[nick] = mode;
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
      var current = this.nick_modes[nick];
      var mode = modes[i];
      if (action == "+" && current.indexOf(mode) == -1)
        this.nick_modes[nick] = current + mode;
      else if (action == "-" && current.indexOf(mode) != -1)
        this.nick_modes[nick] = current.replace(mode, "");
    }
  }

  this.contains_nick = function(nick) {
    return this.nicks.indexOf(nick) != -1;
  };

  this.remove_nick = function(nick) {
    var i = this.nicks.indexOf(nick);

    if (i != -1) {
      this.nicks.splice(i, 1);
      delete this.nick_modes[nick];
      return true;
    }

    return false;
  };

  this.rename_nick = function(old, nick) {
    var i = this.nicks.indexOf(nick);
    if (i != -1) {
      this.nicks.splice(i, 1, nick);
      this.nick_modes[nick] = this.nick_modes[old];
      delete this.nick_modes[old];
      return true;
    }
    return false;
  };
};
