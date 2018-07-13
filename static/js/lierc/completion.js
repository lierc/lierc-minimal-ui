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

var Completion = function(element) {
  var TAB = 9;

  this.completions = [];
  this.commands = [];
  this.nicks = [];
  this.completing = false;
  this.matches = []
  this.word = null;
  this.index = 0;
  this.el = element;

  this.complete = function(e) {
    if (! this.completing)
      this.start();
    if (this.completing)
      this.cycle();
  };

  this.stop = function() {
    this.completing = false;
    this.matches = [];
    this.completions = [];
    this.index = 0;
    this.word = null;
  };

  this.start = function() {
    var word = this.find_word();
    if (!word)
      return;
    this.completions = word.text[0] == "/" ? this.commands : this.nicks;
    var sel = window.getSelection();
    this.word = word;
    this.completing = true;
    this.matches = this.find_matches(word.text).concat(['']);
    this.index = 0;
  };

  this.cycle = function() {
    if (this.index >= this.matches.length)
      this.index = 0;

    var node = this.word.node;
    var end = this.matches[this.index++];

    if (this.index != this.matches.length) {
      if (this.word.append) {
        end += this.word.append;
      }
    }

    var text = node.textContent;
    node.textContent = text.splice(this.word.end, this.word.tail, end);
    this.word.tail = end.length;
    this.move_cursor();
  };

  this.move_cursor = function(count) {
    var node = this.word.node;
    if (node.nodeType == 1) {
      if (node.childNodes[0].nodeType == 3)
        node = node.childNodes[0];
      else
        return;
    }
    var length = this.word.end + this.word.tail;
    var range = document.createRange();
    range.setStart(node, length);
    range.setEnd(node, length);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  this.find_matches = function(word) {
    word = word.toLowerCase();
    var matches = [];
    var length = word.length;
    
    for (var i=0; i < this.completions.length; i++) {
      var w = this.completions[i];
      if (w.length < length)
        continue;
      if (w.substring(0, length).toLowerCase() == word)
        matches.push(w.slice(word.length));
    }

    return matches;
  };

  var BREAK = ' .,:;';

  this.find_word = function() {
    var sel = window.getSelection();
    var node = sel.focusNode;
    var pos  = sel.focusOffset;
    var text = node.textContent;

    if (text.length == 0) {
      return null;
    }

    var start = 0;
    var end   = null;

    /* check if we are at a completable position */
    if (pos == text.length) {
      end = text.length;
    }
		else {
			for (var i=pos; i < text.length; i++) {
				if (BREAK.indexOf(text[i]) != -1) {
					end = i;
					break;
				}
			}
    }

    /* find start of word */
		for (var i=pos - 1; i >= 0; i--) {
			if (BREAK.indexOf(text[i]) != -1) {
				start = i + 1;
				break;
			}
		}

    if (start === null || end === null) {
      return null;
    }

    var word = text.slice(start, end);
    var next = text.slice(end, end + 1);
    var append = ' ';

    if (start == 0 && end == text.length) {
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
  };
};
