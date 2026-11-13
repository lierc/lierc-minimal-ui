// Display text for the Logins dialog: a short name for a login's browser,
// and how long ago it was used and signed in. The API sends the raw user
// agent; naming it is left to the UI.

// Checked in order: Edge and Opera also say Chrome, the iOS browsers and
// Chrome also say Safari.
const BROWSERS = [
  ["Edge", /\bEdg(e|A|iOS)?\//],
  ["Opera", /\bOPR\//],
  ["Firefox", /\b(Firefox|FxiOS)\//],
  ["Chrome", /\b(Chrome|CriOS)\//],
  ["Safari", /\bVersion\/[\d.]+.*\bSafari\//],
];

const SYSTEMS = [
  ["iPhone", /\biPhone\b/],
  ["iPad", /\biPad\b/],
  ["Android", /\bAndroid\b/],
  ["ChromeOS", /\bCrOS\b/],
  ["Windows", /\bWindows\b/],
  ["macOS", /\bMac OS X\b/],
  ["Linux", /\bLinux\b/],
];

const first = (list, s) => list.find(([, re]) => re.test(s))?.[0];

// "Safari on iPhone", "Firefox", or "Unknown browser".
export function describe_agent(ua) {
  const s = typeof ua == "string" ? ua : "";
  const browser = first(BROWSERS, s);
  if (!browser)
    return "Unknown browser";
  const system = first(SYSTEMS, s);
  return system ? `${browser} on ${system}` : browser;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const plural = (n, word) => `${n} ${word}${n == 1 ? "" : "s"}`;

// How recently a login was used. last_used is only updated about hourly,
// so anything under an hour (or in the future, from clock skew) is "within
// the hour". A login with the app open (an event stream connected) is
// "connected now", except this browser's, which is always "active now".
export function active_text(last_used, current, now, connected) {
  if (current)
    return "active now";
  if (connected)
    return "connected now";
  const ago = now - last_used;
  if (ago < HOUR)
    return "active within the hour";
  if (ago < DAY)
    return `active ${plural(Math.floor(ago / HOUR), "hour")} ago`;
  return `active ${plural(Math.floor(ago / DAY), "day")} ago`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Nov 9", or "Dec 31, 2025" when it isn't this year, in the viewer's own
// time zone, so an evening sign-in isn't shown as the next day.
export function signed_in_text(created, now) {
  const day = `${MONTHS[created.getMonth()]} ${created.getDate()}`;
  return created.getFullYear() == now.getFullYear() ? day : `${day}, ${created.getFullYear()}`;
}
