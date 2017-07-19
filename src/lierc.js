if (!('forEach' in NodeList)) {
  NodeList.prototype.forEach = Array.prototype.forEach
}

class Lierc {
  constructor (url, user) {
    this.user = user
    this.api = new API(url)
    this.commands = new Commands(lierc)
    this.stream
    this.connections = {}
    this.filling_backlog = false
    this.dialog = null
    this.sorting = []
    this.last_seen = {}
    this.missed = {}
    this.panels = {}
    this.focused = null
    this.last_panel_id = null
    this.window_focused = true
    this.default_panel = null
    this.default_focused = false
    this.prefs = {}
    this.touchstart = 'ontouchstart' in document.documentElement
    this.mobile = detect_mobile()
    this.post_tokens = []

    this.elem = {
      panel: document.getElementById('panel'),
      nav: document.getElementById('nav'),
      'status': document.getElementById('status'),
      privates: document.getElementById('privates'),
      channels: document.getElementById('channels'),
      input: document.getElementById('input'),
      topic: document.getElementById('topic'),
      filler: document.getElementById('filler'),
      prefix: document.getElementById('prefix'),
      scroll: document.getElementById('panel-scroll'),
      title: document.getElementsByTagName('title')[0],
      nicks: document.getElementById('nicks'),
      body: document.body,
      audio: new Audio('/static/ent_communicator1.mp3'),
      emoji: document.getElementById('emoji'),
      switcher: document.getElementById('switcher-wrap'),
      panel_name: document.getElementById('panel-name'),
      flex_wrap: document.querySelector('.flex-wrap'),
      reconnect: document.getElementById('reconnect-status')
    }

    if (!this.mobile) {
      document.querySelectorAll('.sortable').forEach( el => {
          Sortable.create(el, {
              delay: 0,
              onSort: e => {
                this.save_channel_order()
              }
            })
        })
    }

    this.get_prefs( prefs => {
      this.prefs = prefs
      this.sorting = this.prefs['sorting'] || []
      delete this.prefs['sorting']

      if (this.prefs['email'] === true) {
        document.getElementById('email-notify')
          .classList.add('enabled')
      }

      this.load_seen( () => {
        this.load_token( () => {
          this.init()
        })
      })
    })

    var events = new UIEvents(lierc)
    Emoji.load()
    setInterval(this.check_scroll, 250)
    setInterval(this.ping_server, 1000 * 15)
  }

  static panel_id (name, connection) {
    return [connection, name.toLowerCase()].join('-')
  }

  set_connected (conn_id, status, message) {
    var connection = this.connections[conn_id]
    connection.connected = status

    for (id in this.panels) {
      var panel = this.panels[id]
      if (panel.connection == conn_id) {
        panel.set_connected(status, message)
      }
    }
  }

  setup_connection (id, host, nick) {
    if (this.connections[id]) { return }

    var connection = new Connection(id, host)
    this.connections[id] = connection

    var panel = this.add_panel('status', connection.id)
    panel.change_name(host)
    panel.update_topic({value: 'status.'})

    connection.on('channel:new', (conn, channel, message) => {
      this.add_panel(channel, conn, ('Id' in message))
    })

    connection.on('private:msg', (conn, nick, message) => {
      var panel = this.add_panel(nick, conn, false)
      var connection = this.connections[conn]
      var from = message.Prefix.Name != connection.nick

      panel.append(Message.render(message))

      if (from && (!this.is_focused(panel) || !panel.is_scrolled())) { this.elem.audio.play() }
    })

    connection.on('channel:msg', (conn, channel, message) =>  {
      var panel = this.get_panel(channel, conn)
      var html = Message.render(message)
      if (html) {
        panel.append(html)

        if (message.Highlight && (!this.is_focused(panel) || !panel.is_scrolled())) { this.elem.audio.play() }
      }
    })

    connection.on('channel:react', (conn, channel, message) => {
      var panel = this.get_panel(channel, conn)
      var parts = message.Params[1].split(' ')
      panel.handle_reaction(message.Prefix.Name, parts[1], parts[2])
    })

    connection.on('private:react', (conn, nick, message) => {
      var panel = this.get_panel(nick, conn)
      var parts = message.Params[1].split(' ')
      panel.handle_reaction(message.Prefix.Name, parts[1], parts[2])
    })

    connection.on('channel:nicks', (conn, channel, nicks) =>  {
      var panel = this.get_panel(channel, conn)
      if (panel.focused) { panel.update_nicks(nicks) }
    })

    connection.on('channel:mode', (conn, channel, mode) => {
      var panel = this.get_panel(channel, conn)
      panel.update_mode(mode)
    })

    connection.on('channel:close', (conn, channel) => {
      this.remove_panel(panel_id(channel, conn))
    })

    connection.on('status:raw', (conn, message) => {
      var panel = this.get_panel('status', conn)
      panel.append(Message.render(message, true))
    })

    connection.on('status', (conn, message) =>  {
      var panel = this.get_panel('status', conn)
      panel.append(Message.render(message))
    })

    connection.on('connect', (conn, message) => {
      this.set_connected(conn, true, message.Params[0])
    })

    connection.on('disconnect', (conn, message) => {
      this.set_connected(conn, false, message.Params[0])
    })

    connection.on('channel:topic', (conn, channel, topic) => {
      var panel = this.get_panel(channel, conn)
      panel.update_topic(topic)
    })
  }

  is_focused (panel) {
    return this.window_focused && this.focused && this.focused.id == panel.id
  }

  find_default_panel () {
    var parts = window.location.hash.split('/').slice(1)
    if (parts.length == 2) {
      return panel_id(decodeURIComponent(parts[1]), parts[0])
    } else if (this.sorting.length) {
      return this.sorting[0]
    }
    return null
  }

  init () {
    this.default_panel = this.find_default_panel()
    this.api.get('/connection', {
      success: configs => {
        if (!configs.length) { this.config_modal() }

        configs.forEach( conn => {
          var conn_id = conn.Id
          var host = conn.Config.Alias || conn.Config.Host
          var nick = conn.Nick
          this.setup_connection(conn_id, host, nick)
        })

        if (this.stream) { this.stream.destroy() }

        this.connect()
      }
    })
  }

  add_recent_privates () {
    this.api.get('/privates', {
      success: privates => {
        privates.forEach( priv => {
          this.add_panel(priv.nick, priv.connection, false)
        })
      }
    })
  }

  connect () {
    var stream = this.api.stream()

    stream.on('message', e => {
      var conn_id = e.ConnectionId
      var message = e.Message

      if (e.MessageId) { message.Id = e.MessageId }
      message.Highlight = e.Highlight

      if (this.connections[conn_id]) {
        this.connections[conn_id].on_message(message)
      }
    })

    stream.on('create_connection', e => {
      var conn_id = e.ConnectionId
      var message = e.Message
      var nick = message.Params[0]
      var host = message.Params[1]
      this.setup_connection(conn_id, host, nick)
    })

    stream.on('delete_connection', e => {
      var conn_id = e.ConnectionId

      for (id in this.panels) {
        var panel = this.panels[id]
        if (panel.connection == conn_id) {
          this.remove_panel(id)
        }
      }

      delete this.connections[conn_id]
    })

    stream.on('close', e => {
      for (id in this.panels) {
        this.panels[id].set_disabled(true)
      }
      if (this.focused) {
        this.focused.scroll( () => {
          this.elem.body.classList.add('disconnected')
        })
      } else {
        this.elem.body.classList.add('disconnected')
      }
    })

    stream.on('reconnect-status', text => {
      if (this.focused) {
        this.focused.scroll( () => {
          this.elem.reconnect.textContent = text
        })
      } else {
        this.elem.reconnect.textContent = text
      }
    })

    stream.on('open', e => {
      this.elem.body.classList.remove('disconnected')
      if (this.focused) {
        if (stream.last_id) {
          this.fill_missed(stream.last_id)
        }
      }

      for (var id in this.panels) {
        this.panels[id].set_disabled(false)
        if (!this.focused || id != this.focused.id) {
          this.panels[id].clear_lists()
        }
      }
    })

    this.sync_missed()
    this.add_recent_privates()
    this.stream = stream
  }

  get_panel (name, connection) {
    var id = panel_id(name, connection)
    return this.panels[id]
  }

  close_panel (id) {
    var panel = this.panels[id]
    if (panel.type == 'private') {
      var path = '/connection/' + panel.connection + '/nick/' + encodeURIComponent(panel.name)
      this.api.delete(path)
    }
    this.remove_panel(id)
  }

  remove_panel (id) {
    if (!this.panels[id]) { return }

    var focused = id == this.focused.id
    this.panels[id].remove_elems()
    delete this.panels[id]

    if (focused) {
      if (this.last_panel_id && this.panels[this.last_panel_id]) {
        this.focus_panel(this.last_panel_id)
      }
      else if (Object.keys(this.panels).length) {
        this.focus_panel(Object.keys(this.panels)[0])
      }
      else {
        this.focused = null
      }
    }

    this.update_nav_counts()
  }

  update_nav_counts () {
    this.elem.status
      .previousSibling.previousSibling
      .querySelector('.count')
      .textContent = this.elem.status.querySelectorAll('li').length

    this.elem.privates
      .previousSibling.previousSibling
      .querySelector('.count')
      .textContent = this.elem.privates.querySelectorAll('li').length

    this.elem.channels
      .previousSibling.previousSibling
      .querySelector('.count')
      .textContent = this.elem.channels.querySelectorAll('li').length
  }

  add_panel (name, connection, focus) {
    var id = panel_id(name, connection)

    if (this.panels[id]) { return this.panels[id] }

    if (!this.connections[connection]) {
      console.log('Connection does not exist', connection)
      throw 'Connection does not exist'
    }

    var conn = this.connections[connection]
    var panel = new Panel(name, id, conn, this.mobile)
    if (this.last_seen[panel.id]) { panel.last_seen = this.last_seen[panel.id] }
    panel.update_nav()

    if (panel.type == 'channel') {
      var channel = conn.channel(panel.name)
      panel.editor.completion.completions = channel.nicks
    }

    this.panels[id] = panel

    if (panel.type == 'status') { this.elem.status.append(panel.elem.nav) } else if (panel.type == 'private') { this.elem.privates.append(panel.elem.nav) } else { this.insert_sorted_nav(panel) }

    this.update_nav_counts()

    if (panel.type == 'channel') { this.ignore_events_pref(panel) }

    this.collapse_embeds_pref(panel)
    this.monospace_nicks_pref(panel)

    panel.elem.nav.addEventListener('click', e => {
      e.preventDefault()

      this.elem.flex_wrap.classList.remove('open')

      var id = this.getAttribute('data-panel-id')
      var panel = this.panels[id]

      if (e.target.classList.contains('close-panel')) {
        if (panel.type == 'channel') {
          this.part_channel(panel.name, panel.connection)
        }
        else if (panel.type == 'status') {
          this.delete_connection(panel.connection)
        }
        else {
          this.close_panel(id)
        }
      } else if (e.target.classList.contains('edit-panel')) {
        this.api.get('/connection/' + panel.connection, {
          success: res => {
            this.config_modal(null, res)
          },
          error: e => {
            alert(e)
          }
        })
      } else {
        this.focus_panel(id)
      }
    })

    // force focusing or no focused panel
    if (focus === true || !this.focused) {
      this.focus_panel(id)
    }
    // this channel was in the URL on load
    else if (this.default_panel && id == this.default_panel) {
      this.default_panel = null
      this.default_focused = true
      this.focus_panel(id)
    }
    // focus the first channel added
    else if (!this.default_focused && panel.type == 'channel' && this.channel_panels() == 1) {
      this.focus_panel(id)
    }

    if (!panel.focused && this.missed[panel.id]) { this.apply_missed(panel, this.missed[panel.id]) }

    delete this.missed[panel.id]

    return this.panels[id]
  }

  apply_missed (panel, missed) {
    if (missed.messages) {
      panel.unread = true
      if (panel.type == 'private') { panel.highlighted = true }
      panel.update_nav()
    } else if (missed.events) {
      panel.missed = true
      panel.update_nav()
    }
  }

  post_token () {
    var token = this.post_tokens.pop()
    if (!token) {
      alert('No post tokens, tell Lee!')
      throw Error('No tokens')
    }
    return token
  }

  part_channel (name, connection) {
    if (!confirm('Are you sure you want to leave ' + name + '?')) { return }

    var headers = new Headers()
    headers.append('lierc-token', this.post_token())
    headers.append('content-type', 'application/irc')

    this.api.post('/connection/' + connection, {
      body: 'PART ' + name,
      headers: headers,
      success: res => {
        this.remove_panel(panel_id(name, connection))
        this.post_tokens.push(res.token)
      },
      error: e => {
        alert('Error: ' + e)
        this.load_token()
      }
    })
  }

  delete_connection (connection) {
    if (!confirm('Are you sure you want to remove this connection?')) { return }
    this.api.delete('/connection/' + connection, {
      error: e => { alert(e) }
    })
  }

  channel_panels () {
    var panels = 0
    for (id in this.panels) {
      if (this.panels[id].type == 'channel') { panels++ }
    }
    return panels
  }

  insert_sorted_nav (panel) {
    var index = this.sorting.indexOf(panel.id)
    if (index == -1) {
      this.elem.channels.appendChild(panel.elem.nav)
      this.save_channel_order()
      return
    }
    var items = this.elem.channels.childNodes
    for (var i = 0; i < items.length; i++) {
      var id = items[i].getAttribute('data-panel-id')
      if (index < this.sorting.indexOf(id)) {
        this.elem.channels.insertBefore(panel.elem.nav, items[i])
        return
      }
    }

    this.elem.channels.appendChild(panel.elem.nav)
  }

  fill_missed (start) {
    this.api.get('/log/' + start, {
      success: events =>  {
        for (var i = 0; i < events.length; i++) {
          this.stream.fire('message', events[i])
        }
      },
      error: e => {
        this.reset()
      }
    })
  }

  fill_backlog (panel, msgid) {
    if (panel.backlog_empty) return

    var connection = this.connections[panel.connection]
    if (!connection) return

    panel.set_loading(true)

    var limit = panel.ignore_events ? 150 : 50
    var name = panel.type == 'status' ? 'status' : panel.name
    var parts = [
      'connection', connection.id, 'channel', encodeURIComponent(name), 'events'
    ]

    if (msgid) { parts.push(msgid) }

    this.api.get('/' + parts.join('/'), {
      data: { limit: limit },
      success: events => {
        if (events.length < limit) { panel.backlog_empty = true }

        var list = []
        var reactions = []

        events.forEach( e =>  {
          var message = e.Message
          message.Id = e.MessageId
          message.Highlight = e.Highlight

          if (this.is_reaction(message)) { reactions.push(message) } else {
            var el = Message.render(message)
            if (el) { list.push(el) }
          }
        })

        panel.prepend(list)
        this.filling_backlog = false

        reactions.forEach( reaction => {
          var parts = reaction.Params[1].split(' ')
          panel.handle_reaction(reaction.Prefix.Name, parts[1], parts[2])
        })

        panel.react_backlog_check()
        panel.set_loading(false)
      },
      error: e => {
        this.filling_backlog = false
        panel.set_loading(false)
        console.log(e)
      }
    })
  }

  is_reaction (message) {
    return message.Command == 'PRIVMSG' &&
    (message.Params[1] || '').substring(0, 5) == '\x01' + 'FACE'
  }

  prev_panel () {
    var items = this.elem.nav.querySelectorAll('li')
    for (var i = items.length - 1; i >= 0; i--) {
      var item = items[i]
      if (item.classList.contains('active') && items[i - 1]) {
        var id = items[i - 1].getAttribute('data-panel-id')
        this.focus_panel(id)
        return
      }
    }
  }

  prev_unread_panel () {
    var items = this.elem.nav.querySelectorAll('li')
    for (var i = items.length - 1; i >= 0; i--) {
      var item = items[i]
      if (item.classList.contains('active')) {
        for (var j = i; j > 0; j--) {
          var item = items[j - 1]
          if (item.classList.contains('unread')) {
            var id = item.getAttribute('data-panel-id')
            this.focus_panel(id)
            return
          }
        }
        return
      }
    }
  }

  next_panel () {
    var items = this.elem.nav.querySelectorAll('li')
    for (var i = 0; i < items.length; i++) {
      var item = items[i]
      if (item.classList.contains('active') && items[i + 1]) {
        var id = items[i + 1].getAttribute('data-panel-id')
        this.focus_panel(id)
        return
      }
    }
  }

  next_unread_panel () {
    var items = this.elem.nav.querySelectorAll('li')
    for (var i = 0; i < items.length; i++) {
      var item = items[i]
      if (item.classList.contains('active')) {
        for (var j = i; j < items.length; j++) {
          var item = items[j + 1]
          if (item.classList.contains('unread')) {
            var id = item.getAttribute('data-panel-id')
            this.focus_panel(id)
            return
          }
        }
        return
      }
    }
  }

  focus_panel (id) {
    if (this.focused) {
      if (this.focused.id == id) { return }
      this.last_panel_id = this.focused.id
    }

    if (this.elem.switcher.classList.contains('open')) {
      this.hide_switcher()
    }

    var panel = this.panels[id]

    if (!panel) { return }

    this.elem.panel_name.textContent = panel.name
    this.replace_child('panel', panel.elem.list)
    this.replace_child('input', panel.elem.input)
    this.replace_child('topic', panel.elem.topic)
    this.replace_child('filler', panel.elem.filler)
    this.replace_child('prefix', panel.elem.prefix)

    this.elem.body.setAttribute('data-panel-type', panel.type)
    this.replace_child('nicks', panel.elem.nicks)

    this.elem.title.textContent = panel.name

    if (this.focused) {
      this.focused.unfocus()
      this.save_seen(this.focused)
    }

    // this.scroll_to_nav(panel.elem.nav);

    if (panel.first_focus && panel.type == 'channel') { this.show_nicklist_pref(panel) }

    panel.focus()
    this.focused = panel
    window.history.replaceState({}, '', panel.path)
    this.check_scroll()

    if (panel.type == 'channel') {
      var conn = this.connections[panel.connection]
      panel.update_nicks(
        conn.nicks(conn.channel(panel.name))
      )
    }
  }

  replace_child (p, c) {
    p = this.elem[p]
    while (p.firstChild) {
      p.removeChild(p.firstChild)
    }
    p.appendChild(c)
  }

  config_modal (e, connection) {
    if (e) e.preventDefault()

    var vars = {}

    if (connection) {
      var config = connection.Config
      vars.Host = config.Host
      vars.Port = config.Port
      vars.Ssl = config.Ssl
      vars.Nick = config.Nick
      vars.User = config.User
      vars.Pass = config.Pass
      vars.Alias = config.Alias
      vars.Channels = config.Channels.join(', ')
      vars.Highlight = config.Highlight.join(', ')

      vars.action = '/connection/' + connection.Id
      vars.method = 'PUT'
      vars.edit = true
    } else {
      vars.Nick = this.user.user
      vars.User = this.user.user
      vars.Highlight = this.user.user

      if (Object.keys(this.connections).length == 0) {
        vars.Host = 'irc.freenode.com'
        vars.Port = '6697'
        vars.Ssl = true
        vars.Channels = '#lierc'
        vars.Alias = 'freenode'
      }

      vars.action = '/connection'
      vars.method = 'POST'
      vars.edit = false
    }

    this.elem.flex_wrap.classList.remove('open')

    var dialog = this.new_dialog('connection', vars)

    var del = dialog.el.querySelector('.delete-connection')
    if (del && connection) {
      del.addEventListener('click', e => {
        e.preventDefault()
        this.delete_connection(connection.Id)
        this.close_dialog()
      })
    }

    dialog.el.addEventListener('submit', e => {
      e.preventDefault()
      var form = e.target
      var method = form.getAttribute('method')
      var action = form.getAttribute('action')

      var data = {
        Host: form.querySelector('input[name="Host"]').value,
        Port: parseInt(form.querySelector('input[name="Port"]').value),
        Ssl: form.querySelector('input[name="Ssl"]').checked,
        Nick: form.querySelector('input[name="Nick"]').value,
        User: form.querySelector('input[name="User"]').value,
        Pass: form.querySelector('input[name="Pass"]').value,
        Alias: form.querySelector('input[name="Alias"]').value,
        Channels: form.querySelector('input[name="Channels"]').value.split(/\s*,\s*/),
        Highlight: form.querySelector('input[name="Highlight"]').value.split(/\s*,\s*/)
      }

      this.api.request(method, action, {
        body: JSON.stringify(data),
        success: res => {
          this.close_dialog()
        },
        error: e => {
          alert("i'm sorry")
        }
      })
    })
  }

  check_scroll () {
    if (this.filling_backlog ||
      !this.focused ||
      this.focused.backlog_empty ||
      this.overlayed() ||
      !this.connections[this.focused.connection] ||
      this.elem.flex_wrap.classList.contains('open') ||
      getComputedStyle(this.elem.scroll).display == 'none') {
      return
    }

    if (this.elem.scroll.scrollTop <= 150) {
      this.filling_backlog = true
      this.fill_backlog(
        this.focused, this.focused.oldest_message_id()
      )
    }
  }

  ping_server () {
    this.api.auth(
      res => {
        if (res.status == 200) { return }

        if (res.status == 401) {
          // window.location.reload();
          return
        }

        console.log(res.status)

        // ping failed, force a reconnect of stream...
        if (res.status == 0) {
          this.stream.close()
          return
        }

        var data = res.json()
        if (data['error']) {
          console.log(data['error'])
        }
      }
    )
  }

  get_prefs (cb) {
    this.api.get('/preference', {
      success: data => {
        var prefs = {}
        for (var i = 0; i < data.length; i++) {
          try {
            prefs[data[i].name] = JSON.parse(data[i].value)
          } catch (e) {
            console.log('Unable to parse JSON: ', data[i].value)
          }
        }
        cb(prefs)
      },
      error: e => { alert(e) }
    })
  }

  get_pref (name) {
    return this.prefs[name]
  }

  show_nicklist_pref (panel) {
    var value = this.get_pref(panel.id + '-show-nicklist')
    if (value != undefined) { panel.set_show_nicklist(value) }
  }

  ignore_events_pref (panel) {
    var value = this.get_pref(panel.id + '-ignore-events')
    if (value !== undefined) { panel.set_ignore_events(value) }
  }

  collapse_embeds_pref (panel) {
    var value = this.get_pref(panel.id + '-collapse-embeds')
    if (value !== undefined) { panel.set_collapse_embeds(value) }
  }

  monospace_nicks_pref (panel) {
    var value = this.get_pref(panel.id + '-monospace-nicks')
    if (value !== undefined) { panel.monospace_nicks = value }
  }

  add_monospace_nick (panel, nick) {
    panel.add_monospace_nick(nick)
    this.update_pref(panel.id + '-monospace-nicks', panel.monospace_nicks)
  }

  remove_monospace_nick (panel, nick) {
    panel.remove_monospace_nick(nick)
    this.update_pref(panel.id + '-monospace-nicks', panel.monospace_nicks)
  }

  update_pref (name, value) {
    this.prefs[name] = value
    this.api.post('/preference/' + encodeURIComponent(name), {
      body: JSON.stringify(value)
    })
  }

  load_token (cb) {
    this.api.get('/token', {
      success: data => {
        this.post_tokens.push(data.token)
        if (data.extra) {
          this.post_tokens = this.post_tokens.concat(data.extra)
        }
        if (cb) cb()
      },
      error: e => {
        if (cb) cb()
      }
    })
  }

  load_seen (cb) {
    this.api.get('/seen', {
      success: res => {
        for (i in res) {
          var id = panel_id(res[i]['channel'], res[i]['connection'])
          this.last_seen[id] = res[i]['message_id']
        }
        cb()
      },
      error: e => {
        cb()
      }
    })
  }

  save_seen (panel, force) {
    var diffs = 0
    var id = panel.id
    var last_seen = panel.last_seen
    var send = last_seen && last_seen != this.last_seen[id]

    if (send || force) {
      var parts = [
        'connection', panel.connection,
        'channel', encodeURIComponent(panel.name), 'seen'
      ]

      this.api.post('/' + parts.join('/'), {
        body: '' + last_seen
      })

      this.last_seen[id] = last_seen
    }
  }

  sync_missed () {
    if (this.focused) {
      this.focused.update_seen()
      if (this.focused.last_seen) { this.last_seen[this.focused.id] = this.focused.last_seen }
    }

    this.api.get('/missed', {
      data: this.last_seen,
      success: res => {
        this.missed = {}
        for (connection in res) {
          for (channel in res[connection]) {
            var id = panel_id(channel, connection)
            if (this.panels[id]) {
              this.apply_missed(this.panels[id], res[connection][channel])
            } else {
              this.missed[id] = res[connection][channel]
            }
          }
        }
      }
    })
  }

  search_panel (panel, text) {
    var parts = [ 'connection', panel.connection,
      'channel', encodeURIComponent(panel.name), 'last' ]

    this.api.get('/' + parts.join('/'), {
      data: { query: text, limit: 10 },
      success: messages => {
        if (messages.length > 0) {
          var line = document.createElement('DIV')
          line.classList.add('search-start')
          var scrolled = panel.is_scrolled()
          panel.elem.list.appendChild(line)
          if (scrolled) { panel.scroll() }
        }

        for (var i = messages.length - 1; i >= 0; i--) {
          var msg = messages[i].Message
          msg.Search = true
          panel.append(Message.render(msg))
        }
      }
    })
  }

  focus_input (force) {
    if (force) {
      this.focused.elem.input.focus()
      return
    }

    if (this.mobile) { return }
    if (!this.focused) { return }
    if (this.overlayed()) { return }
    this.focused.elem.input.focus()
  }

  hide_switcher () {
    this.elem.switcher.classList.remove('open')
    this.elem.nav.classList.remove('filtering')
    this.elem.nav.querySelectorAll('li').forEach( li => {
      li.classList.remove('match', 'selected', 'candidate')
    })
  }

  toggle_switcher () {
    this.elem.switcher.querySelector('input').value = ''
    if (this.elem.switcher.classList.contains('open')) {
      this.hide_switcher()
    } else {
      this.elem.switcher.classList.add('open')
      this.elem.nav.classList.add('filtering')
      this.elem.nav.querySelectorAll('#channels li[data-name], #privates li[data-name]').forEach( li => {
        li.classList.add('candidate', 'match')
      })
      var matches = this.elem.nav.querySelectorAll('li[data-name].candidate')
      if (matches.length) {
        matches[0].classList.add('selected')
      }
      this.elem.switcher.querySelector('input').focus()
    }
  }

  save_channel_order () {
    var order = Array.prototype.map.call(
      this.elem.channels.querySelectorAll('li'),
      li => {
        return li.getAttribute('data-panel-id')
      })

    this.sorting = order
    this.update_pref('sorting', order)
  }

  overlayed () {
    return this.dialog && this.dialog.open
  }

  close_dialog () {
    if (this.dialog) { this.dialog.close() }
    this.dialog = null
  }

  new_dialog (name, vars) {
    if (this.dialog) { this.dialog.close() }

    var dialog = new Dialog(name, vars)
    this.elem.flex_wrap.classList.remove('open')
    dialog.append(this.elem.body)
    var input = dialog.el.querySelector('input[type=text]')
    if (!this.mobile && input) {
      input.focus()
      input.select()
    }
    this.dialog = dialog
    return dialog
  }

  reset () {
    var path = this.focused ? this.focused.path : ''

    for (id in this.panels) {
      this.remove_panel(id)
    }

    window.history.replaceState({}, '', path)
    this.default_focused = false
    this.connections = []
    this.last_seen = {}
    this.missed = {}
    this.focused = null

    this.load_seen( () => {
      this.load_token( () => {
        this.init()
      })
    })
  }

  template (name, vars) {
    return Handlebars.templates[name](vars)
  }

  static detect_mobile () {
    return (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) return true; return false })(navigator.userAgent || navigator.vendor || window.opera)
  };
}
