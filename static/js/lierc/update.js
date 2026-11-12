// Tells an open app page when a newer UI version is out, so it can offer a
// reload. static/version.json holds the deployed version; the page's own is
// the ui-version meta tag that make bust stamps into app/index.html. Only a
// bumped number counts: most deploys leave it alone and stay silent.

const VERSION_URL = "/static/version.json";
const INTERVAL = 10 * 60 * 1000;

function positiveInt(v) {
  return Number.isInteger(v) && v > 0;
}

// The version this page was loaded with, or null.
export function pageVersion(doc) {
  const s = doc.querySelector('meta[name="ui-version"]')?.getAttribute("content");
  if (!s || !/^[1-9][0-9]*$/.test(s))
    return null;
  return Number(s);
}

// Whether version.json's data names a version newer than page.
export function isNewer(page, data) {
  return positiveInt(page) && positiveInt(data?.version) && data.version > page;
}

// Checks every interval, and when the page comes back into view if the last
// check was longer ago than that (a sleeping phone tab catches up). Not at
// load: a page that just loaded is current. On finding a newer version it
// calls onUpdate once and stops. Failures are ignored until the next check.
export class UpdateCheck {
  #doc; #fetch; #now; #setInterval; #clearInterval; #interval; #onUpdate;
  #page; #last; #timer = null; #done = false;
  #onVisible = () => {
    if (!this.#doc.hidden && this.#now() - this.#last > this.#interval)
      this.check();
  };

  constructor({ doc, fetch, now, setInterval, clearInterval, interval = INTERVAL, onUpdate }) {
    this.#doc = doc;
    this.#fetch = fetch;
    this.#now = now;
    this.#setInterval = setInterval;
    this.#clearInterval = clearInterval;
    this.#interval = interval;
    this.#onUpdate = onUpdate;
  }

  start() {
    this.#page = pageVersion(this.#doc);
    if (this.#page === null)
      return; // a page without its version can't compare
    this.#last = this.#now();
    this.#timer = this.#setInterval(() => this.check(), this.#interval);
    this.#doc.addEventListener("visibilitychange", this.#onVisible);
  }

  async check() {
    if (this.#done || this.#page === null)
      return;
    this.#last = this.#now();
    let data;
    try {
      const res = await this.#fetch(VERSION_URL, { cache: "no-cache" });
      if (!res.ok)
        return;
      data = await res.json();
    }
    catch (e) {
      return;
    }
    if (this.#done || !isNewer(this.#page, data))
      return;
    this.#done = true;
    this.#clearInterval(this.#timer);
    this.#doc.removeEventListener("visibilitychange", this.#onVisible);
    this.#onUpdate();
  }
}
