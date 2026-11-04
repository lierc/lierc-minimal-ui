import { Completion } from "./completion.js";
import { EmojiComplete } from "./emoji-complete.js";
import { History } from "./history.js";

const BOLD = 66;
const ITALIC = 73;
const UNDERLINE = 85;
const INVERT = 191;
const RESET = 79;
const TAB = 9;
const UP = 38;
const DOWN = 40;

export class Editor {
  constructor(element) {
    this.el = element;
    this.completion = new Completion(element);
    this.emoji = new EmojiComplete(element, document.getElementById('emoji-complete'));
    this.history = new History(element);
    this.focused = false;
    this.range = null;

    this.el.addEventListener("blur", (e) => this.blur(e));
    this.el.addEventListener("focus", (e) => this.focus(e));
    this.el.addEventListener("input", (e) => {
      this.save_selection(e);
      this.emoji.update(e);
    });
    this.el.addEventListener("compositionend", () => this.emoji.update());
  }

  keydown(e, mods) {
    if (mods['meta'] && !mods['shift'] && !mods['ctrl']) {
      if (e.which == RESET) {
        const sel = window.getSelection();
        const range = sel.getRangeAt(0);

        const last = this.el.lastChild;
        range.setEndAfter(last);

        const contents = range.extractContents();
        const text = document.createTextNode(`\u200b${contents.textContent}`);
        this.el.appendChild(text);

        range.setStart(text, 1);
        range.setEnd(text, 1);
        return;
      }
    }

    else if (mods['ctrl'] && !mods['shift'] && !mods['meta']) {
      if (e.which == BOLD) {
        e.preventDefault();
        document.execCommand('bold');
        return;
      }
      if (e.which == INVERT) {
        e.preventDefault();
        const sel = window.getSelection();
        const range = sel.getRangeAt(0);
        const span = document.createElement('SPAN');
        span.appendChild(range.extractContents());
        span.classList.add('invert');
        range.insertNode(span);

        if (span.textContent == "") {
          span.textContent = "\u200b";
          range.setStart(span, 1);
          range.setEnd(span, 1);
        }

        return;
      }
      if (e.which == ITALIC) {
        e.preventDefault();
        document.execCommand('italic');
        return;
      }
      if (e.which == UNDERLINE) {
        e.preventDefault();
        document.execCommand('underline');
        return;
      }
    }

    if (e.which == TAB && !mods['ctrl']) {
      e.preventDefault();
      this.completion.complete();
      return;
    }

    this.completion.stop();

    if (e.which == UP && !mods['ctrl'] && !mods['meta'] && mods['shift']) {
      e.preventDefault();
      this.history.up();

      const sel = window.getSelection();
      const range = sel.getRangeAt(0);
      const last = this.el.lastChild;
      if (last) {
        range.setStartAfter(last);
        range.setEndAfter(last);
      }
      return;
    }

    if (e.which == DOWN && !mods['ctrl'] && !mods['meta'] && mods['shift']) {
      e.preventDefault();
      this.history.down();

      const sel = window.getSelection();
      const range = sel.getRangeAt(0);
      const last = this.el.lastChild;
      if (last) {
        range.setStartAfter(last);
        range.setEndAfter(last);
      }
      return;
    }

    this.history.reset();
  }

  blur() {
    this.focused = false;
    this.emoji.close();
  }

  focus() {
    this.focused = true;
    this.restore_selection();
  }

  restore_selection() {
    if (this.range) {
      const s = window.getSelection();
      s.removeAllRanges();
      const range = document.createRange();
      range.setStart(this.range.startContainer, this.range.startOffset);
      range.setEnd(this.range.endContainer, this.range.endOffset);
      s.addRange(range);
    }
  }

  // append_elem inserts el at the caret, or where the caret last was in the
  // input, or at the end of the input, and puts the caret after it.
  append_elem(el) {
    this.caret().insertNode(el);
    this.move_cursor_after(el);
  }

  // caret is the selection's range when it's inside the input; otherwise a
  // new range at the saved position, or collapsed at the end of the input.
  caret() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (this.el.contains(range.commonAncestorContainer))
        return range;
    }

    const range = document.createRange();
    if (this.range && this.el.contains(this.range.startContainer) && this.el.contains(this.range.endContainer)) {
      range.setStart(this.range.startContainer, this.range.startOffset);
      range.setEnd(this.range.endContainer, this.range.endOffset);
    }
    else {
      range.selectNodeContents(this.el);
      range.collapse(false);
    }
    return range;
  }

  move_cursor_after(el) {
    if (!this.el.contains(el))
      return;
    const range = document.createRange();
    range.setStartAfter(el);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    this.save_selection();
  }

  save_selection() {
    const s = window.getSelection();
    if (s.rangeCount == 0) {
      this.range = null;
      return;
    }

    const range = s.getRangeAt(0);
    const node = range.commonAncestorContainer;
    if (this.el.contains(node)) {
      this.range = {
        startContainer: range.startContainer,
        endContainer: range.endContainer,
        startOffset: range.startOffset,
        endOffset: range.endOffset
      };
    }
    else {
      this.range = null;
    }
  }
}
