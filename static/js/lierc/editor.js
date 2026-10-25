import { Completion } from "./completion.js";
import { Format } from "./format.js";
import { History } from "./history.js";

const BOLD = 66;
const ITALIC = 73;
const UNDERLINE = 85;
const INVERT = 191;
const COLOR = 67;
const RESET = 79;
const TAB = 9;
const UP = 38;
const DOWN = 40;

export class Editor {
  constructor(element) {
    this.el = element;
    this.info = document.getElementById('color-info');
    this.completion = new Completion(element);
    this.history = new History(element);
    this.focused = false;
    this.coloring = false;
    this.color = "";
    this.range = null;

    this.el.addEventListener("blur", (e) => this.blur(e));
    this.el.addEventListener("focus", (e) => this.focus(e));
    this.el.addEventListener("input", (e) => this.save_selection(e));
  }

  keydown(e, mods) {
    if (this.coloring) {
      if (e.which >= 48 && e.which <= 57) {
        var i = String(9 - (57 - e.which));
        this.color += i;
        e.preventDefault();
      }
      else if (e.which == 188) {
        this.color += ",";
        e.preventDefault();
      }
      else {
        this.coloring = false;
        this.el.classList.remove('coloring');
        this.info.classList.remove('open');

        var seq = this.color;
        var parts = seq.match(/^(?:([0-9]{1,2}),?([0-9]{1,2})?)?$/);
        this.color = "";

        if (parts === null) {
          alert("Invalid color sequence: '" + seq + "'");
          return;
        }

        var sel = window.getSelection();
        var node = sel.focusNode;
        var range = sel.getRangeAt(0);
        var span = document.createElement('SPAN');
        span.appendChild(range.extractContents());

        if (typeof(parts[1]) != "undefined") {
          var i = parts[1];
          var c = Format.color_map[parseInt(i)];

          if (typeof(c) === "undefined") {
            alert("Invalid color '" + i + "' in sequence '" + seq + "'");
            return;
          }

          span.style.color = c;
          span.setAttribute('data-color-fg', i);

          if (typeof(parts[2]) != "undefined") {
            var i = parts[2];
            var c = Format.color_map[parseInt(i)];

            if (typeof(c) === "undefined") {
              alert("Invalid color '" + i + "' in sequence '" + seq + "'");
              return;
            }

            span.style.backgroundColor = c;
            span.setAttribute('data-color-bg', i);
          }
        }
        else {
          span.style.color = "#000";
          span.style.backgroundColor = "#fff";
          span.setAttribute('data-color-reset', 1);
        }

        range.insertNode(span);

        if (span.textContent == "") {
          span.textContent = "\u200b";
          range.setStart(span, 1);
          range.setEnd(span, 1);
        }
      }
    }

    else if (mods['meta'] && !mods['shift'] && !mods['ctrl']) {
      if (e.which == COLOR) {
        this.coloring = !this.coloring;
        if (this.coloring) {
          this.el.classList.add('coloring');
          this.info.classList.add('open');
        }
        else {
          this.el.classList.remove('coloring');
          this.info.classList.remove('open');
        }
        return;
      }

      if (e.which == RESET) {
        var sel = window.getSelection();
        var range = sel.getRangeAt(0);

        var last = this.el.lastChild;
        range.setEndAfter(last);

        var contents = range.extractContents();
        var text = document.createTextNode("\u200b" + contents.textContent);
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
        var sel = window.getSelection();
        var range = sel.getRangeAt(0);
        var span = document.createElement('SPAN');
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

      var sel = window.getSelection();
      var range = sel.getRangeAt(0);
      var last = this.el.lastChild;
      if (last) {
        range.setStartAfter(last);
        range.setEndAfter(last);
      }
      return;
    }

    if (e.which == DOWN && !mods['ctrl'] && !mods['meta'] && mods['shift']) {
      e.preventDefault();
      this.history.down();

      var sel = window.getSelection();
      var range = sel.getRangeAt(0);
      var last = this.el.lastChild;
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
  }

  focus() {
    this.focused = true;
    this.restore_selection();
  }

  restore_selection() {
    if (this.range) {
      var s = window.getSelection();
      s.removeAllRanges();
      var range = document.createRange();
      range.setStart(this.range.startContainer, this.range.startOffset);
      range.setEnd(this.range.endContainer, this.range.endOffset);
      s.addRange(range);
    }
  }

  append_elem(el) {
    var sel = window.getSelection();
    var range = sel.getRangeAt(0);
    range.insertNode(el);
    this.move_cursor_after(el);
  }

  move_cursor_after(el) {
    var sel = window.getSelection();
    var range = sel.getRangeAt(0);
    range.setStart(el, 1);
    range.setEnd(el, 1);
  }

  save_selection() {
    var s = window.getSelection();
    if (s.rangeCount == 0) {
      this.range = null;
      return;
    }

    var range = s.getRangeAt(0);
    var node = range.commonAncestorContainer;
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
