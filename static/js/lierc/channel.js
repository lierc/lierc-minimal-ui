var Channel = function(name) {
  this.name = name;
  this.topic = "No topic set";
  this.nicks_map = {};
  this.nicks_done = true;

  this.nicks = function() {
    return Object.keys(this.nicks_map);
  };

  this.reset_nicks = function() {
    this.nicks_map = {};
  };

  this.add_nick = function(nick) {
    this.nicks_map[nick] = nick;
  };

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
