var History = function(element) {
  this.el = element;
  this.limit = 10;
  this.history = [];

  var EMPTY = "";
  var index = null;
  var current = null;

  this.up = function() {
    var history = this.history.concat(this.tail());

    if (index === null) {
      index = 0;
    }
    else if (++index >= history.length) {
      index = 0;
    }

    this.el.innerHTML = history[index];
  };

  this.tail = function(rev) {
    var current = this.current();
    var tail = [EMPTY];

    if (current != EMPTY)
      tail.push(current);

    return tail;
  };

  this.current = function() {
    if (current === null) {
      current = this.el.innerHTML;
    }
    return current;
  };

  this.reset = function() {
    current = null;
    index = null;
  };

  this.down = function() {
    var history = this.history.concat(this.tail(true));
    
    if (index === null) {
      index = 0;
    }
    else if (--index < 0) {
      index = history.length - 1;
    }

    this.el.innerHTML = history[index];
  };

  this.record = function() {
    this.history.unshift(this.el.innerHTML);
    current = null;
    if (this.history.length > this.limit)
      this.history = this.history.slice(0, this.limit);
  };
}
