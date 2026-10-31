import { Emoji } from "./emoji.js";
import { Unformat } from "./format.js";

export const UIEvents = function(app) {
  const max_userhost_len = 63 + 10 + 1;
  const mac = /^Mac/.test(window.navigator.platform);
  const narrow = window.matchMedia('(max-width: 800px)'); // lierc.css's mobile layout

  function clickTouchEvent(el, f) {
    ['click', 'touch'].forEach((type) => {
      el.addEventListener(type, f);
    });
  }

  document.addEventListener("keydown", (e) => {
    const mods = {
      meta: e.altKey,
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      cmd: e.metaKey
    };

    if (e.which == 27 && app.overlayed()) {
      app.close_dialog();
      return;
    }
    else if (app.overlayed()) {
      return;
    }
    else if (e.which == 27) {
      document.querySelectorAll('.popup-toggle.open,.flex-wrap.open')
        .forEach((el) => {
          el.classList.remove('open');
        });
    }

    /* the :name emoji list takes its keys first, before enter sends */
    if (app.focused?.editor.emoji.keydown(e))
      return;

    /* task switcher is open, special keys */
    if (app.elem.switcher.classList.contains('open')) {
      //escape
      if (e.which == 27) {
        app.hide_switcher();
        app.focus_input();
        return;
      }
      // down or tab
      else if (e.which == 40 || e.which == 9) {
        e.preventDefault();
        const items = app.elem.nav.querySelectorAll('li[data-name].candidate.match');

        for (let i=1; i < items.length; i++) {
          if (items[i - 1].classList.contains("selected")) {
            items[i - 1].classList.remove('selected');
            items[i].classList.add('selected');
            return;
          }
        }
      }
      // up
      else if (e.which == 38) {
        e.preventDefault();
        const items = app.elem.nav.querySelectorAll('li[data-name].candidate.match');

        for (let i=0; i < items.length - 1; i++) {
          if (items[i + 1].classList.contains("selected")) {
            items[i + 1].classList.remove('selected');
            items[i].classList.add('selected');
            return;
          }
        }
      }
      // enter
      else if (e.which == 13) {
        const selected = app.elem.nav.querySelector('li.selected');
        if (selected) {
          e.preventDefault();
          const id = selected.getAttribute('data-panel-id');
          app.focus_panel(id);
          app.hide_switcher();
          return;
        }
      }
    }

    /* enter, send input */
    if (e.which == 13 && !mods['shift']) {
      e.preventDefault();
      send_submit();
      return;
    }
    /* panel up */
    else if (e.which == 38 && mods['meta']) {
      e.preventDefault();
      mods['shift'] ? app.prev_unread_panel() : app.prev_panel();
      return;
    }
    /* panel down */
    else if (e.which == 40 && mods['meta']) {
      e.preventDefault();
      mods['shift'] ? app.next_unread_panel() : app.next_panel();
      return;
    }
    /* toggle task switcher */
    else if ((e.which == 75 || e.which == 84) && mods['meta']) {
      e.preventDefault();
      app.toggle_switcher();
      return;
    }
    /* toggle nick list */
    else if (!mac && e.which == 186 && mods['meta']) {
      document.querySelector('#toggle-nicks').click();
      return;
    }

    const c = String.fromCharCode(e.which);

    /* jump to panel by number */
    if (!mac && (mods['cmd'] || (!mods['ctrl'] && mods['meta'])) && c.match(/^[1-9]$/)) {
      const panels = app.elem.nav.querySelectorAll('#channels li,#privates li');
      if (panels[c - 1]) {
        app.focus_panel(panels[c - 1].getAttribute("data-panel-id"));
        return;
      }
    }

    if (!mac && (mods['cmd'] || (!mods['ctrl'] && mods['meta'])) && c == '0') {
      app.focus_panel('highlights');
    }

    if (app.focused) {
      /* send to editor (bold, italic, tab complete) */
      if (app.focused.editor.focused) {
        if (e.which == 33 || e.which == 34) {
          app.focused.scroller.focus();
          requestAnimationFrame(() => {
            app.focus_input();
          });
        }
        app.focused.editor.keydown(e, mods);

        if (!mods['meta'] && !mods['ctrl'] && !mods['cmd']) {
          app.maybe_send_typing(app.focused, c);
        }
      }
      /* focus input area on a-z 0-9 keys */
      else if (
        e.target.nodeName != "INPUT"
        && e.target.nodeName != "TEXTAREA"
        && ! mods['meta'] && ! mods['ctrl'] && ! mods['cmd']
        && ( c.match(/[a-zA-Z0-9\/]/) || e.which == 191 )
      ) {
        app.focus_input();
      }
    }
  });

  app.elem.switcher.addEventListener("input", (e) => {
    let val = app.elem.switcher.querySelector('input').value;
    const items = app.elem.nav.querySelectorAll('#meta-channels li[data-name], #channels li[data-name], #privates li[data-name]');

    val = val.toLowerCase();
    const matches = [];
    const misses  = [];
    if (val) {
      for (let i=0; i < items.length; i++) {
        const item = items[i];
        const text = item.getAttribute("data-name").toLowerCase()

        if (text.indexOf(val) != -1) {
          matches.push(item);
        }
        else {
          misses.push(item);
        }
      }
    }
    else {
      for (let i=0; i < items.length; i++) {
        const item = items[i];
        if (item.classList.contains("unread")) {
          matches.push(item);
        }
        else {
          misses.push(item);
        }
      }
    }

    for (let i=0; i < matches.length; i++) {
      matches[i].classList.add("match");
    }
    for (let i=0; i < misses.length; i++) {
      misses[i].classList.remove("match");
    }

    for (let i=0; i < items.length; i++) {
      if (items[i].classList.contains("selected")) {
        if (items[i].classList.contains("match"))
          return;
        for (let j=i; j < items.length; j++) {
          if (items[j].classList.contains("match")) {
            items[i].classList.remove("selected");
            items[j].classList.add("selected");
            return;
          }
        }
        for (let k=i; k >= 0; k--) {
          if (items[k].classList.contains("match")) {
            items[i].classList.remove("selected");
            items[k].classList.add("selected");
            return;
          }
        }
      }
    }
  });

  window.addEventListener("blur", (e) => {
    app.window_focused = false;

    if (app.focused) {
      app.save_seen(app.focused);
    }
  });

  window.addEventListener("focus", (e) => {
    app.window_focused = true;
    app.focus_input();
    app.update_title();

    if (app.focused) {
      app.save_seen(app.focused);
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-nick')) {
      e.preventDefault();
      const nick = e.target.getAttribute('data-nick');
      const connection = app.focused.connection;
      app.add_panel(nick, connection, {focus: true});
    }
    document.querySelectorAll('.popup-toggle.open').forEach((el) => {
      if (!el.contains(e.target)) {
        el.classList.remove('open');
      }
    });
    // The header's menu closes the same way. On mobile the open menu is the
    // whole screen (the nav replaces the chat), so it stays open there.
    if (app.elem.flex_wrap.classList.contains('open')
        && !narrow.matches
        && !e.target.closest('.flex-wrap-left header, #global-controls')) {
      app.elem.flex_wrap.classList.remove('open');
    }
  });

  function join_click(e) {
    e.preventDefault();
    app.elem.flex_wrap.classList.remove('open');
    const dialog = app.new_dialog("join", {
      connections: Object.values(app.connections)
    });

    dialog.el.addEventListener('submit', async (e) => {
      e.preventDefault();
      const channel = dialog.el.querySelector('input[name=channel]').value;
      const select = dialog.el.querySelector('select');
      const conn = select.options[select.selectedIndex].value;
      try {
        await app.api.post(`/connection/${conn}`, {
          body: `JOIN ${channel}`,
          headers: {
            'content-type': "application/irc",
          }
        });
        app.close_dialog();
      }
      catch (e) {
        app.close_dialog();
        alert(`Error: ${e}`);
      }
    });
  }

  document.querySelectorAll('#global-controls li.link').forEach((el) => {
    el.addEventListener('click', (e) => {
      app.elem.flex_wrap.classList.remove('open');
    });
  });

  document.querySelectorAll('.join-channel').forEach((el) => {
    el.addEventListener('click', join_click);
  });

  document.querySelectorAll('.add-connection').forEach((el) => {
    el.addEventListener('click', (e) => app.config_modal(e));
  });

  document.querySelectorAll('#nav .nav-title')
    .forEach((el) => {
      el.addEventListener('click', (e) => {
        if (
          e.target.classList.contains('nav-title')
          || e.target.classList.contains('nav-title-text')
          || e.target.classList.contains('count')
        ) {
          e.preventDefault();
          el.classList.toggle('collapsed');
        }
      });
    });

  clickTouchEvent(document.querySelector('#view-log'), (e) => {
    e.preventDefault();
    app.open_log(app.focused);
  });

  clickTouchEvent(document.querySelector('#toggle-hideevents a'), (e) => {
    e.preventDefault();
    app.focused.set_ignore_events(!app.focused.ignore_events);
    app.update_pref(`${app.focused.id}-ignore-events`, app.focused.ignore_events);
  });

  clickTouchEvent(document.querySelector('#toggle-sendtyping a'), (e) => {
    e.preventDefault();
    app.focused.set_send_typing(!app.focused.send_typing);
    app.update_pref(`${app.focused.id}-send-typing`, app.focused.send_typing);
  });

  clickTouchEvent(document.querySelector('#toggle-hideembeds a'), (e) => {
    e.preventDefault();
    app.focused.set_collapse_embeds(!app.focused.collapse_embeds);
    app.update_pref(`${app.focused.id}-collapse-embeds`, app.focused.collapse_embeds);
  });

  clickTouchEvent(document.querySelector('#toggle-nicks'), (e) => {
    e.preventDefault();
    app.focused.set_show_nicklist(!app.focused.show_nicklist);
    app.update_pref(`${app.focused.id}-show-nicklist`, app.focused.show_nicklist);
  });

  app.elem.emoji.addEventListener('click', (e) => {
    e.preventDefault();

    if (e.target.matches('li[data-chars]')) {
      app.focus_input(true);
      document.execCommand("insertText", false, e.target.getAttribute('data-chars'));
      app.elem.emoji.classList.remove("open");
    }
    if (e.target.matches('#emoji')) {
      e.target.classList.toggle('open');
      if (e.target.classList.contains('open'))
        Emoji.open(app.elem.emoji, !app.mobile);
    }
  });

  function send_submit() {
    const input = app.elem.input.querySelector(".input");
    const panel = app.panels[input.getAttribute('data-panel-id')];

    const uploading = input.querySelector('.uploading');
    if (uploading) {
      alert("Please wait for upload to complete.");
      return;
    }

    let text = input.textContent.trim();
    if (text == "") return;

    panel.editor.history.record();
    app.clear_typing();

    let value = Unformat(input.innerHTML);
    input.innerHTML = "";
    panel.editor.save_selection();
    value = value.replace("\u200b", ""); // ew
    text = text.replace("\u200b", ""); // ew

    const connection = app.connections[panel.connection];
    const send = [];

    if (text.substring(0,1) == "/") {
      try {
        const val = app.commands.handle(panel, value.substring(1));
        if (val)
          send.push(val);
      }
      catch (e) {
        console.error(e);
        alert(e);
        return;
      }
    }
    else if (panel.type == "status") {
      throw "Can not message a status";
    }
    else {
      const lines = value.split(/[\r\n]/);

      for (let j=0; j < lines.length; j++) {
        const value = lines[j];
        if (!value)
          continue;

        // https://github.com/irssi/irssi/blob/fcd3ec467ff0e5943f34bb3a906bbe07ba6963ff/src/irc/core/irc-servers.c#L207
        const privmsg = `PRIVMSG ${panel.name} :`;
        const max = 510 - "!: PRIVMSG :".length - panel.name.length - connection.nick.length - max_userhost_len;
        if (value.length < max) {
          send.push(privmsg + value);
        }
        else {
          const words = value.split(/(\b)/);
          let len = 0;
          let buf = [];

          if (words.length > max * 20) {
            alert("This is too much text!");
            return;
          }

          for (let i=0; i < words.length; i++) {
            const word = words[i];
            if (len + word.length > max) {
              send.push(privmsg + buf.join(""));
              len = word.length;
              buf = [word];
            }
            else {
              buf.push(word);
              len += word.length;
            }
          }
          if (buf.length) {
            send.push(privmsg + buf.join(""));
          }
        }
      }
    }

    // one at a time, in order, stopping at the first failure
    async function sendlines(lines) {
      for (const line of lines) {
        try {
          await app.api.post(`/connection/${panel.connection}`, {
            headers:{
              'content-type': 'application/irc',
            },
            body: line
          });
        }
        catch (e) {
          alert(`Error: ${e}`);
          return;
        }
      }
    }

    sendlines(send);
    app.send_stop_typing(panel);
  }

  document.getElementById('image-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = e.target.querySelector('input[name="upload"]');
    const image = e.target.querySelector('input[name="image"]');
    const files = image.files;

    if (files.length == 0 || !files[0].type.match(/^(?:image|video)/)) {
      alert("Must select an image or video file");
      return;
    }

    submit.setAttribute('disabled','disabled');

    let response;
    try {
      response = await fetch("https://relaychat.party/img/", {
        method: "PUT",
        headers: { 'content-type': files[0].type },
        body: files[0]
      });
    }
    catch (error) {
      // network failure
      submit.removeAttribute('disabled');
      app.focus_input(true);
      return;
    }

    let res;
    try {
      res = await response.json();
    } catch (error) {
      res = { error: error };
    }

    submit.removeAttribute('disabled');

    if (response.status != 200) {
      const err = res['data'] ? res['data']['error'] : res['error'];
      alert(err);
      return;
    }

    app.focus_input(true);
    document.execCommand("insertText", false, res.data.link);
    document.getElementById('upload').classList.remove('open');
    image.value = null;
  });

  clickTouchEvent(document.getElementById('upload'), (e) => {
    if (e.target.matches('#upload')) {
      e.preventDefault();
      e.target.classList.toggle("open");
    }
  });

  clickTouchEvent(document.getElementById("help"), (e) => {
    e.preventDefault();
    app.new_dialog("help");
  });

  clickTouchEvent(document.getElementById('logout'), (e) => {
    e.preventDefault();

    if (!confirm("Are you sure you want to log out?"))
      return;

    app.api.logout();
  });

  window.addEventListener('resize', (e) => {
    if (app.focused) {
      app.focused.scroll_bottom(0);
      app.focused.resize_filler();
    }
  });

  document.addEventListener('copy', (e) => {
    if (app.overlayed() || app.mobile)
      return;

    e.preventDefault();

    const selected = window.getSelection().toString().split("\n");
    const lines = [];

    let nick;

    for (const i in selected) {
      const line = selected[i].trim();

      if (line.match(/^\d\d:\d\d$/))
        continue;

      if (! nick && line.match(/^< [^>]+>$/)) {
        nick = line;
        continue;
      }

      if (nick) {
        lines.push(`${nick} ${line}`);
        nick = null;
        continue;
      }

      if (line.match(/\S/))
        lines.push(line);
    }

    e.clipboardData.setData('Text', lines.join("\n"));
  });

  document.addEventListener('paste', async (e) => {
    if (app.overlayed())
      return;

    e.preventDefault();

    const clipboard = (e.clipboardData || e.originalEvent.clipboardData);
    const items = clipboard.items;
    for (const i in items) {
      if (items[i].type && items[i].type.match(/^image\//)) {
        const span = document.createElement('SPAN');
        span.classList.add('uploading');
        span.textContent = '[Uploading image...]';
        app.focused.editor.append_elem(span);

        app.focus_input();
        // clipboard items can't be read once the paste event is over
        const type = items[i].type;
        const blob = items[i].getAsFile();

        const response = await fetch("https://relaychat.party/img/", {
          method: "PUT",
          headers: { "content-type": type },
          body: blob
        });
        const res = await response.json();
        if (response.status != 200) {
          const err = res['data'] ? res['data']['error'] : res['error'];
          alert(err);
          span.parentNode.removeChild(span);
          return;
        }
        span.textContent = res.data.link;
        span.classList.remove('uploading');
        app.focused.editor.move_cursor_after(span);
        return;
      }
    }

    app.focus_input();
    const lines = clipboard.getData("Text").trim().split(/[\r\n]/);
    const text = lines.map((line) => { return line.trim(); })
      .filter((line) => { return line.match(/\S/); })
      .join("\n");
    document.execCommand("insertText", false, text);
  });

  clickTouchEvent(document.querySelector('.flex-wrap-left header'), (e) => {
    e.preventDefault();
    app.elem.flex_wrap.classList.toggle('open');
  });

  document.getElementById('web-notify').addEventListener('click', (e) => {
    e.preventDefault();
    if (app.notify.subscribed) {
      app.notify.unsubscribe();
    }
    else {
      app.notify.subscribe();
    }
  });

  document.getElementById('email-notify').addEventListener('click', function(e) {
      e.preventDefault();
      this.classList.toggle('enabled');
      const enabled = this.classList.contains('enabled');
      app.update_pref("email", enabled);
  });

  app.elem.panel.addEventListener('click', (e) => {
    if (!e.target.matches('.embed-toggle'))
      return;

    e.preventDefault();
    const toggle = e.target;
    const embed = JSON.parse(toggle.getAttribute('data-embed'));

    toggle.classList.toggle('hidden');
    if (toggle.classList.contains('hidden')) {
      const wrap = document.querySelector(`.embed-wrap[data-embed-id='${embed.id}']`);
      wrap.parentNode.parentNode.removeChild(wrap.parentNode);
    }
    else {
      app.focused.scroll(() => {
        const a = toggle.previousSibling;
        app.focused.embed(a, embed, true);
      });
    }
  });

  app.elem.panel.addEventListener('click', (e) => {
    if (!e.target.matches('.image-wrap img'))
      return;

    e.preventDefault();
    const img  = e.target;
    const link = e.target.parentNode;
    const href = link.href;

    const dialog = app.new_dialog("image_popup", {
      href: href
    });

    clickTouchEvent(dialog.el, (e) => {
      e.preventDefault();
      dialog.close();
    });
  });

  app.elem.topic.addEventListener('click', function(e) {
    if (app.focused) {
      if (e.target.nodeName != 'A') {
        const elem = this;
        app.focused.scroll(() => {
          elem.classList.toggle('expanded');
        });
      }
    }
  });

  app.elem.panel.addEventListener('click', (e) => {
    if (!e.target.matches('li.message time'))
        return;

    const msg = e.target;
    let panel;

    let p = msg;
    while ( p && !p.matches('li.message')) {
      p = p.parentNode;
    }

    if (p.getAttribute('data-panel-id')) {
      const panel_id = p.getAttribute('data-panel-id');
      panel = app.panels[panel_id];
    }
    else {
      panel = app.focused;
    }

    const from = new Date(msg.getAttribute('data-time') * 1000);
    const to = new Date((msg.getAttribute('data-time') + (60 * 60 * 24)) * 1000);
    let href = `${panel.log_url}/date/`;

    const from_year = from.getYear() + 1900;
    let from_month = String(from.getMonth() + 1);
    if (from_month.length == 1) {
      from_month = `0${from_month}`;
    }

    const to_year = to.getYear() + 1900;
    let to_month = String(to.getMonth() + 1);
    if (to_month.length == 1) {
      to_month = `0${to_month}`;
    }

    let from_day = String(from.getDate());
    if (from_day.length == 1) {
      from_day = `0${from_day}`;
    }

    let to_day = String(to.getDate());
    if (to_day.length == 1) {
      to_day = `0${to_day}`;
    }

    href += `${from_year}-${from_month}-${from_day}/`;
    href += `${to_year}-${to_month}-${to_day}/`;

    href += `message/${p.getAttribute('data-message-id')}`;
    window.open(href);
  });

  app.elem.panel.addEventListener('click', (e) => {
    if (!e.target.matches(
      '.embed-wrap[data-embed-id]:not(.open),' +
      '.embed-wrap[data-embed-id]:not(.open) *'
    ))
      return;

    e.preventDefault();

    let p = e.target;
    while (p && !p.matches('.embed-wrap[data-embed-id]')) {
      p = p.parentNode;
    }
    const id = p.getAttribute('data-embed-id');
    const a = document.querySelector(`.embed-toggle[data-embed-id='${id}']`);
    const embed = JSON.parse(a.getAttribute('data-embed'));

    if (embed.type == "link") {
      window.open(embed.url);
      return;
    }

    app.focused.scroll(() => {
      p.classList.add('open');
      p.innerHTML = embed.html;

      const head = document.querySelector('head');
      p.querySelectorAll('script').forEach((el) => {
        const s = el.parentNode.removeChild(el);
        const script = document.createElement('SCRIPT');
        const attrs = s.attributes;
        for (let i=0; i < attrs.length; i ++) {
          script.setAttribute(attrs[i].name, attrs[i].value);
        }
        script.innerHTML = s.innerHTML;
        head.appendChild(script);
      });
    });

    let h = p.clientHeight;
    const panel = app.focused;

    const m = new MutationObserver((s) => {
      const u = p.clientHeight;
      if (!panel.is_scrolled())
        panel.scroller.scrollTop += u - h;
      h = u;
    });

    const c = {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['class','style']
    };
    m.observe(p, c);

    setTimeout(() =>{ m.disconnect(); }, 10000);
  });

  app.elem.panel.addEventListener('click', (e) => {
    if (!e.target.matches('.message-react, .message-react *'))
      return;

    const target = e.target;
    let react = target;
    let controls = target;

    while (react && !react.matches('.message-react')) {
      react = react.parentNode;
    }

    while (controls && !controls.matches('.message-controls')) {
      controls = controls.parentNode;
    }

    if (target.matches('.message-react')) {
      react.classList.toggle('open');
      if (react.classList.contains('open')) {
        Emoji.open(react, true);
        controls.classList.add('open');
      }
      else {
        controls.classList.remove('open');
      }
    }
    if (target.matches('li[data-chars]')) {
      const emoji = target.getAttribute('data-chars');
      let message = react;
      while (message && !message.matches("li.message")) {
        message = message.parentNode;
      }
      const id = message.getAttribute('data-message-server-id');
      const panel = app.focused;

      react.classList.remove('open');
      controls.classList.remove('open');

      app.send_reaction(panel, id, emoji, false);
    }
  });

  app.elem.panel.addEventListener('click', (e) => {
    if (!e.target.matches('.reactions .reaction, .reactions .reaction *'))
      return;

    e.preventDefault();

    let group = e.target;
    while (group && !group.matches('.reaction')) {
      group = group.parentNode;
    }

    let message = group;
    while (message && !message.matches('li.message')) {
      message = message.parentNode;
    }

    if (!message)
      return;

    const panel_id = message.getAttribute('data-panel-id');
    const panel = panel_id ? app.panels[panel_id] : app.focused;

    app.send_reaction(
      panel,
      message.getAttribute('data-message-server-id'),
      group.getAttribute('data-emoji'),
      group.classList.contains('self')
    );
  });

  window.addEventListener("beforeunload", () => {
    if (app.focused) {
      app.focused.update_seen();
      app.save_seen(app.focused, true);
    }
  });

  app.elem.panel.addEventListener('transitionend', (e) => {
    if (e.target.matches('li.chat'))
      e.target.classList.remove('loading', 'loaded');
  });

  app.elem.themes.addEventListener('change', (e) => {
    const val = app.elem.themes.value;
    app.set_theme(val);
  });

  document.onselectionchange = function(e) {
    if (app.focused?.editor.focused) {
      app.focused.editor.save_selection();
    }
  };
};
