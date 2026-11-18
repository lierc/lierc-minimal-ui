// The networks the Add a connection dialog offers, filling in the server
// fields. Each was checked to accept TLS on its port with a valid
// certificate (2026-11-17), except relaychat's own, which liercd reaches
// without TLS: the address and port are the API's DEFAULT_NETWORK_HOST and
// DEFAULT_NETWORK_PORT, which new accounts are connected to, and which the
// API lets through even though it isn't a public address.
export const NETWORKS = [
  { name: "Relaychat", Host: "irc.relaychat.party", Port: 6667, Ssl: false, Alias: "relaychat", Channels: "#relaychat" },
  { name: "Libera.Chat", Host: "irc.libera.chat", Port: 6697, Ssl: true, Alias: "libera" },
  { name: "OFTC", Host: "irc.oftc.net", Port: 6697, Ssl: true, Alias: "oftc" },
  { name: "IRCnet", Host: "irc.ircnet.com", Port: 6697, Ssl: true, Alias: "ircnet" },
  { name: "Rizon", Host: "irc.rizon.net", Port: 6697, Ssl: true, Alias: "rizon" },
  { name: "EsperNet", Host: "irc.esper.net", Port: 6697, Ssl: true, Alias: "esper" },
  { name: "hackint", Host: "irc.hackint.org", Port: 6697, Ssl: true, Alias: "hackint" },
  { name: "Snoonet", Host: "irc.snoonet.org", Port: 6697, Ssl: true, Alias: "snoonet" },
  { name: "tilde.chat", Host: "irc.tilde.chat", Port: 6697, Ssl: true, Alias: "tilde" },
];

// The preset whose server is host:port, or undefined.
export const network_for = (host, port) =>
  NETWORKS.find((n) => n.Host == String(host ?? "").trim().toLowerCase() && n.Port == port);
