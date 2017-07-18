class Channel {
  constructor (name) {
    this.name = name

    this.topic = {
      value: 'No topic set',
      user: null,
      time: null
    }

    this.nicks = []
    this.nick_modes = {}
    this.synced = true
    this.mode = ''
  }


  reset_nicks () {
    this.nicks.splice(0, this.nicks.length)
    this.nick_modes = {}
  }

  bump_nick (nick) {
    var i = this.nicks.indexOf(nick)
    if (i != -1) {
      this.nicks.splice(i, 1)
      this.nicks.unshift(nick)
    }
  }

  add_nick (nick, mode) {
    if (!mode) mode = ''
    this.nicks.unshift(nick)
    this.nick_modes[nick] = mode
  }

  set_mode (param) {
    var action = param.substring(0, 1)
    var modes = param.substring(1)

    for (var i = 0; i < modes.length; i++) {
      var current = this.mode
      var mode = modes[i]
      if (action == '+' && current.indexOf(mode) == -1) {
        this.mode = current + mode
      }
      else if (action == '-' && current.indexOf(mode) != -1) {
        this.mode = current.replace(mode, '')
      }
    }
  }

  nick_mode (nick, param) {
    var action = param.substring(0, 1)
    var modes = param.substring(1)

    for (var i = 0; i < modes.length; i++) {
      var current = this.nick_modes[nick]
      var mode = modes[i]
      if (action == '+' && current.indexOf(mode) == -1) {
        this.nick_modes[nick] = current + mode
      }
      else if (action == '-' && current.indexOf(mode) != -1) {
        this.nick_modes[nick] = current.replace(mode, '')
      }
    }
  }

  contains_nick (nick) {
    return this.nicks.indexOf(nick) != -1
  }

  remove_nick (nick) {
    var i = this.nicks.indexOf(nick)

    if (i != -1) {
      this.nicks.splice(i, 1)
      delete this.nick_modes[nick]
      return true
    }

    return false
  }

  rename_nick (old, nick) {
    var i = this.nicks.indexOf(nick)
    if (i != -1) {
      this.nicks.splice(i, 1, nick)
      this.nick_modes[nick] = this.nick_modes[old]
      delete this.nick_modes[old]
      return true
    }
    return false
  }
}
