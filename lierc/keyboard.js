var Keyboard = function(element) {
  var keyboard = this;

  var TAB = 9;
  var UP = 38;
  var DOWN = 40;
  var ENTER = 13;
  var ALT = 18;

  keyboard.focused = false;
  keyboard.meta_down = false;
  keyboard.el = element;
  keyboard.completion = new Completion(element);
  keyboard.history = new History(element);

  keyboard.keydown = function(e) {
    if (e.which == TAB) {
      e.preventDefault();
      keyboard.completion.complete();
      return;
    }

    keyboard.completion.stop();

    if (e.which == UP) {
      e.preventDefault();
      keyboard.history.up();
    }
    else if (e.which == DOWN) {
      e.preventDefault();
      keyboard.history.down();
    }
  };

  keyboard.keypress = function(e) {
    if (e.which == ENTER) {
      keyboard.history.record();
    }

    if (e.which != UP && e.which != DOWN) {
      keyboard.history.reset();
    }
  };

  keyboard.blur = function() {
    keyboard.focused = false;
  };

  keyboard.focus = function() {
    keyboard.focused = true;
  };

  keyboard.el.addEventListener("blur", keyboard.blur);
  keyboard.el.addEventListener("focus", keyboard.focus);
  keyboard.el.addEventListener("keypress", keyboard.keypress);
};
