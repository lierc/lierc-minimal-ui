// Tells an open app page when a newer UI release is out, so it can offer a
// reload. static/version.json names the deployed release; the page's own is
// the ui-release meta tag in app/index.html. The release build (bin/build)
// writes both from the release's tag, vX.Y.Z. Only a new major or minor
// counts: a patch release deploys without telling open tabs.

const VERSION_URL = "/static/version.json";
// the page a reload loads; it must carry the new release as well
const PAGE_URL = "/app/";
const INTERVAL = 10 * 60 * 1000;

// A release, "X.Y.Z", as {major, minor, patch}, or null.
export function parseRelease(s) {
  const m = typeof s == "string" && /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.exec(s);
  return m ? { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) } : null;
}

// The release this page was loaded with, or null (a page from the working
// tree has none).
export function pageRelease(doc) {
  return parseRelease(doc.querySelector('meta[name="ui-release"]')?.getAttribute("content"));
}

// The release in a page's HTML (its ui-release meta tag), or null.
export function htmlRelease(text) {
  const m = /<meta name="ui-release" content="([^"]*)">/.exec(text || "");
  return m ? parseRelease(m[1]) : null;
}

// Whether release a is a later major or minor than b.
function laterMinor(a, b) {
  return a.major > b.major || (a.major == b.major && a.minor > b.minor);
}

// Whether version.json's data names a newer major or minor than page.
export function isNewer(page, data) {
  const release = parseRelease(data?.release);
  return !!(page && release && laterMinor(release, page));
}

// Checks every interval, and when the page comes back into view if the last
// check was longer ago than that (a sleeping phone tab catches up). Not at
// load: a page that just loaded is current. A newer release counts only if
// the page a reload would load carries it too: if a deploy hasn't purged
// the old page from Fastly yet, a reload would land back here, so nothing
// is shown and the next check tries again. On finding it, it calls onUpdate
// once and stops. Failures are ignored until the next check.
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
    this.#page = pageRelease(this.#doc);
    if (this.#page === null)
      return; // a page without its release can't compare
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
    try {
      const res = await this.#fetch(PAGE_URL, { cache: "no-cache" });
      const app = res.ok && htmlRelease(await res.text());
      if (!app || laterMinor(parseRelease(data.release), app))
        return;
    }
    catch (e) {
      return;
    }
    if (this.#done)
      return;
    this.#done = true;
    this.#clearInterval(this.#timer);
    this.#doc.removeEventListener("visibilitychange", this.#onVisible);
    this.#onUpdate();
  }
}
