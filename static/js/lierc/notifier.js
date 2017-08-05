var Notifier = function(app) {
  var notifier = this;
  notifier.subscribed = false;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/serviceworker.js")
      .then(function() {
        notifier.setup();
      });
  }

  notifier.setup = function() {
    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
      console.log("Notifications not supported.");
      return;
    }

    if (Notification.permission === 'denied') {
      console.log("User blocked notifications.");
      return;
    }

    if (!('PushManager' in window)) {
      console.log("Push notifications not supported.");
      return;
    }

    navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
      serviceWorkerRegistration.pushManager.getSubscription()
        .then(function(subscription) {
          if(subscription) {
            notifier.set_enabled(true, subscription.endpoint);
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
          notifier.set_enabled(true, subscription.endpoint);
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

  notifier.set_enabled = function(bool, url) {
    notifier.subscribed = bool;

    if (bool) {
      if (url) {
        app.update_pref("google_subscription_url", url);
      }
      document.getElementById("web-notify").classList.add("enabled");
    }
    else {
      app.update_pref("google_subscription_url", null);
      document.getElementById("web-notify").classList.remove("enabled");
    }
  };
};
