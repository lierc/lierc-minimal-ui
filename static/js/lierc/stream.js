// server sends a ping every 5 seconds
const heartbeat_timeout = 15000;
// on wake a healthy stream has pinged within the last interval
const wake_timeout = 7000;

export class Stream {
  #listeners = {};
  #check_timer;

  constructor(baseurl) {
    this.baseurl = baseurl;
    this.retries = 0;
    this.eventsource = null;
    this.last_id = null;
    this.last_event = Date.now();

    // bound once so destroy() can remove the same listeners
    this.onmessage = this.onmessage.bind(this);
    this.onopen = this.onopen.bind(this);
    this.close = this.close.bind(this);
    this.touch = this.touch.bind(this);

    this.#connect();
    this.#check_timer = setInterval(() => this.check(), 1000);
  }

  on(name, func) {
    if (!this.#listeners[name])
      this.#listeners[name] = [];
    this.#listeners[name].push(func);
  }

  fire(name, ...data) {
    if (this.#listeners[name]) {
      this.#listeners[name].forEach((listener) => {
        setTimeout(listener, 0, ...data);
      });
    }
  }

  #connect() {
    const url = `${this.baseurl}/events`;

    const es = new EventSource(url);

    es.addEventListener("irc",     this.onmessage);
    es.addEventListener("open",    this.onopen);
    es.addEventListener("error",   this.close);
    es.addEventListener("ping",    this.touch);

    this.eventsource = es;
    this.timer = null;
  }

  connect() {
    if (this.eventsource)
      this.eventsource.close();

    let backoff = Math.max(0, Math.min(this.retries++, 15));

    if (backoff == 0) {
      this.#connect();
      return;
    }

    console.log(`reconnecting in ${backoff} seconds`);
    this.fire("reconnect-status", `Reconnecting in ${backoff} seconds`);

    const count = () => {
      if (--backoff <= 0) {
        clearTimeout(this.timer);
        this.#connect();
      }
      else {
        this.fire("reconnect-status", `Reconnecting in ${backoff} seconds`);
        this.timer = setTimeout(count, 1000);
      }
    };

    this.timer = setTimeout(count, 1000);
  }

  onconnect(e) {
    const data = JSON.parse(e.data);
    this.fire("connect", data);
  }

  touch() {
    this.last_event = Date.now();
  }

  onopen() {
    this.touch();
    this.fire("open");
    this.retries = 0;
  }

  onmessage(e) {
    this.touch();
    const data = JSON.parse(e.data);

    if (data.Message.Command == "CREATE") {
      this.fire("create_connection", data)
    }
    else if (data.Message.Command == "DELETE") {
      this.fire("delete_connection", data);
    }
    else {
      if (data.MessageId)
        this.last_id = data.MessageId;
      this.fire("message", data);
    }
  }

  close() {
    if (this.eventsource)
      this.eventsource.close();
  }

  // the page became visible again, possibly after sleep
  wake() {
    this.check(wake_timeout);
  }

  // the network changed, so the old connection is likely dead; skip any
  // backoff left from failed attempts while offline
  reconnect() {
    clearTimeout(this.timer);
    this.timer = null;
    this.retries = 0;
    this.close();
    this.check();
  }

  check(timeout = heartbeat_timeout) {
    // a half-open connection (e.g. after sleep) stays OPEN forever
    if (this.eventsource?.readyState == 1
        && Date.now() - this.last_event > timeout) {
      console.log("no heartbeat, forcing reconnect");
      this.close();
    }

    if (! this.timer ) {
      if (this.retries == 0 && (! this.eventsource || this.eventsource.readyState != 1)) {
        this.fire("close");
        console.log("closed");
      }
      if (! this.eventsource || this.eventsource.readyState == 2 ) {
        this.connect();
      }
      else if (this.eventsource.readyState == 0) {
        if (this.retries == 0) {
          this.retries = 1;
        }
        console.log("reconnecting now");
        this.fire("reconnect-status", "Reconnecting now");
      }
    }
  }

  destroy() {
    clearInterval(this.#check_timer);
    this.#listeners = {};

    if (this.eventsource) {
      this.eventsource.removeEventListener("irc", this.onmessage);
      this.eventsource.removeEventListener("open", this.onopen);
      this.eventsource.removeEventListener("error", this.close);
      this.eventsource.removeEventListener("ping", this.touch);
      this.eventsource.close();
    }
  }
}
