class Panel {
  constructor (name, id, connection, mobile) {
    this.name = name
    this.id = id
    this.connection = connection.id
    this.unread = false
    this.missed = false
    this.connected = connection.connected
    this.highlighted = false
    this.type = Panel.determine_panel_type(name, connection.chantypes)
    this.focused = false
    this.backlog_empty = false
    this.reactions = []
    this.monospace_nicks = []
    this.ignore_events = false
    this.collapse_embeds = false
    this.show_nicklist = false
    this.first_focus = true
    this.last_seen = null
    this.path = window.location.pathname + '#/' + connection.id + '/' + encodeURIComponent(name)
    this.observers = {}
    this.mode = ''
    this.network = connection.host
    this.mobile = mobile

    this.elem = {
      input: document.createElement('DIV'),
      list: document.createElement('OL'),
      nicks: document.createElement('UL'),
      topic: document.createElement('P'),
      filler: document.createElement('DIV'),
      prefix: document.createElement('SPAN'),
      nav: this.build_nav(),
      body: document.body
    }

    this.elem.input.setAttribute('contenteditable', 'true')
    this.elem.input.setAttribute('data-panel-id', id)
    this.elem.input.classList.add('input')
    this.elem.filler.classList.add('filler')
    this.elem.prefix.textContent = this.name
    this.elem.topic.textContent = 'No topic set'

    this.scroller = document.getElementById('panel-scroll')
    this.inner = document.getElementById('panel-inner-scroll')

    this.editor = new Editor(this.elem.input)
    setInterval( (() => this.prune), 1000 * 60)
  }

  change_name (name) {
    this.name = name
    this.update_nav()
  }

  static determine_panel_type (name, chantypes) {
    if (name == 'status') return 'status'
    if (chantypes.indexOf(name[0]) != -1) return 'channel'
    return 'private'
  }

  update_mode (mode) {
    this.mode = mode
    this.update_nav()
  }

  update_nicks (nicks) {
    var order = [ '@', '+' ]
    var sorted = Object.keys(nicks).map( n => {
      return [n, n.toLowerCase()]
    }).sort( (a, b) => {
      return a[1] < b[1]
        ? -1 : a[1] > b[1]
          ? 1 : 0
    }).map( n => {
      return n[0]
    })

    var display_sorted = sorted.map( n => {
      var pos = order.indexOf(nicks[n])
      var prefix = '' + (pos != -1 ? pos : order.length)
      return [n, prefix + n.toLowerCase()]
    }).sort( (a, b) => {
      return a[1] < b[1]
        ? -1 : a[1] > b[1]
          ? 1 : 0
    })

    var list = this.elem.nicks
    var items = list.querySelectorAll('li')
    var l = items.length
    var del = []

    for (var i = 0; i < l; i++) {
      var a = items[i].querySelector('a')
      var nick = a.getAttribute('data-nick')
      if (!(nick in nicks)) {
        del.push(items[i])
      }
    }

    var sorted_len = display_sorted.length

    for (var i = 0; i < sorted_len; i++) {
      var nick = display_sorted[i][0]
      var order = display_sorted[i][1]
      var inserted = false

      for (var j = 0; j < l; j++) {
        var item = items[j]
        var a = item.querySelector('a')
        var n = a.getAttribute('data-nick')
        var o = a.getAttribute('data-nick-order')

        if (n == nick) {
          var text = a.textContent
          var display = nicks[nick] + nick
          if (text != display) {
            a.textContent = display
            a.setAttribute('data-nick-order', order)
          }
          inserted = true
          break
        } else if (o > order) {
          var html = lierc.template('nick', {
            nick: nick,
            order: order,
            sigil: nicks[nick]
          })
          item.insertAdjacentHTML('beforebegin', html)
          inserted = true
          break
        }
      }

      if (!inserted) {
        var html = lierc.template('nick', {
          nick: nick,
          order: order,
          sigil: nicks[nick]
        })
        list.insertAdjacentHTML('beforeend', html)
      }
    }

    for (var i = 0; i < del.length; i++) {
      list.removeChild(del[i])
    }
  }

  focus () {
    if (this.ignore_events) {
      this.elem.body.classList.add('hide-events')
    }
    else {
      this.elem.body.classList.remove('hide-events')
    }

    if (this.collapse_embeds) {
      this.elem.body.classList.add('hide-embeds')
    }
    else {
      this.elem.body.classList.remove('hide-embeds')
    }

    if (this.show_nicklist) {
      this.elem.body.classList.add('show-nicklist')
    }
    else {
      this.elem.body.classList.remove('show-nicklist')
    }

    this.first_focus = false
    this.focused = true
    this.resize_filler()
    if (!this.mobile) { this.elem.input.focus() }
    this.unread = false
    this.missed = false
    this.highlighted = false
    this.update_nav()
    this.scroll(true)
    setTimeout( () => { this.scroll(true) }, 10)
  }

  build_nav () {
    var html = lierc.template('nav_item', {
      name: this.name,
      status: this.type == 'status',
      id: this.id
    })
    var el = document.createElement('DIV')
    el.innerHTML = html
    return el.firstChild
  }

  update_nav () {
    this.elem.nav.querySelector('.panel-name').textContent = this.name

    if (this.focused) {
      this.elem.nav.classList.add('active')
      this.elem.nav.classList.remove('unread', 'missed', 'highlighted', 'disconnected')
      if (!this.connected) { this.elem.nav.classList.add('disconnected') }
    } else {
      this.elem.nav.classList.remove('active')
      if (this.unread) { this.elem.nav.classList.add('unread') }
      if (this.missed) { this.elem.nav.classList.add('missed') }
      if (this.highlighted) { this.elem.nav.classList.add('highlighted') }

      if (this.connected) {
        this.elem.nav.classList.remove('disconnected')
      } else {
        this.elem.nav.classList.add('disconnected')
      }
    }

    var prefix = this.name
    var title = this.network

    if (this.mode) {
      prefix += ' (+' + this.mode + ')'
      title += ' (+' + this.mode + ')'
    }

    this.elem.prefix.textContent = prefix
    this.elem.prefix.setAttribute('title', this.network)
    this.elem.nav.setAttribute('title', title)
    this.elem.nav.setAttribute('data-name', this.name)
  }

  update_seen () {
    var id = this.latest_message_id()
    if (id) { this.last_seen = id }
  }

  unfocus () {
    this.update_seen()
    this.focused = false
    this.elem.nav.classList.remove('active')
    this.clear_lists()
    this.backlog_empty = false
  }

  remove_elems () {
    ['nav', 'prefix', 'filler', 'topic', 'nicks', 'input', 'list']
      .forEach( el => {
        if (this.elem[el].parentNode) {
          this.elem[el].parentNode.removeChild(
            this.elem[el]
          )
        }
      })
  }

  clear_lists () {
    this.remove_observers(this.elem.list)
    var list = this.elem.list
    while (list.firstChild) {
      list.removeChild(list.firstChild)
    }
    var nicks = this.elem.nicks
    while (nicks.firstChild) {
      nicks.removeChild(nicks.firstChild)
    }
  }

  prepend (els) {
    var list = this.elem.list
    var height = this.inner.getBoundingClientRect().height

    var prev_time, prev_nick, prev_mono
    var length = els.length

    for (var i = length - 1; i >= 0; i--) {
      var el = els[i]
      el.classList.add('loading')

      if (!el.matches('li.chat')) { continue }

      var time = el.querySelector('time')
      if (time) {
        if (time.innerHTML == prev_time) { time.className = 'hidden' }
        prev_time = time.innerHTML
      }

      if (el.classList.contains('message')) {
        var nick = el.querySelector('.message-nick').getAttribute('data-nick')
        if (this.monospace_nicks.indexOf(nick) != -1) {
          el.classList.add('monospace')
          if (!prev_mono) {
            el.classList.add('monospace-start')
          }
          prev_mono = true
        } else {
          if (prev_mono && els[i + 1]) {
            els[i + 1].classList.add('monospace-end')
          }
          prev_mono = false
        }
        if (nick == prev_nick) {
          el.classList.add('consecutive')
        }
        prev_nick = nick
      } else {
        if (prev_mono && els[i + 1]) { els[i + 1].classList.add('monospace-end') }
        prev_nick = null
        prev_mono = null
      }
    }

    this.scroll( () => {
      for (var i = 0; i < els.length; i++) {
        if (list.childNodes.length) {
          list.insertBefore(els[i], list.childNodes[0])
        } else {
          list.appendChild(els[i])
        }
      }
    })

    requestAnimationFrame( () => {
      for (var i = 0; i < els.length; i++) {
        els[i].classList.add('loaded')
      }
    })

    var diff = this.inner.getBoundingClientRect().height - height
    this.scroller.scrollTop += diff
    this.resize_filler()

    for (var i = 0; i < els.length; i++) {
      this.imagify(els[i], false)
      this.vidify(els[i], false)
      this.audify(els[i], false)
    }

    Embed.embed_all(els, panel)

    this.last_seen_separator()
  }

  embed (a, embed, manual) {
    if (!manual && this.collapse_embeds) {
      var toggle = a.nextSibling
      while (toggle && !toggle.classList.contains('embed-toggle')) {
        toggle = toggle.nextSibling
      }
      if (toggle && toggle.classList.contains('embed-toggle')) {
        toggle.classList.add('hidden')
      }
      return
    }

    var li = a.parentNode
    while (li.nodeName != 'LI') {
      li = li.parentNode
    }

    if (embed.provider_name == 'Twitter') {
      embed.html = new Handlebars.SafeString(
        embed.html
          .replace(/<script[^>]+>.*<\/script>/, '')
          .replace(/twitter-tweet/, '')
        )
    }

    var html = lierc.template('embed', {
      provider_name_lc: embed.provider_name.toLowerCase(),
      provider_name: embed.provider_name,
      id: embed.id,
      thumbnail_url: embed.thumbnail_url,
      title: embed.title,
      description: embed.desciption,
      html: embed.html,
      use_html: embed.provider_name == 'Twitter'
    })

    this.scroll( () => {
      li.querySelector('.message-text').insertAdjacentHTML('beforeend', html)
      this.resize_filler()
    })

    var wrap = li.querySelector('div[data-embed-id="' + embed.id + '"]')
    var prev = wrap.getBoundingClientRect().height
    this.scroller.scrollTop += prev

    var o = new MutationObserver( s => {
      var cur = wrap.getBoundingClientRect().height
      if (!this.is_scrolled()) {
        this.scroller.scrollTop += cur - prev
      }
      prev = cur
    })

    var config = {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['class', 'style']
    }

    o.observe(wrap, config)
    this.observers[embed.id] = o
  }

  is_scrolled () {
    return Math.abs(this.scroller.scrollHeight - (this.scroller.scrollTop + this.scroller.clientHeight)) < 10
  }

  append (el) {
    if (el === undefined) { return }

    if (this.focused) {
      var id = el.getAttribute('data-message-id')
      if (id && this.elem.list.querySelectorAll('li[data-message-id="' + id + '"]').length) { return }

      this.scroll( scrolled => {
        this.elem.list.appendChild(el)

        if (el.classList.contains('chat')) {
          var nick_el = el.querySelector('span[data-nick]')
          var nick = nick_el ? nick_el.getAttribute('data-nick') : ''
          var prev = el.previousSibling

          if (el.classList.contains('message') && prev && prev.classList.contains('message')) {
            var prev_nick_el = prev.querySelector('span[data-nick]')
            var prev_nick = prev_nick_el ? prev_nick_el.getAttribute('data-nick') : ''

            if (nick == prev_nick) { el.classList.add('consecutive') }
          }

          if (prev && prev.classList.contains('chat')) {
            var time = el.querySelector('time')
            var prev_time = prev.querySelector('time')
            if (time && prev_time && time.textContent == prev_time.textContent) { time.classList.add('hidden') }
          }

          if (el.classList.contains('message') && this.monospace_nicks.indexOf(nick) != -1) {
            el.classList.add('monospace')
            if (prev && !prev.classList.contains('monospace')) {
              el.classList.add('monospace-start')
            }
          } else {
            if (prev && prev.classList.contains('monospace')) { prev.classList.add('monospace-end') }
          }

          if (el.classList.contains('message')) {
            this.imagify(el)
            this.vidify(el)
            this.audify(el)
            Embed.embed_all([el], panel)
          }
        }

        this.resize_filler()
      })
    } else {
      el.innerHTML = ''

      if (el.classList.contains('message')) {
        this.unread = true
        if (el.classList.contains('highlight')) { this.highlighted = true }
        this.update_nav()
      } else if (el.classList.contains('event') && !this.ignore_events) {
        this.missed = true
        this.update_nav()
      }
    }
  }

  resize_filler () {
    if (!this.focused) return

    var scroll = this.scroller.getBoundingClientRect().height
    var chat = this.elem.list.getBoundingClientRect().height

    this.elem.filler.style.height = Math.max(0, scroll - chat) + 'px'
  }

  scroll (cb) {
    if (cb === true) {
      if (this.focused) { this.scroller.scrollTop = this.scroller.scrollHeight }
      return
    }

    var scrolled = this.is_scrolled()
    if (cb) { cb(scrolled) }
    if (this.focused && scrolled) { this.scroller.scrollTop = this.scroller.scrollHeight }
  }

  set_disabled (bool) {
    if (bool) {
      this.elem.input.setAttribute('contenteditable', 'false')
      this.elem.input.classList.add('disabled')
    } else {
      this.elem.input.setAttribute('contenteditable', 'true')
      this.elem.input.classList.remove('disabled')
    }
  }

  latest_message_id () {
    var els = this.elem.list.querySelectorAll('li[data-message-id]')
    if (els.length) {
      return parseInt(els[ els.length - 1 ].getAttribute('data-message-id'))
    }
    return null
  }

  oldest_message_id () {
    var els = this.elem.list.querySelectorAll('li[data-message-id]')
    if (els.length) {
      return parseInt(els[0].getAttribute('data-message-id'))
    }
    return null
  }

  update_topic (topic) {
    this.elem.topic.childNodes.forEach( el => {
      this.elem.topic.removeChild(el)
    })
    Format(topic.value).forEach( el => {
      this.elem.topic.appendChild(el)
    })

    if (topic.user && topic.time) {
      var date = (new Date(topic.time * 1000))
      this.elem.topic.setAttribute('title', 'set by ' + topic.user + ' on ' + date)
    }
  }

  prune () {
    if (this.focused && !this.is_scrolled()) { return }

    var els = Array.prototype.filter.call(this.elem.list.querySelectorAll('li.chat'), el => {
      return getComputedStyle(el).display != 'none'
    })

    if (els.length > 200) {
      els.slice(0, 200).forEach( el => {
        this.remove_observers(el)
        el.parentNode.removeChild(el)
      })
    }
  }

  remove_observers (els) {
    els.querySelectorAll('[data-embed-id]').forEach( el => {
      var id = el.getAttribute('data-embed-id')
      if (this.observers[id]) {
        this.observers[id].disconnect()
        delete this.observers[id]
      }
    })
  }

  static img_re = /^http[^\s]*\.(?:jpe?g|gif|png|bmp|svg)[^\/]*$/i
  static aud_re = /^http[^\s]*\.(?:mp3|wav|aac|m4a)[^\/]*$/i
  static vid_re = /^http[^\s]*\.(?:gifv|mp4)[^\/]*$/i

  imagify (elem) {
    var links = elem.querySelectorAll('a')
    var message = elem.querySelector('.message-text')
    if (!message) return

    for (var i = links.length - 1; i >= 0; i--) {
      var link = links[i]
      if (link.href.match(Panel.img_re)) {
        if (link.href.match(/\.gifv/)) continue
        if (link.href.match(/#(nsfw|hide)/)) continue
        var image = new Image()
        image.setAttribute('title', link.href)
        image.onload = ( (image, link) => {
          return e => {
            var s = this.scroller
            var wrap = document.createElement('DIV')
            var a = link.cloneNode(false)
            var toggle = document.createElement('SPAN')
            a.appendChild(image)

            this.scroll( () => {
              if (this.collapse_embeds) {
                toggle.setAttribute('class', 'image-toggle hidden')
                wrap.setAttribute('class', 'image-wrap hidden')
              } else {
                toggle.setAttribute('class', 'image-toggle')
                wrap.setAttribute('class', 'image-wrap')
              }
              toggle.setAttribute('aria-hidden', 'true')
              link.parentNode.insertBefore(toggle, link.nextSibling)
            })

            toggle.addEventListener('click', e => {
              e.preventDefault()
              this.scroll( () => {
                wrap.classList.toggle('hidden')
                toggle.classList.toggle('hidden')
              })
            })

            var start = this.scroller.scrollTop
            wrap.appendChild(a)
            message.appendChild(wrap)

            var diff = this.scroller.scrollTop - start
            this.scroller.scrollTop += wrap.getBoundingClientRect().height - diff
          }
        })(image, link)
        image.src = 'https://noembed.com/i/0/600/' + link.href
      }
    }
  }

  vidify (elem) {
    var links = elem.querySelectorAll('a')
    var message = elem.querySelector('.message-text')
    if (!message) return

    for (var i = links.length - 1; i >= 0; i--) {
      var link = links[i]
      if (link.href.match(Panel.vid_re)) {
        if (link.href.match(/i\.imgur\.com\/[^\/\.]+\.gifv/)) { link.href = link.href.replace('.gifv', '.mp4') }
        if (link.href.match(/http:\/\/i\.imgur\.com/)) { link.href = link.href.replace(/^http/, 'https') }

        var video = document.createElement('VIDEO')
        video.controls = 'controls'
        video.preload = 'metadata'

        video.addEventListener('loadeddata', ( (video, link) => {
          return (e) => {
            var s = this.scroller
            var wrap = document.createElement('DIV')
            var toggle = document.createElement('SPAN')

            this.scroll( () => {
              if (this.collapse_embeds) {
                toggle.setAttribute('class', 'image-toggle hidden')
                wrap.setAttribute('class', 'image-wrap hidden')
              } else {
                toggle.setAttribute('class', 'image-toggle')
                wrap.setAttribute('class', 'image-wrap')
              }
              toggle.setAttribute('aria-hidden', 'true')
              link.parentNode.insertBefore(toggle, link.nextSibling)
            })

            toggle.addEventListener('click', e => {
              e.preventDefault()
              this.scroll( () =>  {
                wrap.classList.toggle('hidden')
                toggle.classList.toggle('hidden')
              })
            })

            var start = this.scroller.scrollTop
            wrap.appendChild(video)
            message.appendChild(wrap)

            var diff = this.scroller.scrollTop - start
            this.scroller.scrollTop += wrap.getBoundingClientRect().height - diff
          }
        })(video, link), false)

        video.src = link.href
        video.load()
      }
    }
  }

  audify (elem) {
    var links = elem.querySelectorAll('a')
    var message = elem.querySelector('.message-text')
    if (!message) return

    for (var i = links.length - 1; i >= 0; i--) {
      var link = links[i]
      if (link.href.match(Panel.aud_re)) {
        var audio = document.createElement('AUDIO')
        audio.controls = 'controls'

        audio.addEventListener('loadeddata', ( (audio, link) => {
          return e => {
            var s = this.scroller
            var start = s.scrollHeight
            var wrap = document.createElement('DIV')
            message.appendChild(wrap)
            link.parentNode.removeChild(link)
            wrap.appendChild(link)
            link.innerHTML = ''
            link.appendChild(audio)
            wrap.className = 'image-wrap'
            var end = s.scrollHeight
            this.scroller.scrollTop += end - start
          }
        })(audio, link), false)

        audio.src = link.href
        audio.load()
      }
    }
  }

  react_backlog_check () {
    this.reactions.forEach( (reaction, i) => {
      var li = this.elem.list.querySelector('li[data-message-hash="' + reaction[1] + '"]')
      if (li) {
        this.handle_reaction.apply(panel, reaction)
        this.reactions.slice(i, 1)
      }
    })
  }

  handle_reaction (from, hash, reaction) {
    if (!hash) {
      console.log(from, hash, reaction)
      return
    }

    var li = this.elem.list.querySelector('li[data-message-hash="' + hash + '"]')

    if (li) {
      this.scroll( scroll => {
        var reactions = li.querySelector('.reactions')
        if (!reactions) {
          reactions = document.createElement('DIV')
          reactions.classList.add('reactions')
          li.appendChild(reactions)
        }

        var span = document.createElement('SPAN')
        span.textContent = reaction
        span.setAttribute('title', from)
        if (reactions.firstChild) {
          reactions.insertBefore(span, reactions.firstChild)
        } else {
          reactions.appendChild(span)
        }

        if (scroll) { this.resize_filler() }
      })
    } else {
      this.reactions.push([from, hash, reaction])
    }
  }

  set_loading (on) {
    if (on) {
      this.elem.list.classList.add('loading')
    } else {
      this.elem.list.classList.remove('loading')
    }
  }

  set_collapse_embeds (bool) {
    this.scroll( () => {
      if (this.focused) {
        if (bool) {
          this.elem.body.classList.add('hide-embeds')
          this.elem.list.querySelectorAll('.embed-toggle:not(.hidden)').forEach( el => {
            el.click()
          })
          this.elem.list.querySelectorAll('.image-toggle:not(.hidden)').forEach( el => {
            el.click()
          })
        } else {
          this.elem.body.classList.remove('hide-embeds')
          this.elem.list.querySelectorAll('.embed-toggle.hidden').forEach( el => {
            el.click()
          })
          this.elem.list.querySelectorAll('.image-toggle.hidden').forEach( el => {
            el.click()
          })
        }
      }

      this.collapse_embeds = bool

      if (this.focused && bool) { this.resize_filler() }
    })
  }

  set_ignore_events (bool) {
    this.scroll( () => {
      if (this.focused) {
        if (bool) {
          this.elem.body.classList.add('hide-events')
        }
        else {
          this.elem.body.classList.remove('hide-events')
        }
      }

      this.ignore_events = bool

      if (this.focused && bool) { this.resize_filler() }
    })
  }

  set_connected (bool, message) {
    this.connected = bool
    this.update_nav()
  }

  set_show_nicklist (bool) {
    this.scroll( () => {
      if (bool) {
        this.elem.body.classList.add('show-nicklist')
      }
      else {
        this.elem.body.classList.remove('show-nicklist')
      }

      this.show_nicklist = bool
      this.resize_filler()
    })
  }

  add_monospace_nick (nick) {
    if (this.monospace_nicks.indexOf(nick) == -1) {
      this.monospace_nicks.push(nick)
    }
    this.scroll( () => {
      this.elem.list.querySelectorAll('li.message .message-nick[data-nick="' + nick + '"]')
        .forEach( line => {
          line.parentNode.parentNode.classList.add('monospace')
        })
    })
  }

  remove_monospace_nick (nick) {
    var i = this.monospace_nicks.indexOf(nick)
    if (i != -1) {
      this.monospace_nicks.splice(i, 1)
    }
    this.scroll( () => {
      this.elem.list.querySelectorAll('li.message .message-nick[data-nick="' + nick + '"]')
        .forEach( line => {
          line.parentNode.parentNode.classList
              .remove('monospace', 'monospace-start', 'monospace-end')
        })
    })
  }

  last_seen_separator () {
    if (this.last_seen) {
      var msg = this.elem.list.querySelector('li[data-message-id="' + this.last_seen + '"]')
      if (!msg) return

      var next_visible
      while (msg.nextSibling) {
        if (msg.nodeType == 1 && getComputedStyle(msg.nextSibling).display != 'none') {
          next_visible = msg.nextSibling
          break
        }
        msg = msg.nextSibling
      }

      if (next_visible) {
        this.scroll( () => {
          var sep = this.elem.list.querySelector('.last-read')
          if (sep) {
            sep.parentNode.removeChild(sep)
          }

          sep = document.createElement('DIV')
          sep.classList.add('last-read')

          msg.parentNode.insertBefore(sep, msg.nextSibling)

          if (msg.classList.contains('monospace')) {
            msg.classList.add('monospace-end')
          }
        })
      }
    }
  }
}
