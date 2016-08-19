(function() {

var c = document.createElement('SPAN');
var t = document.createTextNode("\u{1f4af}");

c.appendChild(t);

c.style.position = "absolute";
c.style.top = "-1000px";
c.style.display = "inline-block";
c.style.font = "sans-serif";

document.body.appendChild(c);
var target_width = 64 * 2;
var w = 0, h = 0, size = 0;

while (w < target_width) {
  size++;
  c.style.fontSize = size + "px";
  c.style.lineHeight = size + "px";
  
  w = c.offsetWidth;
  h = c.offsetHeight;
}

if (w > target_width) {
  size--;
  c.style.fontSize = size + "px";
  c.style.lineHeight = size + "px";
  
  w = c.offsetWidth;
  h = c.offsetHeight;
}

document.body.removeChild(c);

var canvas = document.createElement('CANVAS');
canvas.width = w;
canvas.height = h;
canvas.style.position = "absolute";
canvas.style.top = "-1000px";
document.body.appendChild(canvas);

var context = canvas.getContext('2d');
context.font = size + "px sans-serif";
context.textBaseline = "top"
context.fillText(t.nodeValue,0,0);
var png = canvas.toDataURL("image/png");

document.body.removeChild(canvas);

var link = document.querySelector("link[rel=icon]");

if (! link) {
  link = document.createElement("LINK");
  document.head.appendChild(link);
}

link.rel = "icon";
link.href = png;

})();
