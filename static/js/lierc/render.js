import { Format } from "./format.js";
import { RelayMsg } from "./relaymsg.js";

export const Render = function(message, opts) {
  if (!opts) opts = {};
  if (opts['raw']) return raw(message);
  switch (String(message.Command)) {
  case "NICK": {
    const old = message.Prefix.Name;
    const nick = message.Params[0];
    message.Prefix.Name = nick;
    return append(
      make("event", message),
      [
        append(make_text(), [RelayMsg.render(old), " is now known as "]),
        make_nick(message),
        timestamp(message)
      ]
    );
  }

  case "PART": {
    const nick = message.Prefix.Name;
    const name = message.Params[0];
    const msg = message.Params[1];
    return append(
      make("event", message),
      [
        make_nick(message, name),
        make_text(` has left${msg ? ` (${msg})` : ""}`),
        timestamp(message)
      ]
    );
  }

  case "KICK": {
    const name = message.Params[0];
    const nick = message.Params[1];
    const msg = message.Params[2];
    return append(
      make("event", message),
      [
        make_nick(message, name),
        make_text(` kicked ${nick}${msg ? ` (${msg})` : ""}`),
        timestamp(message)
      ]
    );
  }

  case "MODE":
    if (message.Prefix.Nick == message.Params[0]) {
      return raw(message);
    }
    else {
      const channel = message.Params[0];
      return append(
        make("event", message),
        [
          make_text(message.Params.slice(1).join(" ")),
          make_text(` by ${message.Prefix.Name}`),
          timestamp(message)
        ]
      );
    }

  case "QUIT": {
    const nick = message.Prefix.Name;
    const msg = message.Params[0];
    return append(
      make("event", message),
      [
        make_nick(message),
        make_text(` has quit${msg ? ` (${msg})` : ""}`),
        timestamp(message)
      ]
    );
  }

  case "JOIN": {
    const name = message.Params[0];
    const nick = message.Prefix.Name;
    return append(
      make("event", message),
      [
        make_nick(message, name),
        make_text(' has joined the channel'),
        timestamp(message)
      ]
    );
  }

  case "332": {
    const name = message.Params[1];
    const text = message.Params[2];

    const span = append(
      make_text(),
      [
        make_text("Topic: "),
      ].concat(Format(text))
    );

    return append(
      make("event", message),
      [ span ]
    );
  }

  case "TOPIC": {
    const nick = message.Prefix.Name;
    const name = message.Params[0];
    const text = message.Params[1];

    const span = append(
      make_text(),
      [
        make_nick(message, name),
        make_text(" changed the topic: "),
      ].concat(Format(text))
    );

    return append(
      make("event", message),
      [
        span,
        timestamp(message)
      ]
    );
  }

  case "PRIVMSG": {
    const nick = message.Prefix.Name;

    if (message.Params.length < 2)
      return;

    const name = message.Params[0];
    let text = message.Params[1];

    if (!name.length)
      return raw(message);

    if (!text)
      text = "";

    const from = make_nick(message, name);
    const color = string_to_color(color_seed(message.Prefix));
    const wrap = make_text();
    wrap.setAttribute('class', 'message-text');
    from.style.color = color;
    const msg = make_text();
    msg.setAttribute('class', 'message-text-pre');
    wrap.appendChild(msg);

    if (text.substring(0, 1) == "\x01") {
      if (text.substring(1,7) == "ACTION") {
        decorate_nick(from, nick, '* ', ' ');
        const action = text.substring(8).replace(/\x01$/, "");
        msg.style.fontStyle = 'italic';
        from.style.fontStyle = 'italic';
        append(msg, Format(action));
      }
      else {
        return;
      }
    }
    else {
      decorate_nick(from, nick, `< ${channel_prefix(name)}`, '> ');
      append(msg, Format(text));
    }

    const li = make("message", message);

    return append(
      li,
      [
        flex(from, wrap, timestamp(message)),
        opts['controls'] !== false ? controls(message) : null
      ]
    );
  }

  case "401":
  case "403":
  case "482": {
    const text = `${message.Params[2]} '${message.Params[1]}'`;
    const el = make("raw", message);
    el.textContent = text;
    return el;
  }

  case "NOTICE": {
    const name = message.Prefix.Name;
    const text = message.Params[1];

    const chan = make_text(name);
    chan.setAttribute('class', 'channel');
    const span = append(
      make_text(' '),
      Format(text)
    );

    return append(
      make("raw notice", message),
      [chan, span]
    );
  }

  case "CONNECT": {
    if (message.Params.length != 1)
      return;

    const host = message.Prefix.Name;
    const span = make_text(`${host} `);
    span.setAttribute('class', 'host');

    return append(
      make("raw notice", message),
      [ span, message.Params[0] ]
    );
  }

  case "DISCONNECT": {
    if (message.Params.length != 1)
      return;

    const host = message.Prefix.Name;
    const span = make_text(`${host} `);
    span.setAttribute('class', 'host');

    return append(
      make("raw notice", message),
      [ span, message.Params[0] ]
    );
  }

  case "TAGMSG":
    return;

  default:
    return raw(message);
  };

  function append(node, children) {
    for (let i=0; i < children.length; i++) {
      if (children[i] === null) {
        // do nothing
      }
      else if (typeof(children[i]) === "string") {
        node.appendChild(document.createTextNode(children[i]));
      }
      else {
        try {
          node.appendChild(children[i]);
        } catch (e) {
          console.log(e, children[i]);
        }
      }
    }
    return node;
  };

  function make_text(text) {
    const el = document.createElement('SPAN');
    if (text)
      el.textContent = text;
    return el;
  }

  function make_nick(message, channel) {
    const prefix = `${message.Prefix.Name}!${message.Prefix.User}@${message.Prefix.Server}`;

    const el = document.createElement('SPAN');
    el.setAttribute('data-nick', message.Prefix.Name);
    el.setAttribute('title', prefix);
    el.classList.add('message-nick');

    decorate_nick(el, message.Prefix.Name, channel_prefix(channel));

    return el;
  }

  function channel_prefix(channel) {
    return channel && opts['show_channel'] ? `${channel}:` : "";
  }

  function decorate_nick(el, nick, before, after) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }

    if (before)
      el.appendChild(document.createTextNode(before));

    el.appendChild(RelayMsg.render(nick));

    if (after)
      el.appendChild(document.createTextNode(after));
  }

  function raw (message) {
    let text = "";

    if (message.Command.match(/^[45][0-9][0-9]$/))
      text = message.Params.join(" ");
    else if (message.Command.match(/^[0-9][0-9][0-9]$/))
      text = message.Params.slice(1).join(" ");
    else
      text = [message.Prefix.Name, message.Command].concat(message.Params).join(" ");

    const raw = make("raw", message);
    raw.textContent = text;
    return raw;
  }

  function timestamp (message) {
    const date = new Date(message.Time * 1000);
    let h = String(date.getHours());
    if (h.length < 2)
      h = `0${h}`;
    let m = String(date.getMinutes());
    if (m.length < 2)
      m = `0${m}`;

    const time = document.createElement('TIME');
    time.setAttribute('data-time', message.Time);
    time.setAttribute('title', date.toString());

    if (opts?.['full_date']) {
      const mos = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
      const mo = mos[date.getMonth()];
      const y = date.getYear() + 1900;
      const d = date.getDate();
      time.textContent =  `${mo} ${d}, ${y} ${h}:${m}`;
    }
    else {
      time.textContent = `${h}:${m}`;
    }

    return time;
  }

  // a reaction needs the message's msgid, so without one there are no controls
  function controls (message) {
    if (!message.Tags?.["msgid"])
      return null;

    const controls = document.createElement('DIV');
    controls.classList.add('message-controls', 'popup-toggle');

    const react = document.createElement('DIV');
    react.classList.add('message-react', 'popup-toggle');
    controls.appendChild(react);

    return controls;
  }

  function make (type, message) {
    const li = document.createElement("LI");
    li.classList.add("chat", message.Command.toLowerCase());
    const classes = type.split(" ");
    for (let i=0; i < classes.length; i++) {
      li.classList.add(classes[i]);
    }
    if (message.Prefix.Self)
      li.classList.add("self");
    if (message.Highlight)
      li.classList.add("highlight")
    if (message.Search)
      li.classList.add("search")

    if (message.Id)
      li.setAttribute('data-message-id', message.Id);
    if (message.Tags?.["msgid"])
      li.setAttribute('data-message-server-id', message.Tags["msgid"]);
    if (message.Time)
      li.setAttribute('data-time', message.Time);
    return li;
  }

  function flex (...children) {
    const wrap = document.createElement('DIV');
    wrap.setAttribute('class', 'message-flex');
    for (const child of children) {
      wrap.appendChild(child);
    }
    return wrap;
  }

  function color_seed(prefix) {
    const nick = prefix.Name || '';
    const user = (prefix.User || '').replace('~', '');

    if (!user || nick.indexOf(RelayMsg.discriminator) != -1)
      return nick;

    return user;
  }

  function string_to_color(str){
    const colors = [
      "MediumVioletRed",
      "PaleVioletRed",
      "DeepPink",
      "HotPink",
      "Red",
      "#da1717", // "DarkRed",
      "FireBrick",
      "Crimson",
      "IndianRed",
      "Orange",
      "DarkOrange",
      "Coral",
      "Tomato",
      "OrangeRed",
      "Maroon",
      "#bb4545", // "Brown",
      "#c56232", // "Sienna",
      "SaddleBrown",
      "Chocolate",
      "Peru",
      "DarkGoldenrod",
      "Goldenrod",
      "#6363b3", // "MidnightBlue",
      "MediumBlue",
      "#4040ff", // "Blue",
      "RoyalBlue",
      "SteelBlue",
      "CornflowerBlue",
      "DodgerBlue",
      "DeepSkyBlue",
      "LightSkyBlue",
      "SkyBlue",
      "MediumSlateBlue",
      "SlateBlue",
      "DarkSlateBlue",
      "Indigo",
      "#bd0bbd", // "Purple",
      "DarkMagenta",
      "DarkOrchid",
      "DarkViolet"
    ];
    //colors = [ 'var(--yellow)', 'var(--orange)', 'var(--red)', 'var(--magenta)', 'var(--violet)', 'var(--blue)', 'var(--cyan)', 'var(--green)' ];

    let c = 0;
    const m = colors.length;

    for (let i = 0; i < str.length; i++) {
      c = ((c << 5) + str.charCodeAt(i)) % m
    }

    return colors[c];
  }
};
