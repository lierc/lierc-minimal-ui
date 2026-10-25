export class Channel {
  constructor(name) {
    this.name = name;

    this.topic = {
      value: "No topic set",
      user: null,
      time: null
    };

    this.nicks = [];
    this.nick_modes = {};
    this.synced = true;
    this.mode = "";
  }

  reset_nicks() {
    this.nicks.splice(0, this.nicks.length);
    this.nick_modes = {};
  }

  bump_nick(nick) {
    const i = this.nicks.indexOf(nick);
    if (i != -1) {
      this.nicks.splice(i, 1);
      this.nicks.unshift(nick);
    }
  }

  add_nick(nick, mode) {
    if (!mode) mode = "";
    this.nicks.unshift(nick);
    this.nick_modes[nick] = mode;
  }

  set_mode(param) {
    const action  = param.substring(0, 1);
    const modes   = param.substring(1);

    for (let i=0; i < modes.length; i++) {
      const current = this.mode;
      const mode = modes[i];
      if (action == "+" && current.indexOf(mode) == -1)
        this.mode = current + mode;
      else if (action == "-" && current.indexOf(mode) != -1)
        this.mode = current.replace(mode, "");
    }
  }

  nick_mode(nick, param) {
    const action  = param.substring(0, 1);
    const modes   = param.substring(1);

    for (let i=0; i < modes.length; i++ ) {
      const current = this.nick_modes[nick];
      const mode = modes[i];
      if (action == "+" && current.indexOf(mode) == -1)
        this.nick_modes[nick] = current + mode;
      else if (action == "-" && current.indexOf(mode) != -1)
        this.nick_modes[nick] = current.replace(mode, "");
    }
  }

  contains_nick(nick) {
    return this.nicks.indexOf(nick) != -1;
  }

  remove_nick(nick) {
    const i = this.nicks.indexOf(nick);

    if (i != -1) {
      this.nicks.splice(i, 1);
      delete this.nick_modes[nick];
      return true;
    }

    return false;
  }

  rename_nick(old, nick) {
    const i = this.nicks.indexOf(old);
    if (i != -1) {
      this.nicks.splice(i, 1, nick);
      this.nick_modes[nick] = this.nick_modes[old];
      delete this.nick_modes[old];
      return true;
    }
    return false;
  }
}
