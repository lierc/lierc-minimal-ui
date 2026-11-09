// Where a message belongs: the channel, or for a private message the
// sender (Params[0] is then our own nick).
function target(m) {
  return m.Message.Direct ? m.Message.Prefix.Name : m.Message.Params[0];
}

self.addEventListener('push', function(event) {
  var data = event.data.json();
  var messages = data.data;
  // the notifier may send fewer messages than it has, to fit the push size
  // limit; count is how many there were
  var count = data.count || messages.length;

  var icon = '/favicon.png';
  var title, body, url;

  if (messages.length == 0) {
    return;
  }

  var first = messages[0];
  url = "/app/#/"
        + first.ConnectionId + "/"
        + encodeURIComponent(target(first));

  if (count == 1) {
    title = target(first);
    body = "< " + first.Message.Prefix.Name + "> " + first.Message.Params[1];
  }
  else {
    var seen = {};
    var targets = [];
    messages.forEach(function(m) {
      var t = target(m);
      if (!seen[t]) {
        seen[t] = true;
        targets.push(t);
      }
    });

    title = count + " missed messages";
    body = "in " + targets.join(", ");
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
