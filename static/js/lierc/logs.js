var Logs = function(url) {
  var logs = this;
  logs.api = new API(url);
  logs.form = document.getElementById("search");
  logs.results = document.getElementById("results");
  logs.connection = document.getElementById("connection");
  logs.channel = document.getElementById("channel");
  logs.date = document.getElementById("date");

  logs.init = function() {
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
      }
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
