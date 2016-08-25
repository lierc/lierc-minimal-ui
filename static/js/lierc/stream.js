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

  function fire (name) {
    if (listeners[name]) {
      var data = Array.prototype.slice.call(arguments,1);
      listeners[name].forEach(function(listener) {
        listener.apply(undefined, data);
      });
    }
  }

  function connect() {
    var url = stream.baseurl + "/events";

    var es = new EventSource(url);

    es.addEventListener("irc",     stream.onmessage);
    es.addEventListener("open",    stream.onopen);

    stream.eventsource = es;
    stream.timer = null;
  };

  stream.connect = function() {
    if (stream.eventsource)
      stream.eventsource.close();
    var backoff = Math.min(stream.retries++, 30);
    console.log("connecting in " + backoff + " seconds");
    stream.timer = setTimeout(connect, backoff * 1000);
  };

  stream.onopen = function() {
    fire("open");
    console.log("opened");
    stream.retries = 0;
  };

  stream.onmessage = function(e) {
    var data = JSON.parse(e.data);
    if (data.MessageId)
      stream.last_id = data.MessageId;
    fire("message", data);
  };

  stream.check = function() {
    if (! stream.timer && (! stream.eventsource || stream.eventsource.readyState != 1) ) {
      if (stream.retries == 0) { 
        fire("close");
        console.log("closed");
      }
      stream.connect();
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

  stream.connect();
  setInterval(stream.check, 1000);
};
