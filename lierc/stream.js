var Stream = function(baseurl) {
  this.baseurl = baseurl;
  this.retries = 0;
  this.eventsource = null;

  var listeners = {};

  this.on = function(name, func) {
    if (!listeners[name])
      listeners[name] = [];
    listeners[name].push(func.bind(this));
  };

  function fire (name) {
    if (listeners[name]) {
      var data = Array.prototype.slice.call(arguments,1);
      listeners[name].forEach(function(listener) {
        listener.apply(undefined, data);
      });
    }
  }

  function connect() {
    var es = new EventSource(this.baseurl + "/events");

    es.addEventListener("irc",     this.onmessage.bind(this));
    es.addEventListener("open",    this.onopen.bind(this));
    es.addEventListener("close",   this.onclose.bind(this));
    es.addEventListener("error",   this.onclose.bind(this));

    this.eventsource = es;
  };

  this.connect = function() {
    var backoff = Math.min(this.retries++, 30);
    console.log("connecting in " + backoff + " seconds");
    setTimeout(connect.bind(this), backoff * 1000);
  };

  this.onopen = function() {
    fire("open");
    this.retries = 0;
  };

  this.onclose = function() {
    fire("close");
    console.log("closed");
  };

  this.onmessage = function(e) {
    var data = JSON.parse(e.data);
    fire("message", data);
  };

  this.check = function() {
    if (! this.eventsource || this.eventsource.readyState == 2 ) {
      this.connect();
    }
  };

  this.send = function(line) {
    var url = this.baseurl + "/" + this.id
    $.ajax({
      url: this.baseurl + "/" + this.id,
      type: "POST",
      headers: { "Content-type": "application/irc" },
      data: line,
      complete: function(res) {
        console.log(res);
      }
    });
  };

  setInterval(this.check.bind(this), 1000);
};
