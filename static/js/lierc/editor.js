var Editor = function(element) {
  var editor = this;

  var BOLD = 66;
  var ITALIC = 73;
  var UNDERLINE = 85;
  var INVERT = 191;
  var COLOR = 67;
  var RESET = 79;

  var TAB = 9;
  var UP = 38;
  var DOWN = 40;

  editor.el = element;
  editor.info = document.getElementById('color-info');
  editor.completion = new Completion(element);
  editor.history = new History(element);
  editor.focused = false;
  editor.coloring = false;
  editor.color = "";
  editor.range = null;

  var osx = window.navigator.userAgent.match(/Macintosh/);

  editor.keydown = function(e, mods) {
    if (editor.coloring) {
      if (e.which >= 48 && e.which <= 57) {
        var i = String(9 - (57 - e.which));
        editor.color += i;
        e.preventDefault();
      }
      else if (e.which == 188) {
        editor.color += ",";
        e.preventDefault();
      }
      else {
        editor.coloring = false;
        editor.el.classList.remove('coloring');
        editor.info.classList.remove('open');

        var seq = editor.color;
        var parts = seq.match(/^(?:([0-9]{1,2}),?([0-9]{1,2})?)?$/);
        editor.color = "";

        if (parts === null) {
          alert("Invalid color sequence: '" + seq + "'");
          return;
        }

        var sel = window.getSelection();
        var node = sel.focusNode;
        var range = sel.getRangeAt(0);
        var span = document.createElement('SPAN');
        span.appendChild(range.extractContents());

        if (typeof(parts[1]) != "undefined") {
          var i = parts[1];
          var c = Format.color_map[parseInt(i)];

          if (typeof(c) === "undefined") {
            alert("Invalid color '" + i + "' in sequence '" + seq + "'");
            return;
          }

          span.style.color = c;
          span.setAttribute('data-color-fg', i);

          if (typeof(parts[2]) != "undefined") {
            var i = parts[2];
            var c = Format.color_map[parseInt(i)];

            if (typeof(c) === "undefined") {
              alert("Invalid color '" + i + "' in sequence '" + seq + "'");
              return;
            }

            span.style.backgroundColor = c;
            span.setAttribute('data-color-bg', i);
          }
        }
        else {
          span.style.color = "#000";
          span.style.backgroundColor = "#fff";
          span.setAttribute('data-color-reset', 1);
        }

        range.insertNode(span);

        if (span.textContent == "") {
          span.textContent = "\u200b";
          range.setStart(span, 1);
          range.setEnd(span, 1);
        }
      }
    }

    else if (mods['meta'] && !mods['shift'] && !mods['ctrl']) {
      if (e.which == COLOR) {
        editor.coloring = !editor.coloring;
        if (editor.coloring) {
          editor.el.classList.add('coloring');
          editor.info.classList.add('open');
        }
        else {
          editor.el.classList.remove('coloring');
          editor.info.classList.remove('open');
        }
        return;
      }

      if (e.which == RESET) {
        var sel = window.getSelection();
        var range = sel.getRangeAt(0);

        var last = editor.el.lastChild;
        range.setEndAfter(last);

        var contents = range.extractContents();
        var text = document.createTextNode("\u200b" + contents.textContent);
        editor.el.appendChild(text);

        range.setStart(text, 1);
        range.setEnd(text, 1);
        return;
      }
    }

    else if (mods['ctrl'] && !mods['shift'] && !mods['meta']) {
      if (e.which == BOLD) {
        e.preventDefault();
        document.execCommand('bold');
        return;
      }
      if (e.which == INVERT) {
        e.preventDefault();
        var sel = window.getSelection();
        var range = sel.getRangeAt(0);
        var span = document.createElement('SPAN');
        span.appendChild(range.extractContents());
        span.classList.add('invert');
        range.insertNode(span);

        if (span.textContent == "") {
          span.textContent = "\u200b";
          range.setStart(span, 1);
          range.setEnd(span, 1);
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

    if (e.which == UP && !mods['ctrl'] && !mods['meta'] && !mods['shift']) {
      e.preventDefault();
      editor.history.up();

      var sel = window.getSelection();
      var range = sel.getRangeAt(0);
      var last = editor.el.lastChild;
      if (last) {
        range.setStartAfter(last);
        range.setEndAfter(last);
      }
      return;
    }

    if (e.which == DOWN && !mods['ctrl'] && !mods['meta'] && !mods['shift']) {
      e.preventDefault();
      editor.history.down();

      var sel = window.getSelection();
      var range = sel.getRangeAt(0);
      var last = editor.el.lastChild;
      if (last) {
        range.setStartAfter(last);
        range.setEndAfter(last);
      }
      return;
    }

    editor.history.reset();
  };

  editor.blur = function() {
    editor.focused = false;
  };

  editor.focus = function() {
    editor.focused = true;
    if (editor.range) {
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(editor.range);
    }
  };

  editor.save_selection = function() {
    var s = window.getSelection();
    if (s.rangeCount > 0)
      editor.range = s.getRangeAt(0);
    else
      editor.range = null;
  };

  editor.el.addEventListener("blur", editor.blur);
  editor.el.addEventListener("focus", editor.focus);
};
