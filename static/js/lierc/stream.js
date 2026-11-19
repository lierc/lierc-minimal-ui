// server sends a ping every 5 seconds
const heartbeat_timeout = 15000;
// on wake a healthy stream has pinged within the last interval
const wake_timeout = 7000;
// a wake ping is answered on the stream within this time
const wake_ping_timeout = 5000;
// a gap this long between checks (which run each second) means the
// machine slept: longer than any browser's throttling of a hidden tab's
// timers (Chrome's is once a minute)
const sleep_gap = 90000;
// after a sleep, a hidden tab waits this long before reconnecting, to sit
// out the dark wakes of a closed laptop
const wake_wait = 120000;
// how many message ids to remember for dropping repeats
const seen_limit = 1000;
// connection events from the stream server, fired as app events of the
// same name with their parsed data: the snapshot when a stream opens,
// changes the API made, and liercd's connection state
const connection_events = [
  "connections", "connection:create", "connection:update",
  "connection:delete", "connection:connect", "connection:disconnect",
];

export class Stream {
  #listeners = {};
  #check_timer;
  #seen = new Set();
  #events = 0;
  // whether the current eventsource has opened
  #opened = false;
  // when check last ran, and when the machine last woke from a sleep
  #last_check = Date.now();
  #woke = null;
  // closed after a sleep while hidden (see check)
  #parked = false;

  constructor(baseurl) {
    this.baseurl = baseurl;
    this.retries = 0;
    this.eventsource = null;
    // the newest message id seen, and the newest the server has
    this.last_id = null;
    this.latest_id = null;
    // names this stream in wake pings, from its stream event
    this.stream_id = null;
    this.last_event = Date.now();

    // bound once so destroy() can remove the same listeners
    this.onmessage = this.onmessage.bind(this);
    this.onopen = this.onopen.bind(this);
    this.close = this.close.bind(this);
    this.onerror = this.onerror.bind(this);
    this.touch = this.touch.bind(this);
    this.onping = this.onping.bind(this);
    this.onstream = this.onstream.bind(this);
    this.onconnection = this.onconnection.bind(this);

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
    es.addEventListener("error",   this.onerror);
    es.addEventListener("ping",    this.onping);
    es.addEventListener("stream",  this.onstream);
    for (const name of connection_events)
      es.addEventListener(name, this.onconnection);

    this.eventsource = es;
    this.#opened = false;
    this.stream_id = null;
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
    this.#events++;
  }

  onstream(e) {
    this.stream_id = JSON.parse(e.data).id;
  }

  // pings carry the newest message id the server has for us; older
  // servers send only the time
  onping(e) {
    this.touch();
    let id;
    try {
      id = JSON.parse(e.data).last_id;
    }
    catch (err) {
      return;
    }
    if (typeof id != "number")
      return;

    this.latest_id = id;
    if (this.last_id === null)
      this.last_id = id;
    else if (id > this.last_id)
      this.fire("behind", this.last_id);
  }

  // records a message id, returning false if it was already seen. Ids can
  // arrive out of order, so only exact repeats are dropped.
  saw(id) {
    if (this.#seen.has(id))
      return false;
    this.#seen.add(id);
    if (this.#seen.size > seen_limit)
      this.#seen.delete(this.#seen.values().next().value);
    if (this.last_id === null || id > this.last_id)
      this.last_id = id;
    return true;
  }

  onopen() {
    this.#opened = true;
    this.touch();
    this.fire("open");
    this.retries = 0;
  }

  onconnection(e) {
    this.touch();
    let data;
    try {
      data = JSON.parse(e.data);
    }
    catch (err) {
      console.log(`bad ${e.type} event`, err);
      return;
    }
    this.fire(e.type, data);
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
      if (data.MessageId && !this.saw(data.MessageId))
        return;
      this.fire("message", data);
    }
  }

  close() {
    if (this.eventsource)
      this.eventsource.close();
  }

  // An error closes the stream; check() reconnects it. One before the
  // stream opened is a failed connect, which fires "connect-failed": an
  // EventSource can't tell a 401 (logged out) from a 502 or a network
  // error, so the app asks /auth.
  onerror() {
    const failed = !this.#opened;
    this.close();
    if (failed)
      this.fire("connect-failed");
  }

  // the page became visible again, possibly after sleep: ask the server to
  // ping this stream, which fails at once if the server has dropped it
  async wake() {
    if (this.eventsource?.readyState != 1 || !this.stream_id) {
      this.check(wake_timeout);
      return;
    }

    const es = this.eventsource;
    const events = this.#events;
    let res = null;
    try {
      res = await fetch(`${this.baseurl}/events/${this.stream_id}/ping`, {
        method: 'POST',
        credentials: 'same-origin'
      });
    }
    catch (e) {
    }

    if (this.eventsource !== es)
      return;
    if (!res?.ok) {
      console.log("wake ping failed, reconnecting");
      this.reconnect();
      return;
    }
    setTimeout(() => {
      if (this.eventsource === es && this.#events == events) {
        console.log("no ping after wake, reconnecting");
        this.reconnect();
      }
    }, wake_ping_timeout);
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
    const now = Date.now();
    const silent = now - this.last_event > timeout;
    if (now - this.#last_check > sleep_gap)
      this.#woke = now;
    this.#last_check = now;
    if (!document.hidden)
      this.#woke = null;

    // Just woke from a sleep, hidden, and the stream is dead: this may be
    // a dark wake (a closed laptop waking for a few seconds to check the
    // network). There's no event for going to sleep, so a reconnect here
    // would open a stream nobody reads, and the server would keep counting
    // it as open (holding back notifications) long after the laptop
    // sleeps again. Wait until the page is visible, or the machine has
    // stayed awake for wake_wait; the new stream fills in what was missed
    // when it opens. Without a sleep, a hidden tab reconnects as usual.
    if (silent && this.#woke !== null && now - this.#woke < wake_wait) {
      this.#park();
      return;
    }
    this.#parked = false;

    // a half-open connection (e.g. after sleep) stays OPEN forever
    if (this.eventsource?.readyState == 1 && silent) {
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

  #park() {
    if (this.#parked)
      return;
    console.log("woke while hidden, reconnecting once visible or awake a while");
    this.#parked = true;
    clearTimeout(this.timer);
    this.timer = null;
    this.retries = 0;
    this.close();
    this.fire("close");
  }

  destroy() {
    clearInterval(this.#check_timer);
    this.#listeners = {};

    if (this.eventsource) {
      this.eventsource.removeEventListener("irc", this.onmessage);
      this.eventsource.removeEventListener("open", this.onopen);
      this.eventsource.removeEventListener("error", this.onerror);
      this.eventsource.removeEventListener("ping", this.onping);
      this.eventsource.removeEventListener("stream", this.onstream);
      for (const name of connection_events)
        this.eventsource.removeEventListener(name, this.onconnection);
      this.eventsource.close();
    }
  }
}
