var Editor = function(element) {
  var editor = this;

  var BOLD = 66;
  var ITALIC = 73;
  var UNDERLINE = 85;
  var INVERT = 191;

  var TAB = 9;

  editor.el = element;
  editor.completion = new Completion(element);
  editor.focused = false;
  editor.foreground = null;
  editor.background = null;

  var osx = window.navigator.userAgent.match(/Macintosh/);

  editor.keydown = function(e, mods) {
    if (mods['ctrl'] && !mods['shift'] && !mods['alt']) {
      if (e.which == BOLD) {
        e.preventDefault();
        document.execCommand('bold');
        return;
      }
      if (e.which == INVERT) {
        e.preventDefault();
        var sel = window.getSelection();
        var node = sel.focusNode;
        var range = sel.getRangeAt(0);
        var span = document.createElement('SPAN');
        span.appendChild(range.extractContents());
        span.classList.add('invert');
        range.insertNode(span);

        if (span.textContent == "") {
          span.textContent = "\u200b";
          range.setStart(span, 0);
        }

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
