// The /join/ page: shows a channel join link's channel and network, and on
// Join (never on load) gets the logged-in user into it: a JOIN on their
// connection to that network, or a new connection to it that joins the
// channel. Then it opens the app on the channel, which focuses it once
// it's joined.

import { parse_join, join_path } from "./lierc/join-link.js";

const link = parse_join(new URLSearchParams(location.search));

function show(id) {
  for (const panel of ["logged-out", "logged-in", "invalid"])
    document.getElementById(panel).hidden = panel != id;
}

// the API's error message from a failed response, or a general one
async function api_error(res) {
  try {
    return (await res.json()).error || "Something went wrong";
  }
  catch (e) {
    return "Something went wrong";
  }
}

async function api(method, path, body, type) {
  const opts = { method, credentials: "same-origin" };
  if (body !== undefined) {
    opts.body = body;
    opts.headers = { "content-type": type };
  }
  const res = await fetch("/api" + path, opts);
  if (!res.ok)
    throw new Error(await api_error(res));
  return res.json();
}

// join gets user into the link's channel and returns the connection id
async function join(user) {
  const { network, channel } = link;
  const conns = await api("GET", "/connection");
  const conn = conns.find((c) =>
    String(c.Config?.Host ?? "").toLowerCase() == network.Host && Number(c.Config?.Port) == network.Port);
  if (conn) {
    await api("POST", `/connection/${encodeURIComponent(conn.Id)}`, `JOIN ${channel}`, "application/irc");
    return conn.Id;
  }
  const created = await api("POST", "/connection", JSON.stringify({
    Host: network.Host,
    Port: network.Port,
    Ssl: network.Ssl,
    Alias: network.Alias,
    Nick: user.user,
    User: user.user,
    Pass: "",
    SASL: false,
    Highlight: [user.user],
    Channels: [channel],
  }), "application/json");
  return created.Id;
}

async function main() {
  if (!link) {
    show("invalid");
    return;
  }
  for (const el of document.querySelectorAll(".channel"))
    el.textContent = link.channel;
  for (const el of document.querySelectorAll(".network"))
    el.textContent = link.network.name;
  document.title = `Join ${link.channel} on ${link.network.name} · relaychat.party`;

  let user = null;
  try {
    const res = await fetch("/api/auth", { credentials: "same-origin" });
    if (res.ok)
      user = await res.json();
  }
  catch (e) {}

  if (!user) {
    const next = encodeURIComponent(join_path(link.network, link.channel));
    document.getElementById("register").href = `/register/?next=${next}`;
    document.getElementById("login").href = `/login/?next=${next}`;
    show("logged-out");
    return;
  }

  const button = document.getElementById("join");
  const error = document.getElementById("join-error");
  button.addEventListener("click", async () => {
    button.disabled = true;
    error.textContent = "";
    try {
      const id = await join(user);
      location = `/app/#/${encodeURIComponent(id)}/${encodeURIComponent(link.channel)}`;
    }
    catch (e) {
      error.textContent = e.message || "Something went wrong";
      button.disabled = false;
    }
  });
  show("logged-in");
}

main();
