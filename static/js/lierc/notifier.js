var WebPush = function(app) {
  var webpush = this;
  webpush.subscribed = false;

  webpush.hide = function() {
    document.getElementById("web-notify").classList.add("broken");
  };

  webpush.setup = function() {
    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
      webpush.hide();
      console.log("Notifications not supported.");
      return;
    }

    if (Notification.permission === 'denied') {
      console.log("User blocked notifications.");
      return;
    }

    if (!('PushManager' in window)) {
      webpush.hide();
      console.log("Push notifications not supported.");
      return;
    }

    navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
      serviceWorkerRegistration.pushManager.getSubscription()
        .then(function(subscription) {
          if(subscription) {
            webpush.set_enabled(true, subscription);
          }
        });
    });
  };

  webpush.unsubscribe = function() {
    navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
      serviceWorkerRegistration.pushManager.getSubscription()
        .then(function(subscription) {
          if (!subscription) {
            webpush.set_enabled(false);
            return;
          }
          subscription.unsubscribe().then(function() {
            webpush.set_enabled(false);
            var part = encodeURIComponent(subscription.endpoint);;
            app.api.delete("/notification/web_push/" + part);
          }).catch(function(e) {
            console.log("Failed to unsubscribe", e);
          });
        }).catch(function(e) {
          console.log("Error unsubscribing", e);
        });
    });
  };

  webpush.subscribe = function() {
    navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
      app.api.get("/notification/web_push_keys", {
        success: function(res) {
          var vapid = base64url.decode(res['vapid_public_key']);
          serviceWorkerRegistration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: vapid.buffer
            })
            .then(function(subscription) {
              webpush.set_enabled(true, subscription);
            })
            .catch(function(e) {
              if (Notification.permission === 'denied') {
                console.log("Notifier permission denied");
              }
              else {
                console.log("Unable to subscribe", e);
              }
              webpush.set_enabled(false);
            });
        }
      });
    });
  };

  webpush.build_pref = function(sub) {
    var rawKey = sub.getKey ? sub.getKey('p256dh') : '';
    var key = rawKey ?
      base64url.encode(rawKey) :
      '';

    var rawAuthSecret = sub.getKey ? sub.getKey('auth') : '';
    var authSecret = rawAuthSecret ?
      base64url.encode(rawAuthSecret) :
      '';

    return {
      endpoint: sub.endpoint,
      key: key,
      auth: authSecret
    };
  };

  webpush.set_enabled = function(bool, sub) {
    webpush.subscribed = bool;

    if (bool) {
      if (sub) {
        var headers = new Headers();
        headers.append(
          'content-type',
          'application/x-www-form-urlencoded; charset=UTF-8'
        );
        app.api.post("/notification/web_push", {
          body: app.api.build_query(webpush.build_pref(sub)),
          headers: headers
        });
      }
      document.getElementById("web-notify").classList.add("enabled");
    }
    else {
      document.getElementById("web-notify").classList.remove("enabled");
    }
  };

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js")
      .then(function() {
        webpush.setup();
      });
  }
  else {
    webpush.hide();
  }
};

var APN = function(app) {
  var apn = this;
  apn.subscribed = false;
  apn.config = {};

  apn.setup = function() {
    app.api.get("/notification/apn/config", {
      success: function(c) {
        apn.config = c;
        var per = window.safari.pushNotification.permission(c.push_id);
        apn.check_per(per);
      }
    });
  };

  apn.check_per = function(per) {
    if (per.permission === 'default') {
      window.safari.pushNotification.requestPermission(
        apn.config.service_url,
        apn.config.push_id,
        { user: apn.config.user },
        function(per) {
          apn.check_per(per)
        }
      );
    }
    else if (per.permission == 'denied') {
      document.getElementById("web-notify").classList.remove("enabled");
    }
    else if (per.permission == 'granted') {
      document.getElementById("web-notify").classList.add("enabled");
    }
  };

  if (APN.supported()) {
    apn.setup();
  }
};

APN.supported = function() {
  return 'safari' in window && 'pushNotification' in window.safari
};

var Notifier = APN.supported() ? APN : WebPush;
