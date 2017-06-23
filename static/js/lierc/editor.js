var Editor = function(element) {
  var editor = this;

  var BOLD = 66;
  var ITALIC = 73;
  var UNDERLINE = 85;

  var TAB = 9;

  editor.el = element;
  editor.completion = new Completion(element);
  editor.focused = false;

  var osx = window.navigator.userAgent.match(/Macintosh/);

  editor.keydown = function(e, mods) {
    if (!osx && mods['ctrl']) {
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
      editor.completion.complete();
      return;
    }

    editor.completion.stop();
  };

  editor.blur = function() {
    editor.focused = false;
  };

  editor.focus = function() {
    editor.focused = true;
  };
  
  editor.el.addEventListener("blur", editor.blur);
  editor.el.addEventListener("focus", editor.focus);
};
