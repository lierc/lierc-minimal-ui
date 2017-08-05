self.addEventListener('push', function(event) {
  console.log('Received a push message', event);

  var data = event.data.json();
  var message = data.data;

  var title = message.channel;
  var body = '< ' + message.from + '> ' + message.text;
  var icon = '/favicon.png';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
    })
  );
});
