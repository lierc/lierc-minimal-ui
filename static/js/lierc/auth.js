// How long to wait before checking again when the first /auth check fails
// for a reason other than being logged out, doubling up to the max.
const retry_min = 2000;
const retry_max = 30000;

// is_auth_failure reports whether an /auth response is the API saying the
// session isn't logged in: a 401 with the API's JSON error body. A 401
// from anything in front of it (nginx, Fastly) has no such body, and
// other failures (a 502 while the API restarts) say nothing about the
// session. The response's body is left unread.
export async function is_auth_failure(res) {
  if (res.status != 401)
    return false;
  const type = res.headers.get('Content-Type');
  if (!type?.match(/^application\/javascript/))
    return false;
  try {
    const data = await res.clone().json();
    return data?.status == "error";
  }
  catch (e) {
    return false;
  }
}

export class Auth {
  #baseurl;

  constructor(baseurl) {
    this.#baseurl = baseurl;
  }

  // auth calls complete with the logged in user. Logged out, it goes to
  // the login page; any other failure is retried, so an API restart
  // doesn't send someone who is logged in to the login page.
  async auth(complete) {
    let delay = retry_min;
    for (;;) {
      const user = await this.#check();
      if (user === false) {
        window.location = "/login/";
        return;
      }
      if (user) {
        // an error starting the app isn't a failed login
        complete(user);
        return;
      }
      console.log(`checking login failed, retrying in ${delay / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, retry_max);
    }
  }

  // #check resolves with the user, false when logged out, or null when it
  // can't tell.
  async #check() {
    try {
      const res = await fetch(`${this.#baseurl}/auth`, {
        'credentials': 'same-origin'
      });
      if (res.ok)
        return await res.json();
      if (await is_auth_failure(res))
        return false;
      console.log(`/auth: ${res.status}`);
    }
    catch (e) {
      console.log(e);
    }
    return null;
  }
}
