import { Dialog } from "./dialog.js";

export class Auth {
  #baseurl;

  constructor(baseurl) {
    this.#baseurl = baseurl;
  }

  async auth(complete) {
    try {
      const res = await fetch(`${this.#baseurl}/auth`, {
        'credentials': 'same-origin'
      });
      if (!res.ok)
        throw Error(res.statusText);
      complete(await res.json());
    }
    catch (e) {
      console.log(e);
      this.#modal_overlay(complete);
    }
  }

  #modal_overlay(complete) {
    const dialog = new Dialog('login');
    const overlay = dialog.el;
    dialog.append(document.body);

    if (!("ontouchstart" in document.documentElement)) {
      overlay.querySelector('.login-form input[name="email"]').focus();
    }

    overlay.addEventListener("submit", async (e) => {
      e.preventDefault();
      const action = e.target.querySelector('input[type="submit"]').getAttribute('name');
      const email = e.target.querySelector('input[name="email"]').value;
      const pass = e.target.querySelector('input[type="password"]').value;

      let body = "";
      body += `email=${encodeURIComponent(email)}`;
      body += `&pass=${encodeURIComponent(pass)}`;

      if (action == "register") {
        const user = e.target.querySelector('input[name="username"]').value;
        body += `&username=${encodeURIComponent(user)}`;
      }

      try {
        const res = await fetch(`${this.#baseurl}/${action}`, {
          'credentials': 'same-origin',
          'method': "POST",
          'body': body,
          'headers': {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
          }
        });
        if (!res.ok)
          throw Error(res.statusText);
        const data = await res.json();
        dialog.close();
        complete(data);
      }
      catch (e) {
        alert(`Sorry: ${e}`);
      }
    });

    overlay.querySelector('.login-toggle').addEventListener('click', (e) => {
      e.preventDefault();
      overlay.querySelector('.login-wrap').style.display = 'block';
      overlay.querySelector('.reset-wrap').style.display = 'none';
      overlay.querySelector('.login-form input[name="email"]').focus();
    });

    overlay.querySelector('.reset-toggle').addEventListener('click', (e) => {
      e.preventDefault();
      overlay.querySelector('.login-wrap').style.display = 'none';
      overlay.querySelector('.reset-wrap').style.display = 'block';
      overlay.querySelector('.reset-wrap input[name="email"]').focus();
    });
  }
}
