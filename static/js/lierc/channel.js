var Channel = function(name) {
  this.name = name;
  this.topic = "No topic set";
  this.nicks = [];
  this.nicks_done = true;

  this.contains_nick = function(nick) {
    return this.nicks.indexOf(nick) != -1;
  };

  this.remove_nick = function(nick) {
    var i = this.nicks.indexOf(nick);
    if (i != -1) {
      this.nicks.splice(i, 1);
      return true;
    }
    return false;
  };

  this.rename_nick = function(old, nick) {
    var i = this.nicks.indexOf(old);
    if (i != -1) {
      this.nicks.splice(i, 1, nick);
      return true;
    }
    return false;
  };
};
