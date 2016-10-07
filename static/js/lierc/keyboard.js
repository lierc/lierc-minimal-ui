var Keyboard = function(element) {
  var keyboard = this;

  var BOLD = 66;
  var ITALIC = 73;
  var UNDERLINE = 85;

  var TAB = 9;

  keyboard.focused = false;
  keyboard.el = element;
  keyboard.completion = new Completion(element);

  keyboard.keydown = function(e, mods) {
    if (e.which == TAB) {
      e.preventDefault();
      keyboard.completion.complete();
      return;
    }

    keyboard.completion.stop();
  };

  keyboard.blur = function() {
    keyboard.focused = false;
  };

  keyboard.focus = function() {
    keyboard.focused = true;
  };

  keyboard.el.addEventListener("blur", keyboard.blur);
  keyboard.el.addEventListener("focus", keyboard.focus);
};
