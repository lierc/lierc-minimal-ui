class Editor {
  constructor (element) {
    this.el = element
    this.info = document.getElementById('color-info')
    this.completion = new Completion(element)
    this.focused = false
    this.coloring = false
    this.color = ''

    this.el.addEventListener('blur', this.blur)
    this.el.addEventListener('focus', this.focus)
  }

  static BOLD = 66
  static ITALIC = 73
  static UNDERLINE = 85
  static INVERT = 191
  static COLOR = 67
  static RESET = 79
  static TAB = 9

  static osx = window.navigator.userAgent.match(/Macintosh/)

  keydown (e, mods) {
    if (this.coloring) {
      if (e.which >= 48 && e.which <= 57) {
        var i = String(9 - (57 - e.which))
        this.color += i
        e.preventDefault()
      } else if (e.which == 188) {
        this.color += ','
        e.preventDefault()
      } else {
        this.coloring = false
        this.el.classList.remove('coloring')
        this.info.classList.remove('open')

        var seq = this.color
        var parts = seq.match(/^(?:([0-9]{1,2}),?([0-9]{1,2})?)?$/)
        this.color = ''

        if (parts === null) {
          alert("Invalid color sequence: '" + seq + "'")
          return
        }

        var sel = window.getSelection()
        var node = sel.focusNode
        var range = sel.getRangeAt(0)
        var span = document.createElement('SPAN')
        span.appendChild(range.extractContents())

        if (typeof (parts[1]) !== 'undefined') {
          var i = parts[1]
          var c = Format.color_map[parseInt(i)]

          if (typeof (c) === 'undefined') {
            alert("Invalid color '" + i + "' in sequence '" + seq + "'")
            return
          }

          span.style.color = c
          span.setAttribute('data-color-fg', i)

          if (typeof (parts[2]) !== 'undefined') {
            var i = parts[2]
            var c = Format.color_map[parseInt(i)]

            if (typeof (c) === 'undefined') {
              alert("Invalid color '" + i + "' in sequence '" + seq + "'")
              return
            }

            span.style.backgroundColor = c
            span.setAttribute('data-color-bg', i)
          }
        } else {
          span.style.color = '#000'
          span.style.backgroundColor = '#fff'
          span.setAttribute('data-color-reset', 1)
        }

        range.insertNode(span)

        if (span.textContent == '') {
          span.textContent = '\u200b'
          range.setStart(span, 1)
          range.setEnd(span, 1)
        }
      }
    } else if (mods['meta'] && !mods['shift'] && !mods['ctrl']) {
      if (e.which == COLOR) {
        this.coloring = !this.coloring
        if (this.coloring) {
          this.el.classList.add('coloring')
          this.info.classList.add('open')
        } else {
          this.el.classList.remove('coloring')
          this.info.classList.remove('open')
        }
        return
      }

      if (e.which == RESET) {
        var sel = window.getSelection()
        var range = sel.getRangeAt(0)

        var last = this.el.lastChild
        range.setEndAfter(last)

        var contents = range.extractContents()
        var text = document.createTextNode('\u200b' + contents.textContent)
        this.el.appendChild(text)

        range.setStart(text, 1)
        range.setEnd(text, 1)
        return
      }
    } else if (mods['ctrl'] && !mods['shift'] && !mods['meta']) {
      if (e.which == Editor.BOLD) {
        e.preventDefault()
        document.execCommand('bold')
        return
      }
      if (e.which == Editor.INVERT) {
        e.preventDefault()
        var sel = window.getSelection()
        var range = sel.getRangeAt(0)
        var span = document.createElement('SPAN')
        span.appendChild(range.extractContents())
        span.classList.add('invert')
        range.insertNode(span)

        if (span.textContent == '') {
          span.textContent = '\u200b'
          range.setStart(span, 1)
          range.setEnd(span, 1)
        }

        return
      }
      if (e.which == Editor.ITALIC) {
        e.preventDefault()
        document.execCommand('italic')
        return
      }
      if (e.which == Editor.UNDERLINE) {
        e.preventDefault()
        document.execCommand('underline')
        return
      }
    }

    if (e.which == Editor.TAB && !mods['ctrl']) {
      e.preventDefault()
      this.completion.complete()
      return
    }

    this.completion.stop()
  }

  blur () {
    this.focused = false
  }

  focus () {
    this.focused = true
  }
}
