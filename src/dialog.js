class Dialog {
  constructor (template, vars) {
    this.open = false
    this.el = document.createElement('DIV')
    this.el.classList.add('overlay')
    this.el.innerHTML = Handlebars.templates[template](vars)
    this.listen()
  }

  append (p) {
    this.open = true
    p.appendChild(this.el)
  }

  close () {
    this.open = false
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el)
    }
  }

  listen () {
    ['click', 'touchstart'].forEach( type => {
      this.el.addEventListener(type, e => {
        if (!e.target.matches('.overlay, .close')) {
          return
        }
        e.preventDefault()
        this.close()
      })
    })
  }
}
