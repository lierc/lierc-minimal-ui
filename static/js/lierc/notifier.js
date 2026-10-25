class WebPush {
  #app;

  constructor(app) {
    this.#app = app;

    this.subscribed = false;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js")
        .then(() => {
          this.setup();
        });
    }
    else {
      this.hide();
    }
  }

  hide() {
    document.getElementById("web-notify").classList.add("broken");
  }

  async setup() {
    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
      this.hide();
      console.log("Notifications not supported.");
      return;
    }

    if (Notification.permission === 'denied') {
      console.log("User blocked notifications.");
      return;
    }

    if (!('PushManager' in window)) {
      this.hide();
      console.log("Push notifications not supported.");
      return;
    }

    const serviceWorkerRegistration = await navigator.serviceWorker.ready;
    const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
    if (subscription) {
      this.set_enabled(true, subscription);
    }
  }

  async unsubscribe() {
    const serviceWorkerRegistration = await navigator.serviceWorker.ready;
    let subscription;
    try {
      subscription = await serviceWorkerRegistration.pushManager.getSubscription();
    }
    catch (e) {
      console.log("Error unsubscribing", e);
      return;
    }

    if (!subscription) {
      this.set_enabled(false);
      return;
    }

    try {
      await subscription.unsubscribe();
      this.set_enabled(false);
      const part = encodeURIComponent(subscription.endpoint);
      this.#app.api.delete(`/notification/web_push/${part}`);
    }
    catch (e) {
      console.log("Failed to unsubscribe", e);
    }
  }

  async subscribe() {
    const serviceWorkerRegistration = await navigator.serviceWorker.ready;
    const res = await this.#app.api.get("/notification/web_push_keys");
    const key = res['vapid_public_key'];
    if (!key) {
      // the API's VAPID_PUBLIC isn't set, so there's nothing to subscribe with
      console.log("Push notifications aren't configured on the server");
      alert("Push notifications aren't set up on this server.");
      this.hide();
      return;
    }
    const vapid = base64url.decode(key);

    try {
      const subscription = await serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapid.buffer
      });
      this.set_enabled(true, subscription);
    }
    catch (e) {
      if (Notification.permission === 'denied') {
        console.log("Notifier permission denied");
      }
      else {
        console.log("Unable to subscribe", e);
      }
      this.set_enabled(false);
    }
  }

  build_pref(sub) {
    const rawKey = sub.getKey ? sub.getKey('p256dh') : '';
    const key = rawKey ?
      base64url.encode(rawKey) :
      '';

    const rawAuthSecret = sub.getKey ? sub.getKey('auth') : '';
    const authSecret = rawAuthSecret ?
      base64url.encode(rawAuthSecret) :
      '';

    return {
      endpoint: sub.endpoint,
      key: key,
      auth: authSecret
    };
  }

  set_enabled(bool, sub) {
    this.subscribed = bool;

    if (bool) {
      if (sub) {
        const headers = new Headers();
        headers.append(
          'content-type',
          'application/x-www-form-urlencoded; charset=UTF-8'
        );
        this.#app.api.post("/notification/web_push", {
          body: this.#app.api.build_query(this.build_pref(sub)),
          headers: headers
        });
      }
      document.getElementById("web-notify").classList.add("enabled");
    }
    else {
      document.getElementById("web-notify").classList.remove("enabled");
    }
  }
}

class APN {
  #app;

  constructor(app) {
    this.#app = app;

    this.subscribed = false;
    this.config = {};

    if (APN.supported()) {
      this.setup();
    }
  }

  async setup() {
    this.config = await this.#app.api.get("/notification/apn/config");
  }

  check_per(per) {
    if (per.permission === 'default') {
      console.log('requesting permission', this.config);
      window.safari.pushNotification.requestPermission(
        this.config.service_url,
        this.config.push_id,
        { user: this.config.user },
        (per) => {
          console.log(per);
          this.check_per(per)
        }
      );
    }
    else if (per.permission == 'denied') {
      document.getElementById("web-notify").classList.remove("enabled");
    }
    else if (per.permission == 'granted') {
      document.getElementById("web-notify").classList.add("enabled");
    }
  }

  subscribe() {
    const per = window.safari.pushNotification.permission(this.config.push_id);
    this.check_per(per);
  }

  unsubscribe() {
    const per = window.safari.pushNotification.permission(this.config.push_id);
    this.check_per(per);
  }

  static supported() {
    return 'safari' in window && 'pushNotification' in window.safari
  }
}

export const Notifier = APN.supported() ? APN : WebPush;
