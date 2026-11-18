// Channel join links: /join/?network=<preset alias>&channel=<channel>, for
// projects to link to their channel ("chat with us in your browser"). Only
// the presets in networks.js can be linked to.

import { NETWORKS } from "./networks.js";

// a channel name after its # or &: 1-49 characters, none of them a space,
// a comma or a control character (BEL among them)
const channel_name = /^[#&][^\s,\x00-\x1f\x7f]{1,49}$/;

// parse_join is the link's network (the preset) and channel, or null if
// the link isn't valid. A channel without a leading # gets one, since a
// raw # in a URL starts its fragment and is easy to get wrong.
export function parse_join(params) {
  const alias = (params.get("network") ?? "").toLowerCase();
  const network = NETWORKS.find((n) => n.Alias == alias);
  let channel = params.get("channel") ?? "";
  if (channel && channel[0] != "#" && channel[0] != "&")
    channel = "#" + channel;
  if (!network || !channel_name.test(channel))
    return null;
  return { network, channel };
}

// join_path is the join link for channel on network, as a path on this site.
export function join_path(network, channel) {
  return `/join/?network=${encodeURIComponent(network.Alias)}&channel=${encodeURIComponent(channel)}`;
}

// safe_next is next if it's a join link on this site, which is all login and
// signup will go on to afterwards; anything else is null. (auth-page.js, a
// classic script, has its own copy of this rule.)
export function safe_next(next) {
  return typeof next == "string" && next.startsWith("/join/?") ? next : null;
}

// irc_nick is the IRC nick for a username, as lierc-api's accounts.IrcNick
// makes it for the default network: anything outside [A-Za-z0-9_] becomes
// "_", a leading digit gets a "_" in front, and it keeps at most 32
// characters. Usernames may have "." and start with a digit; nicks can't.
export function irc_nick(username) {
  let nick = Array.from(username, (c) => /[A-Za-z0-9_]/.test(c) ? c : "_");
  if (/[0-9]/.test(nick[0] ?? ""))
    nick.unshift("_");
  return nick.slice(0, 32).join("");
}
