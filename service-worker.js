self.addEventListener('push', function(event) {
  var data = event.data.json();
  var messages = data.data;

  var icon = '/favicon.png';
  var title, body, url;

  if (messages.length == 0) {
    return;
  }
  else if (messages.length == 1) {
    var channel = messages[0].Message.Params[0];
    var from = messages[0].Message.Prefix.Name;
    var text = messages[0].Message.Params[1];
    var conn = messages[0].ConnectionId;

    title = channel;
    body = "< " + from + "> " + text;
    url = "/app/#/"
          +  conn + "/"
          + encodeURIComponent(channel);
  }
  else {
    var channel = messages[0].Message.Params[0];
    var conn = messages[0].ConnectionId;

    channels = messages.map(function(m) {
      return m.Message.Params[0];
    }).join(", ");

    title = messages.length + " missed messages";
    body = "in " + channels;
    url = "/app/#/"
          + conn + "/"
          + encodeURIComponent(channel);
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      data: url
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.matchAll({
    type: "window"
  }).then(function(clientList) {
    for (var i=0; i < clientList.length; i++) {
      var client = clientList[i];
      if ("focus" in client) {
        return client.focus();
      }
    }
    if (clients.openWindow) {
      var url = event.notification.data;
      return clients.openWindow(url);
    }
  }));
});
