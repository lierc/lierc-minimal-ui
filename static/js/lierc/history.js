const EMPTY = "";

export class History {
  #index = null;
  #current = null;

  constructor(element) {
    this.el = element;
    this.limit = 10;
    this.history = [];
  }

  up() {
    var history = this.history.concat(this.tail());

    if (this.#index === null) {
      this.#index = 0;
    }
    else if (++this.#index >= history.length) {
      this.#index = 0;
    }

    this.el.innerHTML = history[this.#index];
  }

  tail(rev) {
    var current = this.current();
    var tail = [EMPTY];

    if (current != EMPTY)
      tail.push(current);

    return tail;
  }

  current() {
    if (this.#current === null) {
      this.#current = this.el.innerHTML;
    }
    return this.#current;
  }

  reset() {
    this.#current = null;
    this.#index = null;
  }

  down() {
    var history = this.history.concat(this.tail(true));
    
    if (this.#index === null) {
      this.#index = 0;
    }
    else if (--this.#index < 0) {
      this.#index = history.length - 1;
    }

    this.el.innerHTML = history[this.#index];
  }

  record() {
    this.history.unshift(this.el.innerHTML);
    this.#current = null;
    if (this.history.length > this.limit)
      this.history = this.history.slice(0, this.limit);
  }
}
