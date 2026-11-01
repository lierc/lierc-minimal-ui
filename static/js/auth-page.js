// The login and register pages: post the form to its data-api endpoint and
// go to the app on success, showing the API's error otherwise. Someone
// already logged in goes straight to the app.

fetch("/api/auth", { credentials: "same-origin" }).then((res) => {
  if (res.ok)
    window.location = "/app/";
});

const form = document.querySelector("form[data-api]");
const error = form.querySelector(".error");
const submit = form.querySelector('input[type="submit"]');

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submit.disabled = true;
  error.textContent = "";

  try {
    const res = await fetch(form.dataset.api, {
      method: "POST",
      credentials: "same-origin",
      body: new URLSearchParams(new FormData(form)),
    });
    if (!res.ok) {
      let message = res.statusText;
      try {
        message = (await res.json()).error || message;
      }
      catch (_) {}
      throw Error(message);
    }
    window.location = "/app/";
  }
  catch (e) {
    error.textContent = e.message || "Something went wrong";
    submit.disabled = false;
  }
});
