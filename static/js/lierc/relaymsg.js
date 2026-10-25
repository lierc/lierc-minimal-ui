export const RelayMsg = {
  discriminator: "/",

  /* Chat platform allowlist
   *
   * Keys are case-insensitive suffixes to be matched after the RELAYMSG discriminator character,
   * and values are Font Awesome icon names. For example, `discord: "discord"` matches a nickname
   * like "foo/Discord" and replaces "/Discord" with `<i class="fa-discord"></i>`. */
  platforms: {
    discord: "discord",
    slack:   "slack"
  }
};

RelayMsg.parse = function(nick) {
  nick = String(nick === null || nick === undefined ? "" : nick);

  const i = nick.lastIndexOf(RelayMsg.discriminator);

  // Need a name before the discriminator and a suffix after it
  if (i < 1 || i == nick.length - 1)
    return null;

  const platform = nick.substring(i + 1);
  const key = platform.toLowerCase();

  // Avoid weird behavior with prototype object properties
  if (!Object.hasOwn(RelayMsg.platforms, key))
    return null;

  const icon = RelayMsg.platforms[key];

  return {
    name: nick.substring(0, i),
    platform: platform,
    icon: icon
  };
};

RelayMsg.icon = function(relay) {
  const el = document.createElement('I');
  el.classList.add('nick-platform', 'fa-brands', `fa-${relay.icon}`);
  el.setAttribute('title', relay.platform);
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', relay.platform);
  return el;
};

RelayMsg.render = function(nick) {
  const frag = document.createDocumentFragment();
  const relay = RelayMsg.parse(nick);

  if (relay) {
    frag.appendChild(document.createTextNode(relay.name));
    frag.appendChild(RelayMsg.icon(relay));
  } else if (nick) {
    frag.appendChild(document.createTextNode(nick));
  }

  return frag;
};
