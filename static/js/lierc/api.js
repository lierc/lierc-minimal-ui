import { Stream } from "./stream.js";

export class API {
  constructor(baseurl) {
    this.baseurl = baseurl;
  }

  // resolves with the response data, rejects with an "API Error: ..." message
  async request(method, path, options = {}) {
    const settings = {
      method: method,
      credentials: 'same-origin'
    };

    if (options['body']) {
      const body = options['body'];
      if (body && typeof(body) == "object") {
        settings['body'] = JSON.stringify(body);
      }
      else {
        settings['body'] = body;
      }
    }

    if (options['headers']) {
      settings['headers'] = options['headers'];
    }

    const res = await fetch(this.baseurl + path, settings);
    const type = res.headers.get('Content-Type');
    let data;

    if (type?.match(/^application\/javascript/)) {
      data = await res.json();
    }
    else if (res.ok) {
      data = await res.text();
    }
    else {
      throw new Error(
        `API Error: [${res.status}] '${res.statusText}'`
      );
    }

    if (data['status'] == "error") {
      throw `API Error: ${data['error']}`;
    }

    return data;
  }

  build_query(params) {
    return Object.keys(params).map((k) => {
      return [
        encodeURIComponent(k),
        encodeURIComponent(params[k])
      ].join("=")
    }).join("&");
  }

  stream() {
    return new Stream(this.baseurl);
  }

  // resolves with the response, or {status: 0} if the request failed
  async auth() {
    try {
      return await fetch(`${this.baseurl}/auth`, {
        credentials: 'same-origin'
      });
    }
    catch (e) {
      return {status: 0};
    }
  }

  async logout() {
    const res = await fetch(`${this.baseurl}/logout`, {
      'method': 'POST',
      'credentials': 'same-origin',
    });
    if (!res.ok)
      alert('Error!');
    else
      window.location.reload();
  }

  get(path, options = {}) {
    if (options['data'])
      path += `?${this.build_query(options['data'])}`;
    return this.request('GET', path, options);
  }

  post(path, options) {
    return this.request('POST', path, options);
  }

  delete(path, options, query) {
    if (query)
      path += `?${this.build_query(query)}`;
    return this.request('DELETE', path, options);
  }

  put(path, options) {
    return this.request('PUT', path, options);
  }
}
