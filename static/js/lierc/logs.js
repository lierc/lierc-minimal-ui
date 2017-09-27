var Logs = function(url) {
  var logs = this;
  logs.api = new API(url);
  logs.form = document.getElementById("log-search");
  logs.results = document.getElementById("results");
  logs.nick = document.getElementById("nick");
  logs.connection = document.getElementById("connection");
  logs.channel = document.getElementById("channel");
  logs.from = document.getElementById("from");
  logs.to = document.getElementById("to");
  logs.datalist = document.getElementById("channels");

  logs.populate_datalist = function() {
    var path = "/connection/" + logs.connection.value + "/channel";
    logs.channel.setAttribute('disabled', 'disabled');
    logs.channel.value = 'loading...';
    logs.api.get(path, {
      error: function(err) {
        logs.channel.value = '';
      },
      success: function(channels) {
        logs.datalist.innerHTML = '';
        channels.forEach(function(chan) {
          var item = document.createElement('OPTION');
          item.value = chan;
          logs.datalist.appendChild(item);
        });
        logs.channel.value = '';
        if (logs.datalist.childNodes.length) {
          logs.channel.value = logs.datalist.childNodes[0].value;
        }
        logs.channel.removeAttribute('disabled');
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

      from = [from.getYear() + 1900, from.getMonth() + 1, from.getDate()].join("-");
      to   = [to.getYear() + 1900, to.getMonth() + 1, to.getDate()].join("-");

      var path = "/connection/" + conn + "/channel/" + chan + "/date/" + from + "/" + to;

      var query = logs.api.build_query({
        nick: logs.nick.value
      });

      var es = new EventSource(logs.api.baseurl + path + '?' + query);

      es.addEventListener("log", function(e) {
        var line = JSON.parse(e.data);
        var message = line.Message;
        message.Id = line.MessageId;
        message.Highlight = e.Highlight;
        logs.results.appendChild(Render(message, {controls: false}));
      });

      es.addEventListener("error", function() {
        es.close();
      });
    });
  };
}
