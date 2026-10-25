if (!String.prototype.splice) {
    /**
     * {JSDoc}
     *
     * The splice() method changes the content of a string by removing a range of
     * characters and/or adding new characters.
     *
     * @this {String}
     * @param {number} start Index at which to start changing the string.
     * @param {number} delCount An integer indicating the number of old chars to remove.
     * @param {string} newSubStr The String that is spliced in.
     * @return {string} A new string with the spliced substring.
     */
    String.prototype.splice = function(start, delCount, newSubStr) {
        return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
    };
}

const BREAK = ' .,:;';

export class Completion {
  constructor(element) {
    this.completions = [];
    this.commands = [];
    this.nicks = [];
    this.completing = false;
    this.matches = []
    this.word = null;
    this.index = 0;
    this.el = element;
  }

  complete(e) {
    if (! this.completing)
      this.start();
    if (this.completing)
      this.cycle();
  }

  stop() {
    this.completing = false;
    this.matches = [];
    this.completions = [];
    this.index = 0;
    this.word = null;
  }

  start() {
    const word = this.find_word();
    if (!word || word.length == 0)
      return;
    this.completions = word.text[0] == "/" ? this.commands : this.nicks;
    const sel = window.getSelection();
    const matches = this.find_matches(word.text);

    if (matches.length == 0)
      return;

    this.matches = matches.concat([word.text]);
    this.word = word;
    this.completing = true;
    this.index = 0;
  }

  cycle() {
    if (this.index >= this.matches.length)
      this.index = 0;

    const node = this.word.node;
    let word = this.matches[this.index++];

    if (this.index != this.matches.length) {
      if (this.word.append) {
        word += this.word.append;
      }
    }

    const text = node.textContent;
    node.textContent = text.splice(this.word.start, this.word.length, word);
    this.word.tail = word.length;
    this.word.length = word.length;
    this.move_cursor();
  }

  move_cursor(count) {
    let node = this.word.node;
    if (node.nodeType == 1) {
      if (node.childNodes[0].nodeType == 3)
        node = node.childNodes[0];
      else
        return;
    }
    const length = this.word.start + this.word.length;
    const range = document.createRange();
    range.setStart(node, length);
    range.setEnd(node, length);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  find_matches(word) {
    word = word.toLowerCase();
    const matches = [];
    const length = word.length;
    
    for (let i=0; i < this.completions.length; i++) {
      const w = this.completions[i];
      if (w.length < length)
        continue;
      if (w.substring(0, length).toLowerCase() == word)
        matches.push(w);
    }

    return matches;
  }

  find_word() {
    const sel = window.getSelection();
    const node = sel.focusNode;
    const pos  = sel.focusOffset;
    const text = node.textContent;

    if (text.length == 0) {
      return null;
    }

    let start = 0;
    let end   = null;

    /* check if we are at a completable position */
    if (pos == text.length) {
      end = text.length;
    }
		else {
      for (let i=pos; i < text.length; i++) {
        if (BREAK.indexOf(text[i]) != -1) {
          end = i;
          break;
        }
      }
    }

    /* find start of word */
    for (let i=pos - 1; i >= 0; i--) {
      if (BREAK.indexOf(text[i]) != -1) {
        start = i + 1;
        break;
      }
    }

    if (start === null || end === null) {
      return null;
    }

    const word = text.slice(start, end);
    const next = text.slice(end, end + 1);
    let append = ' ';

    if (start == 0 && end == text.length && word[0] != '/') {
      append = ': ';
    }
    else if (next && BREAK.indexOf(next) != -1) {
      append = '';
    }

    return {
      text: word,
      start: start,
      end: end,
      tail: 0,
      length: word.length,
      node: node,
      append: append
    };
  }
}
