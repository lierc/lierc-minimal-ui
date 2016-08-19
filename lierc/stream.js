var Stream = function(baseurl) {
  var stream = this;

  stream.baseurl = baseurl;
  stream.retries = 0;
  stream.eventsource = null;
  stream.last_msg_id = 0;

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

    if (stream.last_msg_id)
      url += "?" + stream.last_msg_id;

    var es = new EventSource(url);

    es.addEventListener("irc",     stream.onmessage);
    es.addEventListener("open",    stream.onopen);
    es.addEventListener("close",   stream.onclose);
    es.addEventListener("error",   stream.onclose);

    stream.eventsource = es;
  };

  stream.connect = function() {
    var backoff = Math.min(stream.retries++, 30);
    console.log("connecting in " + backoff + " seconds");
    setTimeout(connect, backoff * 1000);
  };

  stream.onopen = function() {
    fire("open");
    console.log("opened");
    stream.retries = 0;
  };

  stream.onclose = function() {
    fire("close");
    console.log("closed");
  };

  stream.onmessage = function(e) {
    var data = JSON.parse(e.data);
    if (data.MessageId)
      stream.last_msg_id = data.MessageId;
    fire("message", data);
  };

  stream.check = function() {
    if (! stream.eventsource || stream.eventsource.readyState == 2 ) {
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

  setInterval(stream.check, 1000);
};
