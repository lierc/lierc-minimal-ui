var Stream = function(baseurl) {
  var stream = this;

  stream.baseurl = baseurl;
  stream.retries = 0;
  stream.eventsource = null;
  stream.last_id = null;

  var listeners = {};

  stream.on = function(name, func) {
    if (!listeners[name])
      listeners[name] = [];
    listeners[name].push(func);
  };

  stream.fire = function(name) {
    if (listeners[name]) {
      var data = Array.prototype.slice.call(arguments,1);
      listeners[name].forEach(function(listener) {
        data.unshift(listener, 0);
        setTimeout.apply(undefined, data);
      });
    }
  }

  function connect() {
    var url = stream.baseurl + "/events";

    var es = new EventSource(url);

    es.addEventListener("irc",     stream.onmessage);
    es.addEventListener("open",    stream.onopen);
    es.addEventListener("connection", stream.onconnect);

    stream.eventsource = es;
    stream.timer = null;
  };

  stream.connect = function() {
    if (stream.eventsource)
      stream.eventsource.close();

    var backoff = Math.max(3, Math.min(stream.retries++, 15));

    console.log("reconnecting in " + backoff + " seconds");
    stream.fire("reconnect-status", "Reconnecting in " + backoff + " seconds");

    function count() {
      if (--backoff <= 0) {
        clearTimeout(stream.timer);
        connect();
      }
      else {
        stream.fire("reconnect-status", "Reconnecting in " + backoff + " seconds");
        stream.timer = setTimeout(count, 1000);
      }
    }

    stream.timer = setTimeout(count, 1000);
  };

  stream.onconnect = function(e) {
    var data = JSON.parse(e.data);
    stream.fire("connect", data);
  };

  stream.onopen = function() {
    stream.fire("open");
    stream.retries = 0;
  };

  stream.onmessage = function(e) {
    var data = JSON.parse(e.data);
    if (data.MessageId)
      stream.last_id = data.MessageId;
    stream.fire("message", data);
  };

  stream.close = function() {
    if (stream.eventsource)
      stream.eventsource.close();
  };

  stream.check = function() {
    if (! stream.timer ) {
      if (stream.retries == 0 && (! stream.eventsource || stream.eventsource.readyState != 1)) {
        stream.fire("close");
        console.log("closed");
      }
      if (! stream.eventsource || stream.eventsource.readyState == 2 ) {
        stream.connect();
      }
      else if (stream.eventsource.readyState == 0) {
        if (stream.retries == 0) {
          stream.retries = 1;
        }
        console.log("reconnecting now");
        stream.fire("reconnect-status", "Reconnecting now");
      }
    }
  };

  stream.send = function(line) {
    var url = stream.baseurl + "/" + stream.id
    $.ajax({
      url: stream.baseurl + "/" + stream.id,
      type: "POST",
      headers: { "Content-type": "application/irc" },
      data: line,
      complete: function(res) {
        console.log(res);
      }
    });
  };

  connect();
  var timer = setInterval(stream.check, 1000);

  stream.destroy = function() {
    clearInterval(timer);
    listeners = {};

    if (stream.eventsource) {
      stream.eventsource.removeEventListener("irc", stream.onmessage);
      stream.eventsource.removeEventListener("open", stream.onopen);
      stream.eventsource.removeEventListener("connection", stream.onconnect);
      stream.eventsource.close();
    }

    stream = null;
  };
};
