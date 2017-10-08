var Logs = function(url) {
  var logs = this;
  logs.api = new API(url);
  logs.form = document.getElementById("log-search");
  logs.status = document.getElementById("status");
  logs.submit = document.getElementById("submit");
  logs.results = document.getElementById("results");
  logs.text = document.getElementById("text");
  logs.connection = document.getElementById("connection");
  logs.channel = document.getElementById("channel");
  logs.from = document.getElementById("from");
  logs.to = document.getElementById("to");
  logs.datalist = document.getElementById("channels");

  logs.populate_datalist = function() {
    var path = "/connection/" + logs.connection.value + "/channel";

    if (logs.channel.value == '') {
      logs.channel.value = 'loading...';
      logs.channel.setAttribute('disabled', 'disabled');
    }

    logs.api.get(path, {
      error: function(err) {
        if (logs.channel.value == 'loading...') {
          logs.channel.value = '';
        }
      },
      success: function(channels) {
        logs.datalist.innerHTML = '';

        channels.forEach(function(chan) {
          var item = document.createElement('OPTION');
          item.value = chan;
          logs.datalist.appendChild(item);
        });

        if (logs.channel.value == 'loading...') {
          logs.channel.value = '';
          logs.channel.removeAttribute('disabled');

          if (logs.datalist.childNodes.length) {
            logs.channel.value = logs.datalist.childNodes[0].value;
          }
        }
      }
    });
  };

  logs.init = function() {
    var now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    logs.from.value = JSON.stringify(now).slice(1,11);
    logs.to.value = logs.from.value;

    logs.api.get("/connection", {
      success: function(conns) {
        conns.forEach(function(conn) {
          var item = document.createElement('OPTION');
          item.value = conn.Id;

          if (conn.Config.Alias) {
            item.textContent = conn.Config.Alias;
          }
          else {
           item.textContent = conn.Config.Host;
          }

          logs.connection.appendChild(item);
        });
        logs.load_url_search();
        logs.populate_datalist();
      }
    });

    logs.to.addEventListener("change", function(e) {
      var to   = new Date(logs.to.value);
      var from = new Date(logs.from.value);

      if (to < from) {
        logs.from.value = logs.to.value;
      }
    });

    logs.from.addEventListener("change", function(e) {
      var to   = new Date(logs.to.value);
      var from = new Date(logs.from.value);

      if (to < from) {
        logs.to.value = logs.from.value;
      }
    });

    logs.connection.addEventListener("change", function(e) {
      logs.populate_datalist();
    });

    logs.form.addEventListener("submit", function(e) {
      e.preventDefault();

      logs.results.innerHTML = '';

      var conn = logs.connection.value;
      var chan = encodeURIComponent(logs.channel.value);

      var from = new Date(logs.from.value);
      var to = new Date(logs.to.value);

      from.setMinutes(from.getMinutes() + from.getTimezoneOffset());
      to.setMinutes(to.getMinutes() + to.getTimezoneOffset());

      var from_month = String(from.getMonth() + 1);
      if (from_month.length == 1) {
        from_month = "0" + from_month;
      }

      var from_day = String(from.getDate());
      if (from_day.length == 1) {
        from_day = "0" + from_day;
      }

      var to_month = String(to.getMonth() + 1);
      if (to_month.length == 1) {
        to_month = "0" + to_month;
      }

      var to_day = String(to.getDate());
      if (to_day.length == 1) {
        to_day = "0" + to_day;
      }

      from = [from.getYear() + 1900, from_month, from_day].join("-");
      to   = [to.getYear() + 1900, to_month, to_day].join("-");

      var data = {};
      if (logs.text.value != "") {
        data['text'] = logs.text.value;
      }

      var path = "/connection/" + conn + "/channel/" + chan + "/date/" + from + "/" + to;
      var query = logs.api.build_query(data);

      if (query) {
        path += '?' + query;
      }

      var es = new EventSource(logs.api.baseurl + path);

      window.history.replaceState({}, path, "/search/#!" + path);

      logs.status.textContent = "searching...";
      var total = 0;

      es.addEventListener("log", function(e) {
        total++;
        var line = JSON.parse(e.data);
        var message = line.Message;
        message.Id = line.MessageId;
        message.Highlight = e.Highlight;
        logs.results.appendChild(Render(message, {controls: false}));
      });

      es.addEventListener("error", function() {
        es.close();
        logs.status.textContent = total + " results";
      });
    });
  };

  logs.load_url_search = function() {
    var hash = window.location.hash;
    if (!hash) return;

    var parts = hash.split("?");
    var path = parts[0];
    var query_string = parts[1];
    var path_parts = path.split("/").slice(1);

    if (query) {
      var pairs = query_string.split("&");
      var query = {};

      for (var i=0; i < pairs.length; i++) {
        var kv = pairs[i].split("=");
        query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
      }

      if (query["text"]) {
        logs.text.value = query["text"];
      }
    }

    while (path_parts.length) {
      var name = path_parts.shift();
      if (name == "connection") {
        logs.connection.value = decodeURIComponent(path_parts.shift());
      }
      else if (name == "channel") {
        logs.channel.value = decodeURIComponent(path_parts.shift());
      }
      else if (name == "date") {
        logs.from.value = decodeURIComponent(path_parts.shift());
        logs.to.value = decodeURIComponent(path_parts.shift());
      }
    }

    logs.submit.click();
  };
}
