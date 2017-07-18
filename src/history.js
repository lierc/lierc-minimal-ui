class History {
  static EMPTY = ''

  constructor (element) {
    this.el = element
    this.limit = 10
    this.history = []

    this.index = null
    this.current = null
  }

  up () {
    var history = this.history.concat(this.tail())

    if (index === null) {
      index = 0
    } else if (++index >= history.length) {
      index = 0
    }

    this.el.value = history[index]
  }

  tail (rev) {
    var current = this.current()
    var tail = [History.EMPTY]

    if (current != History.EMPTY) { tail.push(current) }

    return tail
  }

  current () {
    if (current === null) {
      current = this.el.value
    }
    return current
  }

  reset () {
    current = null
    index = null
  }

  down () {
    var history = this.history.concat(this.tail(true))

    if (index === null) {
      index = 0
    } else if (--index < 0) {
      index = history.length - 1
    }

    this.el.value = history[index]
  }

  record () {
    this.history.unshift(this.el.value)
    current = null
    if (this.history.length > this.limit) {
      this.history = this.history.slice(0, this.limit)
    }
  }
}
