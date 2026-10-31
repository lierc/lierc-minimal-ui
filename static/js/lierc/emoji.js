import { Template } from "./template.js";

const TONE_NAMES = ["light", "medium-light", "medium", "medium-dark", "dark"];
const TONE_BUTTON = ["✋", "✋🏻", "✋🏼", "✋🏽", "✋🏾", "✋🏿"];
const RECENT_MAX = 24;

// One picker, shared by the message input and reactions: open() moves
// it into whichever element is opening it.
export const Emoji = {
  names: {},
  // what's typed between colons for each emoji, in picker order
  codes: [],
  // every standard emoji sequence, including skin tones and ZWJ sequences
  regex: /\p{RGI_Emoji}/gv,
  popup: document.querySelector('#emoji .emoji-popup'),
  groups: [],
  recent: [],
  tone: 0,
  // called with (pref name, value) when recents or the skin tone change
  save: () => {},
};

Emoji.load = async function() {
  const response = await fetch("/static/emoji.json");
  if (!response.ok)
    throw Error(response.statusText);
  const data = await response.json();

  Emoji.groups = data.groups;
  Emoji.codes = [];
  for (const group of data.groups) {
    for (const e of group.emoji) {
      Emoji.names[e.chars] = e.name;
      Emoji.codes.push({ code: Emoji.shortcode(e.name), chars: e.chars, tones: e.tones });
      (e.tones || []).forEach((tone, i) => {
        Emoji.names[tone] = `${e.name}: ${TONE_NAMES[i]} skin tone`;
      });
    }
  }

  if (Emoji.popup)
    Emoji.render();
};

// the name typed between colons: "Flag: Japan" is flag_japan
Emoji.shortcode = function(name) {
  return name.toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
};

Emoji.render = function() {
  const popup = Emoji.popup;
  const list = popup.querySelector('.emoji-list');
  const nav = popup.querySelector('.emoji-groups');

  nav.innerHTML = Template("emoji_nav", {
    groups: [{ name: "recent", title: "Recently used", chars: "🕘" }].concat(
      Emoji.groups.map((g) => ({ name: g.name, title: g.name, chars: g.emoji[0].chars }))
    )
  });
  list.innerHTML = Template("emoji_group", { name: "recent", title: "Recently used", emoji: [] });
  Emoji.render_recent();
  Emoji.update_tone_button();

  // a group per frame, so the page doesn't stall on ~2000 elements
  const groups = Emoji.groups.slice();
  const append_group = () => {
    const group = groups.shift();
    if (!group)
      return;
    list.insertAdjacentHTML('beforeend', Template("emoji_group", {
      name: group.name,
      title: group.name,
      emoji: group.emoji.map(Emoji.item),
    }));
    window.requestAnimationFrame(append_group);
  };
  window.requestAnimationFrame(append_group);

  popup.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-chars]');
    if (li)
      Emoji.use(li.getAttribute('data-chars'));

    const group = e.target.closest('.emoji-groups button');
    if (group)
      Emoji.show_group(group.getAttribute('data-group'));

    if (e.target.closest('.emoji-tone'))
      Emoji.set_tone((Emoji.tone + 1) % TONE_BUTTON.length);
  });

  popup.addEventListener('input', (e) => {
    if (e.target.matches('.emoji-search input'))
      Emoji.filter(e.target.value);
  });

  // enter picks the first match
  popup.querySelector('.emoji-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const first = list.querySelector('.emoji-group:not([hidden]) li:not([hidden])');
    if (first)
      first.click();
  });
};

// Slack-style tooltip for a reaction: "lee and bob reacted with thumbs up".
// Before emoji.json loads there are no names, so the emoji itself is used.
Emoji.reaction_title = function(chars, nicks) {
  const name = Emoji.names[chars];
  const what = name ? name[0].toLowerCase() + name.slice(1) : chars;
  const who = nicks.length > 1
    ? `${nicks.slice(0, -1).join(", ")} and ${nicks[nicks.length - 1]}`
    : nicks[0];
  return `${who} reacted with ${what}`;
};

// template variables for an emoji, shown in the current skin tone
Emoji.item = function(e) {
  const chars = Emoji.tone && e.tones ? e.tones[Emoji.tone - 1] : e.chars;
  return { chars, base: e.chars, tones: (e.tones || []).join(" "), name: e.name, keywords: e.keywords };
};

Emoji.render_recent = function() {
  const section = Emoji.popup.querySelector('.emoji-group[data-group="recent"]');
  section.querySelector('ul').innerHTML = Template("emoji", {
    emoji: Emoji.recent.map((chars) => ({ chars, name: Emoji.names[chars] || "", keywords: "" }))
  });
  section.hidden = Emoji.recent.length == 0;
};

// move the picker into `container`, reset it, and show it from the top
Emoji.open = function(container, focus) {
  if (!Emoji.popup)
    return;
  container.appendChild(Emoji.popup);
  const input = Emoji.popup.querySelector('.emoji-search input');
  input.value = '';
  if (Emoji.groups.length) {
    Emoji.filter('');
    Emoji.render_recent();
  }
  Emoji.popup.querySelector('.emoji-list').scrollTop = 0;
  Emoji.place(container);
  if (focus)
    input.focus();
};

// The picker opens upward from its button, unless that would cut it off at
// the top of the window or of the scrolling message list it's in; then it
// opens downward. Call it once the picker is showing.
Emoji.place = function(container) {
  const popup = Emoji.popup;
  popup.classList.remove('below');
  const list = container.closest('#panel-scroll');
  const top = Math.max(0, list ? list.getBoundingClientRect().top : 0);
  if (popup.getBoundingClientRect().top < top)
    popup.classList.add('below');
};

Emoji.use = function(chars) {
  Emoji.recent = [chars].concat(Emoji.recent.filter((c) => c != chars)).slice(0, RECENT_MAX);
  Emoji.save("emoji-recent", Emoji.recent);
};

Emoji.show_group = function(name) {
  const input = Emoji.popup.querySelector('.emoji-search input');
  if (input.value) {
    input.value = '';
    Emoji.filter('');
  }
  const list = Emoji.popup.querySelector('.emoji-list');
  const section = list.querySelector(`.emoji-group[data-group="${CSS.escape(name)}"]`);
  if (section)
    list.scrollTop = section.offsetTop;
};

Emoji.set_tone = function(tone) {
  Emoji.tone = tone;
  Emoji.save("emoji-tone", tone);
  Emoji.update_tone_button();
  for (const li of Emoji.popup.querySelectorAll('li[data-tones]')) {
    const tones = li.getAttribute('data-tones').split(" ");
    const chars = tone ? tones[tone - 1] : li.getAttribute('data-base');
    li.setAttribute('data-chars', chars);
    li.textContent = chars;
  }
};

Emoji.update_tone_button = function() {
  const button = Emoji.popup.querySelector('.emoji-tone');
  button.textContent = TONE_BUTTON[Emoji.tone];
  button.title = Emoji.tone ? `Skin tone: ${TONE_NAMES[Emoji.tone - 1]}` : "Skin tone";
};

Emoji.filter = function(text) {
  const t = text.toLowerCase();
  for (const section of Emoji.popup.querySelectorAll('.emoji-group')) {
    let shown = 0;
    for (const li of section.querySelectorAll('li')) {
      const match = !t
        || li.getAttribute('data-keywords').includes(t)
        || li.getAttribute('data-name').toLowerCase().includes(t);
      li.hidden = !match;
      if (match)
        shown++;
    }
    // recents would only repeat matches from the other groups
    const recent = section.getAttribute('data-group') == "recent";
    section.hidden = !shown || (recent && !!t);
  }
};
