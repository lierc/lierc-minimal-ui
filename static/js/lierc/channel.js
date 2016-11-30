var Channel = function(name) {
  this.name = name;

  this.topic = {
    value: "No topic set",
    user: null,
    time: null
  };

  this.nicks = {};
  this.synced = true;
  this.mode = "";

  this.reset_nicks = function() {
    this.nicks = {};
  };

  this.add_nick = function(nick, mode) {
    if (!mode) mode = "";
    this.nicks[nick] = mode;
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
      var current = this.nicks[nick];
      var mode = modes[i];
      if (action == "+" && current.indexOf(mode) == -1)
        this.nicks[nick] = current + mode;
      else if (action == "-" && current.indexOf(mode) != -1)
        this.nicks[nick] = current.replace(mode, "");
    }
  }

  this.contains_nick = function(nick) {
    return nick in this.nicks;
  };

  this.remove_nick = function(nick) {
    if (nick in this.nicks) {
      delete this.nicks[nick];
      return true;
    }
    return false;
  };

  this.rename_nick = function(old, nick) {
    if (old in this.nicks) {
      this.nicks[nick] = this.nicks[old];
      delete this.nicks[old];
      return true;
    }
    return false;
  };
};
