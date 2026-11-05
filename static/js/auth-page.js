// The login, register, reset and verify pages: post a form to its data-api
// endpoint, showing the API's error on failure. On success a form goes to
// the app, or, with data-success="message", is replaced by the element named
// in data-message.
//
// The reset and verify pages are opened from emailed links that carry a
// token after "#" (so it never reaches the server or its logs). It's read
// once, removed from the address bar, and sent as "token" in a POST body.

const token_form = document.querySelector("form[data-token]");
const verify_page = document.querySelector("main[data-verify]");
let token = "";

// a link mangled on the way (a bad % escape) counts as no token
function read_token() {
  let t = "";
  try {
    t = decodeURIComponent(location.hash.slice(1));
  }
  catch (e) {}
  if (location.hash)
    history.replaceState(null, "", location.pathname);
  // opening a link in a tab already on the page only changes the hash
  window.addEventListener("hashchange", () => location.reload());
  return t;
}

if (token_form) {
  // no token: the email form, so a new link can be requested
  token = read_token();
  const shown = token ? token_form : document.querySelector("form[data-api]:not([data-token])");
  shown.hidden = false;
  shown.querySelector("input:not([type=submit])")?.focus();
}
else if (verify_page) {
  // confirms without logging in, so it works whoever is logged in
  token = read_token();
  const show = (id) => {
    for (const panel of ["confirmed", "invalid", "error", "check"])
      document.getElementById(panel).hidden = panel != id;
  };
  // only a 400 means the link itself is bad; anything else (a server error,
  // no connection) may pass on a retry with the token kept in memory
  const confirm = () => {
    fetch("/api/verify", {
      method: "POST",
      credentials: "same-origin",
      body: new URLSearchParams({ token: token }),
    }).then((res) => show(res.ok ? "confirmed" : res.status == 400 ? "invalid" : "error"))
      .catch(() => show("error"));
  };
  document.getElementById("retry").addEventListener("click", confirm);

  // without a token: a signed-in signup that hasn't confirmed yet (sent
  // here by the app) is told to check its email; anyone else has a bad
  // link. Never sent back to the app, so the two pages can't loop.
  const check = async () => {
    try {
      const res = await fetch("/api/auth", { credentials: "same-origin" });
      const user = res.ok ? await res.json() : null;
      if (user?.verified === false) {
        document.getElementById("check-email").textContent = user.email;
        show("check");
        return;
      }
    }
    catch (e) {}
    show("invalid");
  };

  const resend = document.getElementById("resend");
  const status = document.getElementById("resend-status");
  resend.addEventListener("click", async () => {
    resend.disabled = true;
    status.textContent = "";
    try {
      const res = await fetch("/api/verify/resend", { method: "POST", credentials: "same-origin" });
      if (!res.ok) {
        let message = res.statusText;
        try {
          message = (await res.json()).error || message;
        }
        catch (_) {}
        throw Error(message);
      }
      status.textContent = "Sent. Check your inbox.";
    }
    catch (e) {
      status.textContent = e.message || "Something went wrong";
    }
    resend.disabled = false;
  });

  document.getElementById("logout").addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
    }
    catch (_) {}
    window.location = "/login/";
  });

  if (token)
    confirm();
  else
    check();
}
else {
  // someone already logged in goes straight to the app
  fetch("/api/auth", { credentials: "same-origin" }).then((res) => {
    if (res.ok)
      window.location = "/app/";
  });
}

document.querySelectorAll("form[data-api]").forEach((form) => {
  const error = form.querySelector(".error");
  const submit = form.querySelector('input[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submit.disabled = true;
    error.textContent = "";

    const body = new URLSearchParams(new FormData(form));
    if ("token" in form.dataset)
      body.set("token", token);

    try {
      const res = await fetch(form.dataset.api, {
        method: "POST",
        credentials: "same-origin",
        body: body,
      });
      if (!res.ok) {
        let message = res.statusText;
        try {
          message = (await res.json()).error || message;
        }
        catch (_) {}
        throw Error(message);
      }
      if (form.dataset.success == "message") {
        form.hidden = true;
        document.getElementById(form.dataset.message).hidden = false;
      }
      else {
        window.location = "/app/";
      }
    }
    catch (e) {
      error.textContent = e.message || "Something went wrong";
      submit.disabled = false;
    }
  });
});
