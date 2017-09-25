var Logs = function(url) {
  var logs = this;
  logs.api = new API(url);
  logs.form = document.getElementById("log-search");
  logs.results = document.getElementById("results");
  logs.connection = document.getElementById("connection");
  logs.channel = document.getElementById("channel");
  logs.date = document.getElementById("date");
  logs.datalist = document.getElementById("channels");

  logs.populate_datalist = function() {
    logs.api.get("/connection/" + logs.connection.value, {
      success: function(conn) {
        logs.datalist.innerHTML = '';
        conn.Config.Channels.forEach(function(chan) {
          var item = document.createElement('OPTION');
          item.value = chan;
          logs.datalist.appendChild(item);
        });
        if (logs.datalist.childNodes.length) {
          logs.channel.value = logs.datalist.childNodes[0].value;
        }
      }
    });
  };

  logs.init = function() {
    var now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    logs.date.valueAsDate = now;

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

    logs.connection.addEventListener("change", function(e) {
      logs.populate_datalist();
    });

    logs.form.addEventListener("submit", function(e) {
      e.preventDefault();

      logs.results.innerHTML = '';

      var conn = logs.connection.value;
      var chan = encodeURIComponent(logs.channel.value);
      var date = logs.date.value;
      var path = "/connection/" + conn + "/channel/" + chan + "/date/" + date;

      var es = new EventSource(logs.api.baseurl + path);

      es.addEventListener("log", function(e) {
        var line = JSON.parse(e.data);
        var message = line.Message;
        message.Id = line.MessageId;
        message.Highlight = e.Highlight;
        logs.results.appendChild(Render(message));
      });

      es.addEventListener("error", function() {
        es.close();
      });
    });
  };
}
