// Templates are functions from their variables to HTML. Values interpolated
// with html`` are escaped (the same characters Handlebars escaped) unless
// they are already html`` results or wrapped in safe().

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;", "`": "&#x60;", "=": "&#x3D;" };

class SafeHTML {
  constructor(html) {
    this.html = html;
  }

  toString() {
    return this.html;
  }
}

// HTML that should be inserted as-is
export const safe = (html) => new SafeHTML(String(html));

const escape = (value) => {
  if (value instanceof SafeHTML)
    return value.html;
  if (value == null)
    return "";
  return String(value).replace(/[&<>"'`=]/g, (c) => ESCAPES[c]);
};

const html = (strings, ...values) =>
  new SafeHTML(strings.reduce((out, s, i) => out + escape(values[i - 1]) + s));

const each = (list, fn) =>
  new SafeHTML(list ? Object.values(list).map((item) => escape(fn(item))).join("") : "");

const templates = {
  connection: (v) => html`
    <section class="dialog config">
      <a href="#" class="close">close</a>
      <h2>${v.edit ? "Edit connection" : "Add a connection"}</h2>
      <form method="${v.method}" action="${v.action}">
        <div class="input-h-group">
          <fieldset class="input-group">
            <label for="host">Address <span class="required">*</span></label>
            <input name="Host" type="text" value="${v.Host}" placeholder="irc.freenode.com" required>
          </fieldset>
          <fieldset class="input-group">
            <label for="port">Port <span class="required">*</span></label>
            <input name="Port" type="number" value="${v.Port}" required>
          </fieldset>
          <fieldset class="input-group">
            <label for="ssl">TLS</label>
            <input name="Ssl" type="checkbox"${v.Ssl ? safe(" checked=checked") : ""}>
          </fieldset>
        </div>
        <fieldset class="input-group">
          <label for="nick">Nickname <span class="required">*</span></label>
          <input name="Nick" type="text" value="${v.Nick}" required>
        </fieldset>
        <div class="input-h-group">
          <fieldset class="input-group">
            <label for="user">Username</label>
            <input name="User" type="text" value="${v.User}">
          </fieldset>
          <fieldset class="input-group">
            <label for="pass">Password</label>
            <input name="Pass" type="text" value="${v.Pass}">
          </fieldset>
        </div>
        <div class="input-h-group">
          <fieldset class="input-group" style="width:100%">
            <input style="float:left" name="SASL" type="checkbox"${v.SASL ? safe(" checked=checked") : ""}>
            <label style="float:left;width:auto" for="sasl">Require SASL</label>
          </fieldset>
        </div>
        <hr>
        <fieldset class="input-group">
          <label for="channels">Channels
            <span>(comma separated)</span>
          </label>
          <input name="Channels" type="text" value="${v.Channels}">
        </fieldset>
        <fieldset class="input-group">
          <label for="highlight">Highlight words (comma separated)</label>
          <input name="Highlight" type="text" value="${v.Highlight}">
        </fieldset>
        <fieldset class="input-group">
          <label for="alias">Network alias</label>
          <input name="Alias" type="text" value="${v.Alias}">
        </fieldset>

        <fieldset class="submit-group">
          ${v.edit ? html`
          <input type="submit" value="&#xf071; Delete" class="delete-connection">
          <input type="submit" name="connect" value="Save & Reconnect" style="font-weight:bold">
          ` : html`
          <input type="submit" name="connect" value="Connect">
          `}
          <p style="float:right" class="note"><span class="required">*</span> required</p>
        </fieldset>
      </form>
    </section>
  `,

  date_separator: (v) => html`
    <div class="date-separator">
      <div class="date-wrap">
        <time>${v.day} ${v.month} ${v.date}, ${v.year}</time>
      </div>
      <hr>
    </div>
  `,

  embed: (v) => {
    const thumb = v.image || v.thumbnail_url;
    return html`
      <div class="embed-wrap-wrap">
        <div class="embed-wrap" data-embed-provider="${v.provider_name_lc}" data-embed-id="${v.id}">
          ${thumb ? html`
          <div class="embed-thumb" style="background-image:url(//noembed.com/i/0/450/${thumb})">
            ${v.is_video ? html`<div class="embed-play"></div>` : ""}
          </div>
          ` : ""}
          <h2>${v.title}</h2>
          ${v.use_html ? v.html : v.description ? html`<p class="description">${v.description}</p>` : ""}
          <p class="embed-source">${v.provider_name}</p>
        </div>
      </div>
    `;
  },

  emoji: (v) => each(v.emoji, (e) => html`
    <li data-chars="${e.chars}"${e.tones ? html` data-base="${e.base}" data-tones="${e.tones}"` : ""} data-keywords="${e.keywords}" data-name="${e.name}" title="${e.name}">${e.chars}</li>
  `),

  emoji_group: (v) => html`
    <section class="emoji-group" data-group="${v.name}">
      <h3>${v.title}</h3>
      <ul>${templates.emoji(v)}</ul>
    </section>
  `,

  emoji_nav: (v) => each(v.groups, (g) => html`
    <button type="button" data-group="${g.name}" title="${g.title}">${g.chars}</button>
  `),

  help: () => html`
    <aside class="dialog help">
      <a href="#" class="close">close</a>
      <p>Example commands:</p>

      <ul>
        <li><code>/join #channel</code></li>
        <li><code>/part reason</code></li>
        <li><code>/query user message</code></li>
        <li><code>/say /hello</code></li>
        <li><code>/topic new topic message</code></li>
        <li><code>/last query</code></li>
        <li><code>/[un]ignore nickname</code></li>
        <li><code>/ignores</code></li>
      </ul>

      <dl>
        <h3>Navigation</h3>
        <dt>Alt + [Up,Down]</dt>
        <dd>Next/Prev panel</dd>
        <dt>Shift + Alt + [Up,Down]</dt>
        <dd>Next/Prev unread panel</dd>
        <dt>Alt + [1-9]</dt>
        <dd>Focus panel</dd>
        <dt>Alt + t</dt>
        <dd>Quick panel switch</dd>
        <dt>Alt + k</dt>
        <dd>Quick panel switch</dd>
        <dt>Alt + ;</dt>
        <dd>Toggle nicklist</dd>
      </dl>
      <dl>
        <h3>Editor</h3>
        <dt>Ctrl + b</dt>
        <dd>Bold</dd>
        <dt>Ctrl + i</dt>
        <dd>Italic</dd>
        <dt>Ctrl + u</dt>
        <dd>Underline</dd>
        <dt>Ctrl + /</dt>
        <dd>Invert</dd>
        <dt>Shift + Up</dt>
        <dd>Previous line history</dd>
        <dt>Shift + Down</dt>
        <dd>Next line in history</dd>
      </dl>

      <p>
        <a target="_blank" href="https://github.com/lierc/lierc-basicui/blob/master/static/js/lierc/commands.js">Help Lee add more commands?</a>
      </p>
    </aside>
  `,

  image_popup: (v) => html`
    <div class="image-popup-wrap">
      <img class="image-popup" src="https://noembed.com/i/${v.href}">
    </div>
  `,

  join: (v) => html`
    <section  class="dialog join">
      <a href="#" class="close login-toggle">close</a>
      <h2>Join a channel</h2>
      <form method="POST">
        <fieldset class="input-group">
          <label for="channel">Channel name</label>
          <input type="text" name="channel" required>
        </fieldset>
        <fieldset class="input-group">
          <label for="connection">IRC Network</label>
          <select name="connection">
            ${each(v.connections, (c) => html`<option value="${c.id}">${c.host}</option>`)}
          </select>
        </fieldset>
        <fieldset class="submit-group">
          <input type="submit" name="join" value="Join">
        </fieldset>
      </form>
    </section>
  `,

  login: () => html`
    <section class="dialog login">
      <div class="login-wrap">
      <a href="#" class="close reset-toggle">Reset password</a>
      <h2>Login</h2>
      <form method="POST" class="login-form">
        <fieldset class="input-group">
          <label for="email">Email address or username</label>
          <input name="email" type="text" value="" required>
        </fieldset>
        <fieldset class="input-group">
          <label for="pass">Password</label>
          <input name="pass" type="password" value="" required>
        </fieldset>
        <fieldset class="submit-group">
          <input type="submit" name="auth" value="Log In">
        </fieldset>
      </form>


      <hr/>

      <h2>Register</h2>
      <form method="POST">
        <fieldset class="input-group">
          <label for="username">Username</label>
          <input name="username" type="text" value="" required>
        </fieldset>
        <fieldset class="input-group">
          <label for="email">Email address</label>
          <input name="email" type="email" value="" required>
        </fieldset>
        <fieldset class="input-group">
          <label for="pass">Password</label>
          <input name="pass" type="password" value="" required>
        </fieldset>
        <fieldset class="submit-group">
          <input type="submit" name="register" value="Register">
        </fieldset>
      </form>
      </div>

      <div class="reset-wrap">
      <a href="#" class="close login-toggle">Login</a>
      <h2>Reset password</h2>
      <form method="POST">
        <fieldset class="input-group">
          <label for="email">Email address</label>
          <input name="email" type="email" value="" required>
        </fieldset>
        <fieldset class="submit-group">
          <input type="submit" name="auth" value="This doesn't work" disabled>
        </fieldset>
      </form>
      </div>

    </section>
  `,

  message_menu: (v) => html`
    <div class="message-menu-popup">
      <ul>
        <li class="message-privmsg">Direct message</li>
        <li class="message-monospace">Monospace text ${v.is_monospace ? "off" : "on"}</li>
      </ul>
    </div>
  `,

  // no surrounding whitespace: callers use the element as firstChild
  nav_item: (v) => html`<li data-panel-id="${v.id}"><a class="panel-name">${v.name}</a>${
    v.editable ? html`<a class="fa-solid fa-pencil edit edit-panel" title="Edit"></a>` : ""}${
    v.closable ? html`<a class="fa-solid fa-xmark close-panel" title="Close"></a>` : ""}${
    v.log_url ? html`<a class="fa-solid fa-file-lines panel-log" title="View logs" href="${v.log_url}" target="_blank"></a>` : ""}</li>`,

  nick: (v) => html`<li><a class="nick-list-nick" data-nick="${v.nick}" data-nick-order="${v.order}">${v.sigil}${v.nick}</a></li>`,
};

export const Template = (name, vars = {}) => escape(templates[name](vars));
