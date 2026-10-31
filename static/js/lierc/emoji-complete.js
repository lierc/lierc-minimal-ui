// Inserting emoji by typing :name in the message input. Names are the
// picker's names as Emoji.shortcode writes them.

import { Emoji } from "./emoji.js";
import { Template } from "./template.js";

// the characters a typed name can hold, as Emoji.shortcode keeps them
const NAME = /^[\p{L}\p{N}_-]$/u;
const MIN_QUERY = 2;

// The :query ending at pos in text, if there is one: its ":" starts the
// text or follows whitespace, and at least MIN_QUERY name characters come
// after it. closed is true when a ":" right before pos ends the name.
export function query_at(text, pos) {
  let end = pos;
  const closed = text[pos - 1] == ":";
  if (closed)
    end--;

  let start = end;
  while (start > 0 && NAME.test(text[start - 1]))
    start--;

  const colon = start - 1;
  if (colon < 0 || text[colon] != ":")
    return null;
  if (colon > 0 && !/\s/.test(text[colon - 1]))
    return null;
  if (end - start < MIN_QUERY)
    return null;

  return { start: colon, end: pos, query: text.slice(start, end), closed };
}

// codes whose name contains query: those starting with it first, then the
// rest, each in their original order
export function rank(codes, query) {
  const prefix = [], rest = [];
  for (const c of codes) {
    const i = c.code.indexOf(query);
    if (i == 0)
      prefix.push(c);
    else if (i > 0)
      rest.push(c);
  }
  return prefix.concat(rest);
}

// the emoji as inserted: in the chosen skin tone when it has tones
const toned = (c) => Emoji.tone && c.tones ? c.tones[Emoji.tone - 1] : c.chars;

// The list of matching emoji above one input. Every input shares one list
// element; only the focused input's is ever open.
export class EmojiComplete {
  #input;
  #list;
  #open = false;
  #matches = [];
  #index = 0;
  #node = null;
  #query = null;

  constructor(input, list) {
    this.#input = input;
    this.#list = list;
    // on mousedown, so the input keeps focus (its blur closes the list)
    list.addEventListener("mousedown", (e) => {
      const li = e.target.closest("li[data-index]");
      if (!this.#open || !li)
        return;
      e.preventDefault();
      this.#insert(this.#matches[Number(li.getAttribute("data-index"))]);
    });
  }

  get open() {
    return this.#open;
  }

  // after each input event: open, refresh or close the list for the
  // :query before the cursor, or insert a completed :name:
  update() {
    const sel = window.getSelection();
    const node = sel.focusNode;
    if (!Emoji.codes.length || !sel.isCollapsed || !node
        || node.nodeType != Node.TEXT_NODE || !this.#input.contains(node)) {
      this.close();
      return;
    }

    const q = query_at(node.textContent, sel.focusOffset);
    if (!q) {
      this.close();
      return;
    }
    this.#node = node;
    this.#query = q;

    if (q.closed) {
      const exact = Emoji.codes.find((c) => c.code == q.query);
      if (exact)
        this.#insert(exact);
      else
        this.close();
      return;
    }

    this.#matches = rank(Emoji.codes, q.query);
    if (!this.#matches.length) {
      this.close();
      return;
    }
    this.#index = 0;
    this.#render();
  }

  // true if it handled the key, which only happens while the list is open
  keydown(e) {
    if (!this.#open || e.ctrlKey || e.metaKey || e.altKey)
      return false;
    switch (e.key) {
    case "ArrowDown":
      this.#move(1);
      break;
    case "ArrowUp":
      this.#move(-1);
      break;
    case "Tab":
    case "Enter":
      this.#insert(this.#matches[this.#index]);
      break;
    case "Escape":
      this.close();
      break;
    default:
      return false;
    }
    e.preventDefault();
    return true;
  }

  close() {
    if (!this.#open)
      return;
    this.#open = false;
    this.#list.hidden = true;
    this.#list.innerHTML = "";
    this.#matches = [];
    this.#node = null;
    this.#query = null;
  }

  #render() {
    this.#list.innerHTML = Template("emoji_complete", {
      matches: this.#matches.map((c, i) => ({
        index: i, chars: toned(c), code: c.code, selected: i == this.#index
      }))
    });
    this.#list.hidden = false;
    this.#list.scrollTop = 0;
    this.#open = true;
  }

  #move(by) {
    const rows = this.#list.querySelectorAll("li");
    rows[this.#index].classList.remove("selected");
    this.#index = (this.#index + by + rows.length) % rows.length;
    rows[this.#index].classList.add("selected");
    rows[this.#index].scrollIntoView({ block: "nearest" });
  }

  // replaces the :query (and a closing ":") with the emoji
  #insert(code) {
    const { start, end } = this.#query;
    const range = document.createRange();
    range.setStart(this.#node, start);
    range.setEnd(this.#node, end);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    this.close();

    const chars = toned(code);
    document.execCommand("insertText", false, chars);
    Emoji.use(chars);
  }
}
