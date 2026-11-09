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
      // in the query, not the path: nginx merges the slashes in a path
      this.#app.api.delete("/notification/web_push", {}, { endpoint: subscription.endpoint });
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
        this.save(sub);
      }
      document.getElementById("web-notify").classList.add("enabled");
    }
    else {
      document.getElementById("web-notify").classList.remove("enabled");
    }
  }

  // Sends the subscription to the API. If the API refuses it (it only takes
  // the browsers' push services), push is turned back off and the browser
  // unsubscribed, so the refused subscription isn't sent again on every load.
  async save(sub) {
    const headers = new Headers();
    headers.append(
      'content-type',
      'application/x-www-form-urlencoded; charset=UTF-8'
    );
    try {
      await this.#app.api.post("/notification/web_push", {
        body: this.#app.api.build_query(this.build_pref(sub)),
        headers: headers
      });
    }
    catch (e) {
      console.log("Push subscription refused", e);
      this.set_enabled(false);
      try {
        await sub.unsubscribe();
      }
      catch (e) {
        console.log("Failed to unsubscribe", e);
      }
      alert(`Couldn't turn on push notifications: ${e}`);
    }
  }
}

export const Notifier = WebPush;
