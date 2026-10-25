import { Template } from "./template.js";

export class Dialog {
  constructor(template, vars) {
    this.open = false;
    this.el = document.createElement('DIV');
    this.el.classList.add('overlay');
    this.el.innerHTML = Template(template, vars);

    this.listen();
  }

  append(p) {
    this.open = true;
    p.appendChild(this.el);
  }

  close() {
    this.open = false;
    if (this.el.parentNode)
      this.el.parentNode.removeChild(this.el);
  }

  
  listen() {
    var self = this;
    ['click', 'touchstart'].forEach(function(type) {
      self.el.addEventListener(type, function(e) {
        if (!e.target.matches(".overlay, .close"))
          return;
        e.preventDefault();
        self.close();
      });
    });
  }
}
