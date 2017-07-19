class Message {
  static render (message, force_raw) {
    if (force_raw) return Message.raw(message)
    switch (String(message.Command)) {
      case 'NICK':
        var old = message.Prefix.Name
        var nick = message.Params[0]
        message.Prefix.Name = nick
        return Message.append(
          Message.make('event', message),
          [
            Message.make_text(old + ' is now known as '),
            Message.make_nick(message),
            Message.timestamp(message)
          ]
      )

      case 'PART':
        var nick = message.Prefix.Name
        var name = message.Params[0]
        var msg = message.Params[1]
        return Message.append(
          Message.make('event', message),
          [
            Message.make_nick(message),
            Message.make_text(' has left' + (msg ? ' (' + msg + ')' : '')),
            Message.timestamp(message)
          ]
        )

      case 'MODE':
        if (message.Prefix.Nick == message.Params[0]) {
          return Message.raw(message)
        } else {
          var channel = message.Params[0]
          return Message.append(
            Message.make('event', message),
            [
              Message.make_text(message.Params.slice(1).join(' ')),
              Message.make_text(' by ' + message.Prefix.Name),
              Message.timestamp(message)
            ]
          )
        }

      case 'QUIT':
        var nick = message.Prefix.Name
        var msg = message.Params[0]
        return Message.append(
          Message.make('event', message),
          [
            Message.make_nick(message),
            Message.make_text(' has quit' + (msg ? ' (' + msg + ')' : '')),
            Message.timestamp(message)
          ]
        )

      case 'JOIN':
        var name = message.Params[0]
        var nick = message.Prefix.Name
        return Message.append(
        Message.make('event', message),
          [
            Message.make_nick(message),
            Message.make_text(' has joined the channel'),
            Message.timestamp(message)
          ]
        )

      case '332':
        var name = message.Params[1]
        var text = message.Params[2]

        var span = Message.append(
          Message.make_text(),
          [
            Message.make_text('Topic: ')
          ].concat(Format.html(text))
        )

        return Message.append(
          Message.make('event', message),
          [ span ]
        )

      case 'TOPIC':
        var nick = message.Prefix.Name
        var name = message.Params[0]
        var text = message.Params[1]

        var span = Message.append(
          Message.make_text(),
          [
            Message.make_nick(message),
            Message.make_text(' changed the topic: ')
          ].concat(Format.html(text))
        )

        return Message.append(
          Message.make('event', message),
          [
            span,
            Message.timestamp(message)
          ]
        )

      case 'PRIVMSG':
        var nick = message.Prefix.Name

        if (message.Params.length < 2) {
          return
        }

        var name = message.Params[0]
        var text = message.Params[1]

        if (!name.length || !text.length) {
          return Message.raw(message)
        }

        var from = Message.make_nick(message)
        var color = Message.string_to_color(message.Prefix.User || nick)
        var wrap = Message.make_text()
        wrap.setAttribute('class', 'message-text')
        from.style.color = color
        var msg = Message.make_text()
        msg.setAttribute('class', 'message-text-pre')
        wrap.appendChild(msg)

        if (text.substring(0, 1) == '\x01') {
          if (text.substring(1, 7) == 'ACTION') {
            from.textContent = '* ' + nick + ' '
            var action = text.substring(8).replace(/\x01$/, '')
            Message.append(msg, Format.html(action))
          } else {
            return
          }
        } else {
          from.textContent = '< ' + nick + '> '
          Message.append(msg, Format.html(text))
        }

        var hash = md5(message.Raw)
        var li = Message.make('message', message)
        li.setAttribute('data-message-hash', hash)

        return Message.append(
          li,
          [
            Message.flex(from, wrap, Message.timestamp(message)),
            Message.controls(message)
          ]
        )

      case 'NOTICE':
        var name = message.Prefix.Name
        var text = message.Params[1]

        var chan = Message.make_text(name)
        chan.setAttribute('class', 'channel')
        var span = Message.append(
        Message.make_text(' '),
        Format.html(text)
      )

        return Message.append(
          Message.make('raw notice', message),
          [chan, span]
        )

      case 'CONNECT':
        if (message.Params.length != 1) {
          return
        }

        var host = message.Prefix.Name
        var span = Message.make_text(host + ' ')
        span.setAttribute('class', 'host')

        return Message.append(
          Message.make('raw notice', message),
          [ span, message.Params[0] ]
        )

      case 'DISCONNECT':
        if (message.Params.length != 1) {
          return
        }

        var host = message.Prefix.Name
        var span = Message.make_text(host + ' ')
        span.setAttribute('class', 'host')

        return Message.append(
          Message.make('raw notice', message),
          [ span, message.Params[0] ]
        )

      default:
        return Message.raw(message)
    };
  }

  static append (node, children) {
    for (var i = 0; i < children.length; i++) {
      if (typeof (children[i]) === 'string') {
        node.appendChild(document.createTextNode(children[i]))
      } else {
        try {
          node.appendChild(children[i])
        } catch (e) {
          console.log(e, children[i])
        }
      }
    }
    return node
  }

  static make_text (text) {
    var el = document.createElement('SPAN')
    if (text) {
      el.textContent = text
    }
    return el
  }

  static make_nick (message) {
    var prefix = message.Prefix.Name +
      '!' + message.Prefix.User +
      '@' + message.Prefix.Server

    var el = document.createElement('SPAN')
    el.setAttribute('data-nick', message.Prefix.Name)
    el.setAttribute('title', prefix)
    el.classList.add('message-nick')
    el.textContent = message.Prefix.Name

    return el
  }

  static raw (message) {
    var text = ''

    if (message.Command.match(/^[45][0-9][0-9]$/)) {
      text = message.Params.join(' ')
    }
    else if (message.Command.match(/^[0-9][0-9][0-9]$/)) {
      text = message.Params.slice(1).join(' ')
    }
    else {
      text = [message.Prefix.Name, message.Command].concat(message.Params).join(' ')
    }

    var raw = Message.make('raw', message)
    raw.textContent = text
    return raw
  }

  static timestamp (message) {
    var date = new Date(message.Time * 1000)
    var h = String(date.getHours())
    if (h.length < 2) { h = '0' + h }
    var m = String(date.getMinutes())
    if (m.length < 2) { m = '0' + m }

    var time = document.createElement('TIME')
    time.setAttribute('data-time', message.Time)
    time.setAttribute('title', date.toString())
    time.textContent = h + ':' + m

    return time
  }

  static controls (message) {
    var controls = document.createElement('DIV')
    controls.classList.add('message-controls', 'popup-toggle')

    if (!message.Prefix.Self) {
      var react = document.createElement('DIV')
      react.classList.add('message-react', 'popup-toggle')
      controls.appendChild(react)
    }

    var menu = document.createElement('DIV')
    menu.classList.add('message-menu', 'popup-toggle')

    controls.appendChild(menu)

    return controls
  }

  static make (type, message) {
    var li = document.createElement('LI')
    li.classList.add('chat', message.Command.toLowerCase())
    var classes = type.split(' ')
    for (var i = 0; i < classes.length; i++) {
      li.classList.add(classes[i])
    }
    if (message.Prefix.Self) { li.classList.add('self') }
    if (message.Highlight)   { li.classList.add('highlight') }
    if (message.Search)      { li.classList.add('search') }

    if (message.Id) { li.setAttribute('data-message-id', message.Id) }
    return li
  }

  static flex () {
    var wrap = document.createElement('DIV')
    wrap.setAttribute('class', 'message-flex')
    for (var i = 0; i < arguments.length; i++) {
      wrap.appendChild(arguments[i])
    }
    return wrap
  }

  static string_to_color (str) {
    var colors = [
      'MediumVioletRed',
      'PaleVioletRed',
      'DeepPink',
      'HotPink',
      'Red',
      'DarkRed',
      'FireBrick',
      'Crimson',
      'IndianRed',
      'Orange',
      'DarkOrange',
      'Coral',
      'Tomato',
      'OrangeRed',
      'Maroon',
      'Brown',
      'Sienna',
      'SaddleBrown',
      'Chocolate',
      'Peru',
      'DarkGoldenrod',
      'Goldenrod',
      'MidnightBlue',
      'MediumBlue',
      'Blue',
      'RoyalBlue',
      'SteelBlue',
      'CornflowerBlue',
      'DodgerBlue',
      'DeepSkyBlue',
      'LightSkyBlue',
      'SkyBlue',
      'MediumSlateBlue',
      'SlateBlue',
      'DarkSlateBlue',
      'Indigo',
      'Purple',
      'DarkMagenta',
      'DarkOrchid',
      'DarkViolet'
    ]

    var c = 0
    var m = colors.length

    for (var i = 0; i < str.length; i++) {
      c = ((c << 5) + str.charCodeAt(i)) % m
    }

    return colors[c]
  }
}
