var Notifier = function(app) {
  var notifier = this;
  notifier.subscribed = false;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js")
      .then(function() {
        notifier.setup();
      });
  }

  notifier.hide = function() {
    document.getElementById("web-notify").classList.add("broken");
  };

  notifier.setup = function() {
    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
      notifier.hide();
      console.log("Notifications not supported.");
      return;
    }

    if (Notification.permission === 'denied') {
      console.log("User blocked notifications.");
      return;
    }

    if (!('PushManager' in window)) {
      notifier.hide();
      console.log("Push notifications not supported.");
      return;
    }

    navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
      serviceWorkerRegistration.pushManager.getSubscription()
        .then(function(subscription) {
          if(subscription) {
            notifier.set_enabled(true, subscription);
          }
        });
    });
  };

  notifier.unsubscribe = function() {
    navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
      serviceWorkerRegistration.pushManager.getSubscription()
        .then(function(subscription) {
          if (!subscription) {
            notifier.set_enabled(false);
            return;
          }
          subscription.unsubscribe().then(function() {
            notifier.set_enabled(false);
            var headers = new Headers();
            headers.append('lierc-token', app.post_token());
            var part = encodeURIComponent(subscription.endpoint);;
            app.api.delete("/notification/web_push/" + part, {
              headers: headers
            });
          }).catch(function(e) {
            console.log("Failed to unsubscribe", e);
          });
        }).catch(function(e) {
          console.log("Error unsubscribing", e);
        });
    });
  };

  notifier.subscribe = function() {
    navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
      serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true})
        .then(function(subscription) {
          notifier.set_enabled(true, subscription);
        })
        .catch(function(e) {
          if (Notification.permission === 'denied') {
            console.log("Notifier permission denied");
          }
          else {
            console.log("Unable to subscribe", e);
          }
          notifier.set_enabled(false);
        });
    });
  };

  notifier.build_pref = function(sub) {
    var rawKey = sub.getKey ? sub.getKey('p256dh') : '';
    var key = rawKey ?
      btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) :
      '';

    var rawAuthSecret = sub.getKey ? sub.getKey('auth') : '';
    var authSecret = rawAuthSecret ?
      btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) :
      '';

    return {
      endpoint: sub.endpoint,
      key: key,
      auth: authSecret
    };
  };

  notifier.set_enabled = function(bool, sub) {
    notifier.subscribed = bool;

    if (bool) {
      if (sub) {
        var headers = new Headers();
        headers.append('lierc-token', app.post_token());
        headers.append(
          'content-type',
          'application/x-www-form-urlencoded; charset=UTF-8'
        );
        app.api.post("/notification/web_push", {
          body: app.api.build_query(notifier.build_pref(sub)),
          headers: headers
        });
      }
      document.getElementById("web-notify").classList.add("enabled");
    }
    else {
      document.getElementById("web-notify").classList.remove("enabled");
    }
  };
};
