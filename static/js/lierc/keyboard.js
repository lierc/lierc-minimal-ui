var Keyboard = function(element) {
  var keyboard = this;

  var BOLD = 66;
  var ITALIC = 73;
  var UNDERLINE = 85;

  var TAB = 9;

  keyboard.el = element;
  keyboard.completion = new Completion(element);
  keyboard.focused = false;

  var osx = window.navigator.userAgent.match(/Macintosh/);

  keyboard.keydown = function(e, mods) {
    if (!osx && modes['ctrl']) {
      if (e.which == BOLD) {
        e.preventDefault();
        document.execCommand('bold');
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
