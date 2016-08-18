var Keyboard = function(element) {
  var TAB = 9;
  var UP = 38;
  var DOWN = 40;
  var ENTER = 13;
  var ALT = 18;

  this.meta_down = false;
  this.el = element;
  this.completion = new Completion(element);
  this.history = new History(element);

  this.intercept = [TAB, UP, DOWN];

  this.keydown = function(e) {
    if (this.intercept.indexOf(e.which) != -1)
      e.preventDefault();

    if (e.which == TAB) {
      this.completion.complete();
      return;
    }

    this.completion.stop();

    if (e.which == UP) {
      this.history.up();
    }
    else if (e.which == DOWN) {
      this.history.down();
    }
  };

  this.keypress = function(e) {
    if (e.which == ENTER) {
      this.history.record();
    }

    if (e.which != UP && e.which != DOWN) {
      this.history.reset();
    }
  };

  this.el.addEventListener("keydown",  this.keydown.bind(this), true);
  this.el.addEventListener("keypress", this.keypress.bind(this));
};
