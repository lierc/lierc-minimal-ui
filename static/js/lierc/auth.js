export class Auth {
  #baseurl;

  constructor(baseurl) {
    this.#baseurl = baseurl;
  }

  async auth(complete) {
    let user;
    try {
      const res = await fetch(`${this.#baseurl}/auth`, {
        'credentials': 'same-origin'
      });
      if (!res.ok)
        throw Error(res.statusText);
      user = await res.json();
    }
    catch (e) {
      console.log(e);
      window.location = "/login/";
      return;
    }

    // outside the try: an error starting the app isn't a failed login
    complete(user);
  }
}
