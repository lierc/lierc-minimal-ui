class Commands {
  constructor (lierc) {
    this.lierc = lierc;
  }

  static handlers = {};

  static add_command (name, aliases, handler) {
    Commands.handlers[name] = handler
    aliases.forEach( alias => {
      Commands.handlers[alias] = handler
    })
  }

  handle (panel, line) {
    var parts = line.split(' ', 1)
    var command = parts[0].toLowerCase()

    if (command in Commands.handlers) {
      var rest = line.substring(command.length)
      return Commands.handlers[command](this.lierc, panel, rest.trim())
    }

    throw 'Unknown command ' + parts[0]
  }
}

Commands.add_command('help', ['h'], (lierc, panel, line) => {
  lierc.new_dialog('help')
})

Commands.add_command('panel', ['p'], (lierc, panel, line) => {
  var parts = line.split(' ', 2)
  var action = parts[0]
  var rest = parts[1]

  switch (action) {
  case 'move':
    var order = parseInt(rest)
    var li = panel.elem.nav
    var ul = li.parentNode
    var before = ul.querySelectorAll('li:not([data-panel-id="' + panel.id + '"])')[order - 1]
    if (before) {
      ul.removeChild(li)
      ul.insertBefore(li, before)
      lierc.save_channel_order()
    } else {
      alert("Invalid position: '" + order + "'")
    }
    break
  default:
    alert("Unknown command: 'panel " + line + "'")
  }
})

Commands.add_command('join', ['j'], (lierc, panel, line) => {
  var parts = ['JOIN', line]
  return parts.join(' ')
})

Commands.add_command('nick', [], (lierc, panel, line) => {
  var parts = ['NICK', line]
  return parts.join(' ')
})

Commands.add_command('mode', [], (lierc, panel, line) => {
  var parts = ['MODE', panel.name]
  if (line) {
    parts.push(line)
  }
  return parts.join(' ')
})

Commands.add_command('last', ['lastlog', 'l'], (lierc, panel, line) => {
  if (panel.type == 'status') {
    throw 'Can not search on a status panel.'
  }

  if (!line) {
    throw 'Search text required'
  }

  lierc.search_panel(panel, line)
})

Commands.add_command('clear', [], (lierc, panel) => {
  panel.backlog_empty = true
  panel.remove_observers(panel.elem.list)
  panel.elem.list.get(0).innerHTML = ''
})

Commands.add_command('bustin', ['bust'], (lierc, panel) => {
  var url = ':https://www.youtube.com/watch?v=0tdyU_gW6WE'
  return ['PRIVMSG', panel.name, url].join(' ')
})

Commands.add_command('trim', ['prune'], (lierc, panel) => {
  panel.prune()
})

Commands.add_command('part', ['close', 'wc'], (lierc, panel, line) => {
  if (panel.type == 'status') {
    throw 'Can not close status panel.'
  }

  if (panel.type == 'private') {
    lierc.close_panel(panel.id)
    return
  }

  var parts = ['PART', panel.name]

  if (line) { parts.push(':' + line) }

  return parts.join(' ')
})

Commands.add_command('who', [], (lierc, panel, line) => {
  var parts = ['WHO', ':' + line]
  return parts.join(' ')
})

Commands.add_command('whois', [], (lierc, panel, line) => {
  var parts = ['WHOIS', ':' + line]
  return parts.join(' ')
})

Commands.add_command('names', ['n', 'nicks'], (lierc, panel, line) => {
  var parts = ['NAMES']
  if (!line) {
    parts.push(':' + panel.name)
  } else {
    parts.push(':' + line)
  }
  document.querySelector('#toggle-nicks').click()
  return parts.join(' ')
})

Commands.add_command('say', [''], (lierc, panel, line) => {
  return ['PRIVMSG', panel.name, ':' + line].join(' ')
})

Commands.add_command('query', ['q', 'msg'], (lierc, panel, line) => {
  var args = line.split(' ', 1)
  var rest = line.substring(args[0].length).trim()

  if (!rest.length) {
    var connection = panel.connection
    lierc.add_panel(args[0], connection, true)
    return
  }

  var parts = ['PRIVMSG', args[0]]
  parts.push(':' + rest)

  return parts.join(' ')
})

Commands.add_command('me', [], (lierc, panel, line) => {
  var parts = ['PRIVMSG', panel.name]
  parts.push(':' + '\x01' + 'ACTION ' + line)
  return parts.join(' ')
})

Commands.add_command('topic', ['t'], (lierc, panel, line) => {
  if (panel.type != 'channel') {
    throw 'TOPIC only works for channels'
  }

  var parts = ['TOPIC', panel.name]

  if (line) { parts.push(':' + line) }

  return parts.join(' ')
})

Commands.add_command('quote', ['raw'], (lierc, panel, line) => {
  return line
})

Commands.add_command('collapse', [], (lierc, panel, line) => {
  panel.set_collapse_embeds(true)
})

Commands.add_command('expand', [], (lierc, panel, line) => {
  panel.set_collapse_embeds(false)
})


