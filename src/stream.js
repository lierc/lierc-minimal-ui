class Stream {
  constructor (baseurl) {
    this.baseurl = baseurl
    this.retries = 0
    this.eventsource = null
    this.last_id = null
    this.listeners = {}

    this.connect()
    this.check_timer = setInterval(() => this.check, 1000)
  }

  on (name, func) {
    if (!this.listeners[name]) {
      this.listeners[name] = []
    }
    this.listeners[name].push(func)
  }

  fire (name) {
    if (this.listeners[name]) {
      var data = Array.prototype.slice.call(arguments, 1)
      this.listeners[name].forEach( listener => {
        data.unshift(listener, 0)
        setTimeout.apply(this, data)
      })
    }
  }

  connect () {
    var url = this.baseurl + '/events'

    var es = new EventSource(url)

    es.addEventListener('irc', this.onmessage)
    es.addEventListener('open', this.onopen)
    es.addEventListener('error', this.close)

    this.eventsource = es
    this.recon_timer = null
  };

  connect () {
    if (this.eventsource) { this.eventsource.close() }

    var backoff = Math.max(3, Math.min(this.retries++, 15))

    console.log('reconnecting in ' + backoff + ' seconds')
    this.fire('reconnect-status', 'Reconnecting in ' + backoff + ' seconds')

    var count = () => {
      if (--backoff <= 0) {
        clearTimeout(this.recon_timer)
        connect()
      } else {
        this.fire('reconnect-status', 'Reconnecting in ' + backoff + ' seconds')
        this.recon_timer = setTimeout(count, 1000)
      }
    }

    this.recon_timer = setTimeout(count, 1000)
  }

  onconnect (e) {
    var data = JSON.parse(e.data)
    this.fire('connect', data)
  }

  onopen () {
    this.fire('open')
    this.retries = 0
  }

  onmessage (e) {
    var data = JSON.parse(e.data)

    if (data.Message.Command == 'CREATE') {
      this.fire('create_connection', data)
    } else if (data.Message.Command == 'DELETE') {
      this.fire('delete_connection', data)
    } else {
      if (data.MessageId) { this.last_id = data.MessageId }
      this.fire('message', data)
    }
  }

  close () {
    if (this.eventsource) {
      this.eventsource.close()
    }
  }

  check () {
    if (!this.recon_timer) {
      if (this.retries == 0 && (!this.eventsource || this.eventsource.readyState != 1)) {
        this.fire('close')
        console.log('closed')
      }
      if (!this.eventsource || this.eventsource.readyState == 2) {
        this.connect()
      } else if (this.eventsource.readyState == 0) {
        if (this.retries == 0) {
          this.retries = 1
        }
        console.log('reconnecting now')
        this.fire('reconnect-status', 'Reconnecting now')
      }
    }
  }

  destroy () {
    clearInterval(this.check_timer)
    listeners = {}

    if (this.eventsource) {
      this.eventsource.removeEventListener('irc', this.onmessage)
      this.eventsource.removeEventListener('open', this.onopen)
      this.eventsource.close()
    }

    stream = null
  }
}
