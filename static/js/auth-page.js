// The login, register and reset pages: post a form to its data-api endpoint,
// showing the API's error on failure. On success a form goes to the app, or,
// with data-success="message", is replaced by the element named in
// data-message.
//
// The reset page has a form with data-token. The emailed link carries the
// token after "#" (so it never reaches the server or its logs); it's read
// once, removed from the address bar, and sent as "token" in the body.

const token_form = document.querySelector("form[data-token]");
let token = "";

if (token_form) {
  token = decodeURIComponent(location.hash.slice(1));
  if (location.hash)
    history.replaceState(null, "", location.pathname);
  const shown = token ? token_form : document.querySelector("form[data-api]:not([data-token])");
  shown.hidden = false;
  shown.querySelector("input:not([type=submit])")?.focus();

  // opening the link in a tab already on /reset/ only changes the hash
  window.addEventListener("hashchange", () => location.reload());
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
