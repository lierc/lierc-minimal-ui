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
    if (mods['ctrl']) {
      if (e.which == BOLD) {
        e.preventDefault();
        keyboard.el.value += "\x02";
        return;
      }
      if (e.which == ITALIC) {
        e.preventDefault();
        keyboard.el.value += "\x1D";
        return;
      }
      if (e.which == UNDERLINE) {
        e.preventDefault();
        keyboard.el.value += "\x1F";
        return;
      }
    }

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
