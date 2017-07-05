var Editor = function(element) {
  var editor = this;

  var BOLD = 66;
  var ITALIC = 73;
  var UNDERLINE = 85;
  var INVERT = 191;
  var COLOR = 67;

  var TAB = 9;

  editor.el = element;
  editor.info = document.getElementById('color-info');
  editor.completion = new Completion(element);
  editor.focused = false;
  editor.coloring = false;
  editor.color = "";

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
          range.setStart(span, 0);
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