// The networks the Add a connection dialog offers, filling in the server
// fields. Each was checked to accept TLS on its port with a valid
// certificate (2026-11-17), except relaychat's own, which liercd reaches
// without TLS: the address and port are the API's DEFAULT_NETWORK_HOST and
// DEFAULT_NETWORK_PORT, which new accounts are connected to, and which the
// API lets through even though it isn't a public address. Public is the
// server as people outside reach it (TLS on 6697), for the join page to
// show. About is the join page's line about the network.
export const NETWORKS = [
  { name: "Relaychat", Host: "irc.relaychat.party", Port: 6667, Ssl: false, Alias: "relaychat", Channels: "#relaychat", Public: { Port: 6697, Ssl: true },
    About: "Relaychat's own network, where new accounts start." },
  { name: "Libera.Chat", Host: "irc.libera.chat", Port: 6697, Ssl: true, Alias: "libera",
    About: "Free and open source software projects and their communities." },
  { name: "OFTC", Host: "irc.oftc.net", Port: 6697, Ssl: true, Alias: "oftc",
    About: "The Open and Free Technology Community: free software projects such as Debian and Tor." },
  { name: "IRCnet", Host: "irc.ircnet.com", Port: 6697, Ssl: true, Alias: "ircnet",
    About: "One of the oldest IRC networks, popular in Europe." },
  { name: "Rizon", Host: "irc.rizon.net", Port: 6697, Ssl: true, Alias: "rizon",
    About: "A large general network, known for its anime and gaming channels." },
  { name: "EsperNet", Host: "irc.esper.net", Port: 6697, Ssl: true, Alias: "esper",
    About: "A network for gaming communities, Minecraft modding among them." },
  { name: "hackint", Host: "irc.hackint.org", Port: 6697, Ssl: true, Alias: "hackint",
    About: "A network for hackers and makers, the Chaos Computer Club among them." },
  { name: "Snoonet", Host: "irc.snoonet.org", Port: 6697, Ssl: true, Alias: "snoonet",
    About: "Started for Reddit communities; now a general chat network." },
  { name: "tilde.chat", Host: "irc.tilde.chat", Port: 6697, Ssl: true, Alias: "tilde",
    About: "The tildeverse's network, for public-access unix communities." },
];

// The preset whose server is host:port, or undefined.
export const network_for = (host, port) =>
  NETWORKS.find((n) => n.Host == String(host ?? "").trim().toLowerCase() && n.Port == port);

// The server as the join page shows it: "host:port, TLS", for the address
// people outside reach (Public, where liercd's own differs).
export function server_label(n) {
  const port = n.Public?.Port ?? n.Port;
  const ssl = n.Public?.Ssl ?? n.Ssl;
  return `${n.Host}:${port}${ssl ? ", TLS" : ""}`;
}
