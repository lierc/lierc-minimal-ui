import { API } from "./api.js";
import { Commands } from "./commands.js";
import { Connection } from "./connection.js";
import { Dialog } from "./dialog.js";
import { Emoji } from "./emoji.js";
import { Notifier } from "./notifier.js";
import { Panel } from "./panel.js";
import { Render } from "./render.js";
import { UIEvents } from "./uievents.js";

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

const themes = ["solarized-dark", "solarized"];

export class App {
  constructor(url, user) {
    this.user = user;
    this.api = new API(url);
    this.commands = new Commands(this);
    this.stream;
    this.connections = {};
    this.filling_backlog = false;
    this.dialog = null;
    this.sorting = [];
    this.last_seen = {};
    this.missed = {};
    this.panels = {};
    this.focused = null;
    this.last_panel_id = null;
    this.window_focused = true;
    this.default_panel = null;
    this.default_focused = false;
    this.prefs = {};
    this.touchstart = "ontouchstart" in document.documentElement;
    this.mobile = App.detect_mobile();
    this.sortable = !this.mobile && !this.touchstart;
    this.post_tokens = [];
    this.theme = 'default';
    this.typing = [];

    this.elem = {
      panel: document.getElementById('panel'),
      nav: document.getElementById('nav'),
      'status': document.getElementById('status'),
      privates: document.getElementById('privates'),
      channels: document.getElementById('channels'),
      input: document.getElementById('input'),
      topic: document.getElementById('topic'),
      filler: document.getElementById('filler'),
      scroll: document.getElementById('panel-scroll'),
      title: document.getElementsByTagName('title')[0],
      nicks: document.getElementById('nicks'),
      body: document.body,
      audio: Audio ? new Audio("/static/ent_communicator1.mp3") : undefined,
      emoji: document.getElementById('emoji'),
      switcher: document.getElementById('switcher-wrap'),
      panel_name: document.getElementById('panel-name'),
      flex_wrap: document.querySelector('.flex-wrap'),
      reconnect: document.getElementById('reconnect-status'),
      meta: document.getElementById('meta-channels'),
      themes: document.getElementById('themes'),
      title_top: document.getElementById('title-top'),
      typing: document.getElementById('typing-indicator')
    };

    // setup

    if (this.sortable)
      this.make_sortable(this.elem.channels, () => this.save_channel_order());

    setInterval(() => this.check_scroll(), 250);
    setInterval(() => this.ping_server(), 1000 * 15);
    setInterval(() => this.render_typing(), 500);

    const wake_stream = () => this.stream?.wake();

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden)
        wake_stream();
    });
    window.addEventListener("pageshow", wake_stream);
    window.addEventListener("online", () => this.stream?.reconnect());
    window.addEventListener("offline", () => this.stream?.close());
    this.setup_highlights();

    this.#start();

    this.events = new UIEvents(this);
  }

  async #start() {
    try {
      this.prefs = await this.get_prefs();
    }
    catch (e) {
      alert(e);
      return;
    }

    this.sorting = this.prefs['sorting'] || [];
    delete this.prefs['sorting'];

    if (this.prefs['email'] === true) {
      document.getElementById('email-notify')
        .classList.add('enabled');
    }
    if (this.prefs['theme']) {
      this.set_theme(this.prefs['theme'], true);
    }

    await this.load_seen();
    await this.load_token();
    this.init();

    Emoji.recent = this.prefs['emoji-recent'] || [];
    Emoji.tone = this.prefs['emoji-tone'] || 0;
    Emoji.save = (name, value) => this.update_pref(name, value);
    Emoji.load();
    this.notify = new Notifier(this);
  }

  set_connected(conn_id, status, message) {
    const connection = this.connections[conn_id];
    connection.connected = status;

    for (const id in this.panels) {
      const panel = this.panels[id];
      if (panel.connection == conn_id) {
        panel.set_connected(status, message);
      }
    }
  }

  set_typing(nick, msg) {
    const tag = msg.Tags["+draft/typing"] || msg.Tags["+typing"];

    if (tag == "paused" || tag == "done") {
      this.stop_typing(nick);
      return;
    }

    // unknown typing state
    if (tag != "active") {
      return;
    }

    this.typing.push(nick);

    // remove nick from list after 4 seconds
    setTimeout(() => { this.stop_typing(nick); }, 6000);
  }

  stop_typing(nick) {
    for (let i=0; i < this.typing.length; i++) {
      if (this.typing[i] == nick) {
        this.typing.splice(i, 1);
        return;
      }
    }
  }

  render_typing() {
    const nicks = this.typing.filter(onlyUnique);
    const len = nicks.length;

    if ( len > 2) {
      this.elem.typing.innerText = `${len} people are typing…`;
    } else if ( len > 0 ) {
      this.elem.typing.innerText = "";
      const els = [];
      for (let i=0; i < len; i++) {
        const nick = document.createElement("STRONG")
        nick.innerText = nicks[i];
        els.push(nick);
        if (i + 1 < len) {
          els.push(document.createTextNode(" and "));
        }
      }
      const verb = len > 1 ? 'are' : 'is';
      els.push(document.createTextNode(` ${verb} typing…`));
      for (let i=0; i < els.length; i++) {
        this.elem.typing.appendChild(els[i]);
      }
    } else {
      this.elem.typing.innerText = "";
    }
  }

  clear_typing() {
    this.typing = [];
    this.elem.typing.innerText = "";
  }

  setup_connection(id, host, nick) {
    if (this.connections[id])
      return;

    const connection = new Connection(id, host);
    this.connections[id] = connection;

    const panel = this.add_panel("status", connection.id, {status: true});
    panel.change_name(host);
    panel.update_topic({value: "status."});

    connection.on("channel:new", (conn, channel, message) => {
      this.add_panel(channel, conn, {focus: ("Id" in message)});
    });

    connection.on("private:msg", (conn, nick, message) => {
      const panel = this.add_panel(nick, conn, {focus: false});
      const connection = this.connections[conn];
      const from = message.Prefix.Name != connection.nick;

      panel.update_oldest_message_id(message.Id)

      if (this.is_ignore(panel, message))
        return;

      panel.append(Render(message));
      this.update_title(true);

      const unfocused = !this.is_focused(panel);
      if (from && (unfocused || !panel.is_scrolled())) {
        this.play_alert()
      }
      if (message.Highlight && unfocused) {
        this.update_highlights(true);
      }
      else if (unfocused) {
        this.elem.title_top.classList.add('unread');
      }
    });

    connection.on("channel:error", (conn, channel, message) => {
      const panel = this.get_panel(channel, conn);
      const html = Render(message);
      panel.append(html);
    });

    connection.on("channel:msg", (conn, channel, message) => {
      const panel = this.get_panel(channel, conn);
      const html = Render(message);

      panel.update_oldest_message_id(message.Id)

      if (this.is_ignore(panel, message))
        return;

      if (html) {
        panel.append(html);
        this.update_title(true);

        if (message.Highlight) {
          if (!this.is_focused(panel) || !panel.is_scrolled()) {
            this.play_alert();
          }
          if (this.focused && this.focused.id != panel.id) {
            this.update_highlights(true);
          }
        }
      }
    });

    connection.on("channel:react", (conn, channel, message) => {
      const panel = this.get_panel(channel, conn);
      panel.handle_reaction(message);
    });

    connection.on("channel:typing", (conn, channel, message) => {
      const panel = this.get_panel(channel, conn);
      if (this.is_focused(panel)) {
        this.set_typing(message.Prefix.Name, message);
      }
    });

    connection.on("private:react", (conn, nick, message) => {
      const panel = this.get_panel(nick, conn);
      panel.handle_reaction(message);
    });

    connection.on("privmsg:typing", (conn, nick, message) => {
      const panel = this.get_panel(nick, conn);
      if (this.is_focused(panel)) {
        this.set_typing(message.Prefix.Name, message);
      }
    });

    connection.on("channel:nicks", (conn, channel, nicks) => {
      const panel = this.get_panel(channel, conn);
      if (panel.focused)
        panel.update_nicks(nicks);
    });

    connection.on("channel:mode", (conn, channel, mode) => {
      const panel = this.get_panel(channel, conn);
      panel.update_mode(mode);
    });

    connection.on("channel:close", (conn, channel) => {
      this.remove_panel(App.panel_id(channel, conn));
    });

    connection.on("status:raw", (conn, message) => {
      const panel = this.get_panel("status", conn);
      panel.append(Render(message, {raw: true}));
    });

    connection.on("status", (conn, message) => {
      const panel = this.get_panel("status", conn);
      panel.append(Render(message));
    });

    connection.on("connect", (conn, message) => {
      this.set_connected(conn, true, message.Params[0]);
    });

    connection.on("disconnect", (conn, message) => {
      this.set_connected(conn, false, message.Params[0]);
    });

    connection.on("channel:topic", (conn, channel, topic) => {
      const panel = this.get_panel(channel, conn);
      panel.update_topic(topic);
    });
  }

  is_focused(panel) {
    return this.window_focused && this.focused?.id == panel.id;
  }

  find_default_panel() {
    const parts = window.location.hash.split("/").slice(1);
    if (parts.length == 2) {
      return App.panel_id(decodeURIComponent(parts[1]), parts[0]);
    }
    else if (this.sorting.length) {
      return this.sorting[0];
    }
    return null;
  }

  async init() {
    this.default_panel = this.find_default_panel();
    const configs = await this.api.get('/connection');

    if (!configs.length)
      this.config_modal();

    configs.forEach((conn) => {
      const conn_id   = conn.Id;
      const host = conn.Config.Alias || conn.Config.Host;
      const nick = conn.Nick;
      this.setup_connection(conn_id, host, nick);
    });

    if (this.stream)
      this.stream.destroy();

    this.connect();
  }

  async add_recent_privates() {
    const privates = await this.api.get("/privates");
    privates.forEach((priv) => {
      this.add_panel(priv.nick, priv.connection, {
        focus: false,
        dont_save: true
      });
    });
  }

  async connect() {
    const stream = this.api.stream();

    stream.on('message', (e) => {
      const conn_id = e.ConnectionId;
      const message = e.Message;

      if (e.MessageId)
        message.Id =  e.MessageId;
      message.Highlight = e.Highlight;

      if (this.connections[conn_id]) {
        this.connections[conn_id].on_message(message);
      }
    });

    stream.on('create_connection', (e) => {
      const conn_id = e.ConnectionId;
      const message = e.Message;
      const nick    = message.Params[0];
      const host    = message.Params[1];
      this.setup_connection(conn_id, host, nick);
    });

    stream.on('delete_connection', (e) => {
      const conn_id = e.ConnectionId;

      for (const id in this.panels) {
        const panel = this.panels[id];
        if (panel.connection == conn_id) {
          this.remove_panel(id);
        }
      }

      delete this.connections[conn_id];
    });

    stream.on('close', (e) => {
      for (const id in this.panels) {
        this.panels[id].set_disabled(true);
      }
      if (this.focused) {
        this.focused.scroll(() => {
          this.elem.body.classList.add('disconnected');
        });
      }
      else {
        this.elem.body.classList.add('disconnected');
      }
    });

    stream.on('reconnect-status', (text) => {
      if (this.focused) {
        this.focused.scroll(() => {
          this.elem.reconnect.textContent = text;
        });
      }
      else {
        this.elem.reconnect.textContent = text;
      }
    });

    stream.on('open', (e) => {
      this.elem.body.classList.remove('disconnected');
      if (this.focused) {
        if (stream.last_id) {
          this.fill_missed(stream.last_id);
        }
      }

      for (const id in this.panels) {
        this.panels[id].set_disabled(false);
        if (!this.focused || id != this.focused.id) {
          this.panels[id].clear_lists();
        }
      }
    });

    await this.sync_missed();
    await this.add_recent_privates();
    this.stream = stream;
  }

  get_panel(name, connection) {
    const id = App.panel_id(name, connection);
    return this.panels[id];
  }

  add_private(conn_id, name) {
    const path = `/connection/${conn_id}/nick/${encodeURIComponent(name)}`;
    this.api.post(path);
  }

  close_panel(id) {
    const panel = this.panels[id];
    if (panel.type == "private") {
      const path = `/connection/${panel.connection}/nick/${encodeURIComponent(panel.name)}`;
      this.api.delete(path);
    }
    this.remove_panel(id);
  }

  remove_panel(id) {
    if (!this.panels[id])
      return;

    const focused = id == this.focused.id;
    this.panels[id].remove_elems();
    delete this.panels[id];

    if (focused) {
      if (this.last_panel_id && this.panels[this.last_panel_id])
        this.focus_panel(this.last_panel_id);
      else if (Object.keys(this.panels).length)
        this.focus_panel(Object.keys(this.panels)[0]);
      else
        this.focused = null;
    }

    this.update_nav_counts();
  }

  update_nav_counts() {
    this.elem.status
      .previousSibling.previousSibling
      .querySelector('.count')
      .textContent = this.elem.status.querySelectorAll("li").length

    this.elem.privates
      .previousSibling.previousSibling
      .querySelector(".count")
      .textContent = this.elem.privates.querySelectorAll("li").length;

    this.elem.channels
      .previousSibling.previousSibling
      .querySelector(".count")
      .textContent = this.elem.channels.querySelectorAll("li").length;
  }

  add_panel(name, connection, opts) {
    if (!opts) opts = {};
    const id = App.panel_id(name, connection);

    if (this.panels[id]) {
      if (opts['focus'] === true)
        this.focus_panel(id);
      return this.panels[id];
    }

    if (!this.connections[connection]) {
      console.log("Connection does not exist", connection);
      throw "Connection does not exist";
    }

    const conn = this.connections[connection];
    const type = opts['status'] ? 'status'
      : conn.is_channel(name)
        ? 'channel' : 'private';

    const panel = new Panel({
      name: name,
      id: id,
      log_url: opts['status'] ? null : `/search/#!/connection/${encodeURIComponent(conn.id)}/channel/${encodeURIComponent(name)}`,
      backlog_url: `/connection/${conn.id}/channel/${encodeURIComponent(name)}/events`,
      path: `${window.location.pathname}#/${conn.id}/${encodeURIComponent(name)}`,
      closable: opts['status'] ? false : true,
      editable: opts['status'] ? true : false,
      connection: conn.id,
      connected: conn.connected,
      mobile: this.mobile,
      type: type,
      network: conn.host,
      get_nick: () => conn.nick
    });

    if (this.last_seen[panel.id])
      panel.last_seen = this.last_seen[panel.id];
    panel.update_nav();

    if (panel.type == "channel") {
      const channel = conn.channel(panel.name);
      panel.editor.completion.nicks = channel.nicks;
      panel.update_topic({value: "No topic set"});
    }
    else {
      panel.update_topic({value: panel.name});
    }
    if (panel.type == "private" && !opts['dont_save']) {
      this.add_private(connection, panel.name);
    }
    panel.editor.completion.commands = this.commands.completions();

    this.panels[id] = panel;

    if (panel.type == "status")
      this.elem.status.appendChild(panel.elem.nav);
    else if (panel.type == "private")
      this.elem.privates.appendChild(panel.elem.nav);
    else
      this.insert_sorted_nav(panel);

    this.update_nav_counts();

    if (panel.type == "channel")
      this.ignore_events_pref(panel);

    this.collapse_embeds_pref(panel);
    this.monospace_nicks_pref(panel);
    this.ignore_nicks_pref(panel);
    this.send_typing_pref(panel);

    panel.elem.nav.addEventListener('click', async (e) => {
      if (e.target.classList.contains("panel-log"))
        return;

      e.preventDefault();

      this.elem.flex_wrap.classList.remove("open");

      const id = e.currentTarget.getAttribute('data-panel-id');
      const panel = this.panels[id];

      if (e.target.classList.contains('close-panel')) {
        if (panel.type == "channel")
          this.part_channel(panel.name, panel.connection);
        else if (panel.type == "status")
          this.delete_connection(panel.connection);
        else
          this.close_panel(id);
      }
      else if (e.target.classList.contains('edit-panel')) {
        try {
          const res = await this.api.get(`/connection/${panel.connection}`);
          this.config_modal(null, res);
        }
        catch (e) {
          alert(e);
        }
      }
      else {
        this.focus_panel(id);
      }
    });

    // force focusing or no focused panel
    if (opts['focus'] === true || !this.focused) {
      this.focus_panel(id);
    }
    // this channel was in the URL on load
    else if (this.default_panel && id == this.default_panel) {
      this.default_panel = null;
      this.default_focused = true;
      this.focus_panel(id);
    }
    // focus the first channel added
    else if (!this.default_focused && panel.type == "channel" && this.channel_panels() == 1) {
      this.focus_panel(id);
    }

    if (!panel.focused && this.missed[panel.id])
      this.apply_missed(panel, this.missed[panel.id]);

    delete this.missed[panel.id];

    return this.panels[id];
  }

  update_highlights(bool) {
    this.highlights.unread = bool;
    this.highlights.update_nav();
    if (bool) {
      this.elem.title_top.classList.add('unread');
    }
    else {
      this.elem.title_top.classList.remove('unread');
    }
  }

  apply_missed(panel, missed) {
    if (this.focused?.id == panel.id) {
      return;
    }

    if (missed.messages) {
      panel.unread = true;
      panel.update_nav();
      if (panel.type == 'private') {
        this.elem.title_top.classList.add('unread');
      }
    }
    else if (missed.events) {
      panel.missed = true;
      panel.update_nav();
    }
    if (missed.highlights > 0) {
      panel.highlighted = true;
      this.update_highlights(true);
      panel.update_nav();
    }
    this.update_title();
  }

  update_title(highlight) {
    if (!this.focused) return;
    let name = this.focused.name;

    if (!this.window_focused && highlight) {
      name = `*${name}`;
    }

    this.elem.title.textContent = name;
  }

  post_token() {
    const token = this.post_tokens.pop();
    if (!token) {
      alert("No post tokens, tell Lee!");
      throw Error("No tokens");
    }
    return token;
  }

  async part_channel(name, connection) {
    if (!confirm(`Are you sure you want to leave ${name}?`))
      return;

    const headers = new Headers();
    headers.append('lierc-token', this.post_token());
    headers.append('content-type', 'application/irc');

    try {
      const res = await this.api.post(`/connection/${connection}`, {
        body: `PART ${name}`,
        headers: headers
      });
      this.remove_panel(App.panel_id(name, connection));
      this.post_tokens.push(res.token);
    }
    catch (e) {
      alert(`Error: ${e}`);
      this.load_token();
    }
  }

  async delete_connection(connection) {
    if (!confirm("Are you sure you want to remove this connection?"))
      return;
    try {
      await this.api.delete(`/connection/${connection}`);
    }
    catch (e) {
      alert(e);
    }
  }

  channel_panels() {
    let panels = 0
    for (const id in this.panels) {
      if (this.panels[id].type == "channel")
        panels++;
    }
    return panels;
  }

  insert_sorted_nav(panel) {
    if (this.sortable)
      panel.elem.nav.draggable = true;

    const index = this.sorting.indexOf(panel.id);
    if (index == -1) {
      this.elem.channels.appendChild(panel.elem.nav);
      this.save_channel_order();
      return;
    }
    const items = this.elem.channels.childNodes;
    for (let i=0; i < items.length; i++) {
      const id = items[i].getAttribute('data-panel-id');
      if (index < this.sorting.indexOf(id)) {
        this.elem.channels.insertBefore(panel.elem.nav, items[i]);
        return;
      }
    }

    this.elem.channels.appendChild(panel.elem.nav);
  }

  async fill_missed(start) {
    try {
      const events = await this.api.get(`/log/${start}`);
      for (let i=0; i < events.length; i++) {
        this.stream.fire('message', events[i]);
      }
    }
    catch (e) {
      this.reset();
    }
  }

  async maybe_send_typing(panel, c) {
    const conn = this.connections[panel.connection];
    if (!conn.caps_enabled["message-tags"])
      return;

    if (!panel.should_send_typing(c))
      return;

    const tag = "@+typing=active"

    try {
      const res = await this.api.post(`/connection/${panel.connection}`, {
        body:  `${tag} TAGMSG ${panel.name}`,
        headers: {
          'lierc-token' : this.post_token(),
          'content-type': "application/irc",
        }
      });
      this.post_tokens.push(res.token);
    }
    catch (e) {
      alert(`Error: ${e}`);
      this.load_token();
    }
  }

  async send_stop_typing(panel) {
    const conn = this.connections[panel.connection];
    if (!conn.caps_enabled["message-tags"])
      return;

    const tag = "@+typing=done"

    try {
      const res = await this.api.post(`/connection/${panel.connection}`, {
        body:  `${tag} TAGMSG ${panel.name}`,
        headers: {
          'lierc-token' : this.post_token(),
          'content-type': "application/irc",
        }
      });
      this.post_tokens.push(res.token);
    }
    catch (e) {
      alert(`Error: ${e}`);
      this.load_token();
    }
  }

  async fill_backlog(panel, msgid, focus) {
    if (panel.backlog_empty) return;

    if (panel.connection) {
      const connection = this.connections[panel.connection];
      if (!connection) return;
    }

    // set only once a request is made, and always cleared below,
    // so an early return can't leave check_scroll waiting forever
    this.filling_backlog = true;
    panel.set_loading(true);

    const highlight = panel.id == 'highlights';
    const limit = panel.ignore_events ? 150 : 50;
    const name = panel.type == "status" ? "status" : panel.name;
    let url = panel.backlog_url;

    if (msgid)
      url += `/${msgid}`;

    try {
      const events = await this.api.get(url, { data: { limit: limit } });
      if (events.length < limit)
        panel.backlog_empty = true;

      const list = [];
      const reactions = [];
      const is_search = panel.type == "search";

      events.forEach( (e) => {
        const message = e.Message;
        message.Id = e.MessageId;
        message.Highlight = e.Highlight && panel.id != 'highlights';

        panel.update_oldest_message_id(message.Id);

        if (this.is_ignore(panel, message))
          return;

        if (this.is_reaction(message))
          reactions.push(message);
        else {
          const el = Render(message, {
            show_channel: is_search,
            controls: !is_search
          });
          if (el)
            list.push(el);
          if (highlight) {
            const panel_id = App.panel_id(message.Params[0], e.ConnectionId);
            el.setAttribute('data-panel-id', panel_id);
          }
        }
      });

      panel.prepend(list);

      reactions.forEach((reaction) => {
        panel.handle_reaction(reaction);
      });

      panel.react_backlog_check();
      panel.set_loading(false);
      if (focus) {
        panel.update_seen();
        this.save_seen(panel);
      }
    }
    catch (e) {
      panel.set_loading(false);
      console.log(e);
    }
    finally {
      this.filling_backlog = false;
    }
  }

  is_reaction(message) {
    return message.Command == "TAGMSG"
      && (message.Tags?.["+draft/react"] || message.Tags?.["+draft/unreact"]);
  }

  async send_reaction(panel, id, emoji, remove) {
    if (!panel || !panel.connection || !id || !emoji)
      return;

    const tag = `@+draft/reply=${id};${remove ? "+draft/unreact=" : "+draft/react="}${emoji}`;

    try {
      const res = await this.api.post(`/connection/${panel.connection}`, {
        body:  `${tag} TAGMSG ${panel.name}`,
        headers: {
          'lierc-token' : this.post_token(),
          'content-type': "application/irc",
        }
      });
      this.post_tokens.push(res.token);
    }
    catch (e) {
      alert(`Error: ${e}`);
      this.load_token();
    }
  }

  prev_panel() {
    const items = this.elem.nav.querySelectorAll("li");
    for (let i=items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.classList.contains("active") && items[i - 1]) {
        const id = items[i - 1].getAttribute('data-panel-id');
        this.focus_panel(id);
        return;
      }
    }
  }

  prev_unread_panel() {
    const items = this.elem.nav.querySelectorAll("li");
    for (let i=items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.classList.contains("active")) {
        for (let j=i; j > 0; j--) {
          const item = items[j - 1];
          if (item.classList.contains("unread")) {
            const id = item.getAttribute('data-panel-id');
            this.focus_panel(id);
            return;
          }
        }
        return;
      }
    }
  }

  next_panel() {
    const items = this.elem.nav.querySelectorAll("li");
    for (let i=0; i < items.length; i++) {
      const item = items[i];
      if (item.classList.contains("active") && items[i + 1]) {
        const id = items[i + 1].getAttribute('data-panel-id');
        this.focus_panel(id);
        return;
      }
    }
  }

  next_unread_panel() {
    const items = this.elem.nav.querySelectorAll("li");
    for (let i=0; i < items.length; i++) {
      const item = items[i];
      if (item.classList.contains("active")) {
        for (let j=i; j < items.length; j++) {
          const item = items[j + 1];
          if (item.classList.contains("unread")) {
            const id = item.getAttribute('data-panel-id');
            this.focus_panel(id);
            return;
          }
        }
        return;
      }
    }
  }

  focus_panel(id) {
    if (this.focused) {
      if (this.focused.id == id)
        return;
      this.last_panel_id = this.focused.id;
    }

    if (this.elem.switcher.classList.contains('open')) {
      this.hide_switcher();
    }

    const panel = this.panels[id];

    if (! panel)
      return;

    this.clear_typing();
    this.elem.panel_name.textContent = panel.name;
    this.replace_child("panel", panel.elem.list);
    this.replace_child("input", panel.elem.input);
    this.replace_child("topic", panel.elem.topic);
    this.replace_child("filler", panel.elem.filler);

    this.elem.body.setAttribute("data-panel-type", panel.type);
    this.replace_child("nicks", panel.elem.nicks);

    if (this.focused) {
      this.focused.unfocus();
      this.save_seen(this.focused);
    }

    //app.scroll_to_nav(panel.elem.nav);

    if (panel.first_focus && panel.type == "channel")
      this.show_nicklist_pref(panel);

    panel.focus();
    this.focused = panel;
    window.history.replaceState({}, "", panel.path);
    this.check_scroll(true);
    this.update_title();

    if (panel.type == "channel") {
      const conn = this.connections[panel.connection];
      panel.update_nicks(
        conn.nicks(conn.channel(panel.name))
      );
    }

    let highlight = false;
    for (id in this.panels) {
      if (this.panels[id].highlighted && id != 'highlights') {
        highlight = true;
        break;
      }
    }
    if (!highlight) {
      this.update_highlights(false);
    }
  }

  replace_child(p, c) {
    p = this.elem[p];
    while (p.firstChild) {
      p.removeChild(p.firstChild);
    }
    p.appendChild(c);
  }

  config_modal(e, connection) {
    if (e) e.preventDefault();

    const vars = {};

    if (connection) {
      const config = connection.Config;
      vars.Host = config.Host;
      vars.Port = config.Port;
      vars.Ssl = config.Ssl;
      vars.Nick = config.Nick;
      vars.User = config.User;
      vars.Pass = config.Pass;
      vars.Alias = config.Alias;
      vars.SASL = config.SASL;
      vars.Channels = config.Channels.join(", ");
      vars.Highlight = config.Highlight.join(", ");

      vars.action = `/connection/${connection.Id}`;
      vars.method = "PUT";
      vars.edit = true;
    }
    else {
      vars.Nick = this.user.user;
      vars.User = this.user.user;
      vars.Highlight = this.user.user;

      if (Object.keys(this.connections).length == 0) {
        vars.Host = "irc.freenode.com";
        vars.Port = "6697";
        vars.Ssl = true;
        vars.Channels = "#lierc";
        vars.Alias = "freenode";
      }

      vars.action = "/connection";
      vars.method = "POST";
      vars.edit = false;
    }

    this.elem.flex_wrap.classList.remove('open');

    const dialog = this.new_dialog("connection", vars);

    const del = dialog.el.querySelector('.delete-connection');
    if (del && connection) {
      del.addEventListener('click', (e) => {
        e.preventDefault();
        this.delete_connection(connection.Id);
        this.close_dialog();
      });
    }

    dialog.el.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const method = form.getAttribute('method');
      const action = form.getAttribute('action');

      const data = {
        Host: form.querySelector('input[name="Host"]').value,
        Port: parseInt(form.querySelector('input[name="Port"]').value),
        Ssl:  form.querySelector('input[name="Ssl"]').checked,
        SASL:  form.querySelector('input[name="SASL"]').checked,
        Nick: form.querySelector('input[name="Nick"]').value,
        User: form.querySelector('input[name="User"]').value,
        Pass: form.querySelector('input[name="Pass"]').value,
        Alias: form.querySelector('input[name="Alias"]').value,
        Channels: form.querySelector('input[name="Channels"]').value.split(/\s*,\s*/),
        Highlight: form.querySelector('input[name="Highlight"]').value.split(/\s*,\s*/),
      };

      try {
        await this.api.request(method, action, {
          body: JSON.stringify(data)
        });
        this.close_dialog();
      }
      catch (e) {
        alert("i'm sorry");
      }
    });
  }

  check_scroll(focus) {
    if (this.filling_backlog
      || !this.focused
      || this.focused.backlog_empty
      || this.overlayed()
      || this.elem.flex_wrap.classList.contains('open')
      || getComputedStyle(this.elem.scroll).display == "none")
    {
      return;
    }

    if (this.elem.scroll.scrollTop <= 1) {
      this.fill_backlog(
        this.focused, this.focused.oldest_message_id, focus
      );
    }
  }

  async ping_server() {
    const res = await this.api.auth();

    if (res.status == 200)
      return;

    if (res.status == 401) {
      //window.location.reload();
      return;
    }

    console.log(res.status);

    // ping failed, force a reconnect of stream...
    if (res.status == 0) {
      if (this.stream)
        this.stream.close();
      return;
    }

    // The API's error bodies are JSON; nginx's (a 502 while the API is
    // down or restarting) are HTML.
    const type = res.headers.get('Content-Type');
    if (!type?.match(/^application\/javascript/)) {
      console.log(await res.text());
      return;
    }

    const data = await res.json();
    if (data["error"]) {
      console.log(data["error"]);
    }
  }

  async get_prefs() {
    const data = await this.api.get("/preference");
    const prefs = {};
    for (let i=0; i < data.length; i++) {
      try {
        prefs[data[i].name] = JSON.parse(data[i].value);
      }
      catch(e) {
        console.log("Unable to parse JSON: ", data[i].value);
      }
    }
    return prefs;
  }

  get_pref(name) {
    return this.prefs[name];
  }

  show_nicklist_pref(panel) {
    const value = this.get_pref(`${panel.id}-show-nicklist`);
    if (value != undefined)
      panel.set_show_nicklist(value);
  }

  send_typing_pref(panel) {
    const value = this.get_pref(`${panel.id}-send-typing`);
    if (value !== undefined)
      panel.set_send_typing(value);
  }

  ignore_events_pref(panel) {
    const value = this.get_pref(`${panel.id}-ignore-events`);
    if (value !== undefined)
      panel.set_ignore_events(value);
  }

  collapse_embeds_pref(panel) {
    const value = this.get_pref(`${panel.id}-collapse-embeds`);
    if (value !== undefined)
      panel.set_collapse_embeds(value);
  }

  monospace_nicks_pref(panel) {
    const value = this.get_pref(`${panel.id}-monospace-nicks`);
    if (value !== undefined)
      panel.monospace_nicks = value;
  }

  add_monospace_nick(panel, nick) {
    panel.add_monospace_nick(nick);
    this.update_pref(`${panel.id}-monospace-nicks`, panel.monospace_nicks);
  }

  remove_monospace_nick(panel, nick) {
    panel.remove_monospace_nick(nick);
    this.update_pref(`${panel.id}-monospace-nicks`, panel.monospace_nicks);
  }

  ignore_nicks_pref(panel) {
    const value = this.get_pref(`${panel.id}-ignore-nicks`);
    if (value !== undefined)
      panel.ignore_nicks = value;
  }

  ignores(panel) {
    return panel.ignore_nicks;
  }

  is_ignore(panel, message) {
    if (message.Command != "PRIVMSG")
      return false;

    const nick = message.Prefix.Name;
    if (panel.ignore_nicks.indexOf(nick) != -1) {
      return true;
    }

    return false;
  }

  add_ignore(panel, nick) {
    panel.add_ignore(nick);
    this.update_pref(`${panel.id}-ignore-nicks`, panel.ignore_nicks);
  }

  remove_ignore(panel, nick) {
    panel.remove_ignore(nick);
    this.update_pref(`${panel.id}-ignore-nicks`, panel.ignore_nicks);
  }

  update_pref(name, value) {
    this.prefs[name] = value;
    this.api.post(`/preference/${encodeURIComponent(name)}`, {
      body: JSON.stringify(value),
    });
  }

  // never rejects: startup carries on without tokens if this fails
  async load_token() {
    try {
      const data = await this.api.get("/token");
      this.post_tokens.push(data.token);
      if (data.extra) {
        this.post_tokens = this.post_tokens.concat(data.extra);
      }
    }
    catch (e) {
    }
  }

  // never rejects: startup carries on without seen state if this fails
  async load_seen() {
    try {
      const res = await this.api.get("/seen");
      for (const i in res) {
        const id = App.panel_id(res[i]["channel"], res[i]["connection"]);
        this.last_seen[id] = res[i]["message_id"];
      }
    }
    catch (e) {
    }
  }

  save_seen(panel, force) {
    if (panel.type == "search")
      return;

    const diffs = 0;
    const id = panel.id;
    const last_seen = panel.last_seen;
    const send = last_seen && last_seen != this.last_seen[id];

    if (send || force) {
      const parts = [
        "connection", panel.connection,
        "channel", encodeURIComponent(panel.name), "seen"
      ];

      this.api.post(`/${parts.join("/")}`, {
        body: `${last_seen}`
      });

      this.last_seen[id] = last_seen;
    }
  }

  async sync_missed() {
    if (this.focused) {
      this.focused.update_seen();
      if (this.focused.last_seen)
        this.last_seen[this.focused.id] = this.focused.last_seen;
    }

    const res = await this.api.get("/missed", { data: this.last_seen });
    this.missed = {};
    for (const connection in res) {
      for (const channel in res[connection]) {
        const id = App.panel_id(channel, connection);
        if (this.panels[id]) {
          this.apply_missed(this.panels[id], res[connection][channel]);
        }
        else {
          this.missed[id] = res[connection][channel];
        }
      }
    }
  }

  async search_panel(panel, text) {
    const parts = [ "connection", panel.connection
      , "channel", encodeURIComponent(panel.name), "last" ];

    const messages = await this.api.get(`/${parts.join("/")}`, {
      data: { query: text, limit: 10 }
    });

    if (messages.length > 0) {
      panel.scroll(() => {
        const line = document.createElement('DIV');
        line.classList.add('search-start');
        panel.elem.list.appendChild(line);
      });
    }

    for (let i=messages.length - 1; i >= 0; i--) {
      const msg = messages[i].Message;
      msg.Search = true;
      panel.append(Render(msg), {skip_date: true});
    }
  }

  focus_input(force) {
    if (force) {
      this.focused.elem.input.focus();
      return;
    }

    if (this.mobile)
      return;
    if (!this.focused)
      return;
    if (this.overlayed())
      return;
    this.focused.elem.input.focus();
  }

  hide_switcher() {
    this.elem.switcher.classList.remove('open');
    this.elem.nav.classList.remove('filtering');
    this.elem.nav.querySelectorAll('li').forEach((li) => {
      li.classList.remove('match', 'selected', 'candidate');
    });
  }

  toggle_switcher() {
    this.elem.switcher.querySelector('input').value = '';
    if (this.elem.switcher.classList.contains('open')) {
      this.hide_switcher();
    }
    else {
      this.elem.switcher.classList.add('open');
      this.elem.nav.classList.add('filtering');
      this.elem.nav.querySelectorAll('#meta-channels li[data-name], #channels li[data-name], #privates li[data-name]').forEach((li) => {
        li.classList.add('candidate');
        if (li.classList.contains("unread"))
          li.classList.add("match");
      });
      let matches = this.elem.nav.querySelectorAll('li[data-name].candidate.match');
      if (!matches.length)
        matches = this.elem.nav.querySelectorAll('li[data-name].candidate');
      if (matches.length) {
        matches[0].classList.add('selected');
      }
      this.elem.switcher.querySelector('input').focus();
    }
  }

  make_sortable(list, on_sort) {
    let dragging = null;
    let orig_next = null;

    list.addEventListener("dragstart", (e) => {
      const li = e.target.closest("li");
      if (!li || !li.draggable || li.parentNode != list)
        return;
      dragging = li;
      orig_next = li.nextSibling;
      e.dataTransfer.effectAllowed = "move";
      // firefox won't start a drag without data
      e.dataTransfer.setData("text/plain", li.getAttribute("data-panel-id"));
      li.classList.add("dragging");
    });

    list.addEventListener("dragover", (e) => {
      if (!dragging)
        return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const over = e.target.closest("li");
      if (!over || over == dragging || over.parentNode != list)
        return;

      const rect = over.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      list.insertBefore(dragging, after ? over.nextSibling : over);
    });

    list.addEventListener("drop", (e) => {
      if (dragging)
        e.preventDefault();
    });

    list.addEventListener("dragend", (e) => {
      if (!dragging)
        return;
      const li = dragging;
      dragging = null;
      li.classList.remove("dragging");

      // drag was cancelled, put it back
      if (e.dataTransfer.dropEffect == "none") {
        list.insertBefore(li, orig_next);
        return;
      }

      if (li.nextSibling != orig_next)
        on_sort();
    });
  }

  save_channel_order() {
    const order = Array.from(
      this.elem.channels.querySelectorAll('li'),
      (li) => li.getAttribute('data-panel-id')
    );

    this.sorting = order;
    this.update_pref("sorting", order);
  }

  overlayed() {
    return this.dialog?.open;
  }

  close_dialog() {
    if (this.dialog)
      this.dialog.close();
    this.dialog = null;
  }

  open_log(panel) {
    const url = `/search/#!/`
      + `/connection/${encodeURIComponent(panel.connection)}/channel/${encodeURIComponent(panel.name)}`;
    window.open(url);
  }

  new_dialog(name, vars) {
    if (this.dialog)
      this.dialog.close();

    const dialog = new Dialog(name, vars);
    this.elem.flex_wrap.classList.remove('open');
    dialog.append(this.elem.body);
    const input = dialog.el.querySelector('input[type=text]')
    if (!this.mobile && input) {
      input.focus();
      input.select();
    }
    this.dialog = dialog;
    return dialog;
  }

  setup_highlights() {
    if (this.panels['highlights']) {
      this.remove_panel('highlights');
    }

    this.highlights = new Panel({
      name: "All Highlights",
      id: "highlights",
      closable: false,
      editable: false,
      backlog_url: "/highlight",
      path: `${window.location.pathname}#/highlights`,
      mobile: this.mobile,
      connected: true,
      type: "search"
    });
    this.highlights.update_nav();
    this.highlights.elem.nav.addEventListener('click', () => {
      this.elem.flex_wrap.classList.remove("open");
      this.focus_panel('highlights');
    });
    this.elem.meta.appendChild(this.highlights.elem.nav);
    this.panels[this.highlights.id] = this.highlights;
  }

  async reset() {
    const path = this.focused?.path ?? "";

    for (const id in this.panels) {
      this.remove_panel(id);
    }

    window.history.replaceState({}, "", path);
    this.default_focused = false;
    this.connections = [];
    this.last_seen = {};
    this.missed = {};
    this.focused = null;
    this.setup_highlights();

    await this.load_seen();
    await this.load_token();
    this.init();
  }

  set_theme(theme, skip_save) {
    themes.forEach((t) => {
      document.body.classList.remove(t);
    });
    if (themes.indexOf(theme) != -1) {
      document.body.classList.add(theme);
    }
    if (this.theme != theme) {
      this.theme = theme;
      this.elem.themes.value = theme;
      if (!skip_save) {
        this.update_pref("theme", theme);
      }
    }
  }

  play_alert() {
    if (this.elem.audio) {
      this.elem.audio.play();
    }
  }

  static detect_mobile() {
    return (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) return true; return false;})(navigator.userAgent||navigator.vendor||window.opera);
  }

  static panel_id(name, connection) {
    return [connection, name.toLowerCase()].join("-");
  }
}
