var Completion = function(element) {
  var TAB = 9;

  this.completions = [];
  this.completing = false;
  this.matches = []
  this.position = 0;
  this.index = 0;
  this.el = element;

  this.complete = function(e) {
    if (! this.completing)
      this.start();
    this.cycle();
  };

  this.stop = function() {
    this.completing = false;
    this.matches = [];
    this.position = 0;
    this.index = 0;
  };

  this.start = function() {
    var word = this.last_word();
    var sel = window.getSelection();
    this.position = sel.focusOffset - word.length;
    this.completing = true
    this.matches = this.find_matches(word).concat([word]);
    this.index = 0;
  };

  this.cycle = function() {
    if (this.index >= this.matches.length)
      this.index = 0;

    var sel = window.getSelection();
    var node = sel.focusNode;

    var start = node.textContent.substring(0, this.position)
    var end = this.matches[this.index++];

    if (this.index != this.matches.length) {
      // add a ":" if this is the first word on the line
      if (start.indexOf(" ") == -1) {
        end += ":";
      }
      end += " ";
    }

    node.textContent = start + end;
    this.move_cursor();
  };

  this.move_cursor = function() {
    var sel = window.getSelection();
    var node = sel.focusNode;
    var length = node.textContent.length;
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
        matches.push(w);
    }

    return matches;
  };

  this.last_word = function() {
    var sel = window.getSelection();
    var node = sel.focusNode;
    return node.textContent.replace(/.*\s/, "");
  };
};
