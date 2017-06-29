var Unformat = function(html) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, "text/html");
  return Unformat.descend(doc, "");
};

Unformat.descend = function(node, string) {
  if (node.nodeType == 3) {
    string += node.textContent;
  }
  else if (node.nodeType == 1 || node.nodeType == 9) {
    if (Unformat.block.indexOf(node.nodeName) != -1)
      string += "\n";
    if (Unformat.tags[node.nodeName])
      string += Unformat.tags[node.nodeName];
    if (node.nodeType == 1) {
      if (node.classList && node.classList.contains('invert'))
        string += Unformat.invert;
      if (node.hasAttribute('data-color-fg')) {
        string += "\x03" + node.getAttribute('data-color-fg');
        if (node.hasAttribute('data-color-bg')) {
          string += "," + node.getAttribute('data-color-bg');
        }
      }
      if (node.hasAttribute('data-color-reset'))
        string += "\x03";
    }
    for (var i=0; i < node.childNodes.length; i++) {
      string = Unformat.descend(node.childNodes[i], string);
    }
    if (Unformat.tags[node.nodeName])
      string += Unformat.tags[node.nodeName];
  }
  return string;
};

Unformat.block = [
  "DIV",
];

Unformat.tags = {
  "B": "\x02",
  "U": "\x1F",
  "I": "\x1D"
};

Unformat.invert = "\x16";

var Format = function(text) {
  var tokens = text.split(Format.token_re);

  return Format.parse([], tokens).filter(function(item) {
    return item.text != "";
  }).map(function(item) {
    var span = document.createElement('SPAN');
    span.textContent = item.text;

    if (item.background != null)
      span.style.backgroundColor = Format.color_map[item.background];
    if (item.color != null)
      span.style.color = Format.color_map[item.color];
    if (item.bold)
      span.style.fontWeight = "bold";
    if (item.italic)
      span.style.fontStyle = "italic";
    if (item.underline)
      span.style.textDecoration = "underline";

    return Format.linkify(span);
  });
};

Format.url_re = /(https?:\/\/[^\s<"]*)/ig;
Format.token_re = /(\x03\d{0,2}(?:,\d{1,2})?|\x0F|\x1D|\x1F|\x16|\x02)/;

Format.linkify = function(elem) {
  var children = elem.childNodes;
  var length = children.length;
  var tmp = document.createElement('SPAN');

  for (var i=0; i < length; i++) {
    var node = children[i];
    if (node.nodeName == "A") {
      continue;
    }
    else if (node.nodeName != "#text") {
      Format.linkify(node);
      continue;
    }
    if (node.nodeValue === null) {
      continue;
    }
    if (!node.nodeValue) {
      console.log(node);
    }
    if (node.nodeValue && node.nodeValue.match(Format.url_re)) {
      var span = document.createElement("SPAN");
      tmp.textContent = node.nodeValue;
      var escaped = tmp.innerHTML;
      span.innerHTML = escaped.replace(
        Format.url_re, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
      node.parentNode.replaceChild(span, node);
      node = span;
    }
    if (node.nodeValue && Emoji.regex.test(node.nodeValue)) {
      var chars = node.nodeValue.match(Emoji.regex);
      var span = document.createElement("SPAN");
      tmp.textContent = node.nodeValue;
      var escaped = tmp.innerHTML;

      for (var j=0; j < chars.length; j++) {
        var title = Emoji.names[chars[j]];
        escaped = escaped.replace(new RegExp(chars[j], 'g'), '<span title="'+title+'">' + chars[j] + '</span>');
      }
      span.innerHTML = escaped;
      node.parentNode.replaceChild(span, node);
    }
  }

  return elem;
};

Format.make = function() {
  return {
    text: "",
    color: null,
    background: null,
    bold: false,
    italic: false,
    underline: false,
  };
};

Format.clone = function(node) {
  return {
    text: "",
    color: node.color,
    background: node.background,
    bold: node.bold,
    italic: node.italic,
    underline: node.underline,
  };
};

Format.color_map = [
  "white",
  "black",
  "navy",
  "green",
  "red",
  "maroon",
  "purple",
  "olive",
  "yellow",
  "lightgreen",
  "teal",
  "cyan",
  "royalblue",
  "magenta",
  "gray",
  "lightgray"
];

Format.parse = function(acc, tokens) {
  if (tokens.length == 0)
    return acc;

  var token = tokens.shift();
  var head = acc.length ? acc[ acc.length - 1] : Format.make();
  var node = Format.clone(head);

  switch (token.substring(0, 1)) {

  case "\x03":
    var colors = token.substring(1).split(",", 2);
    node.color = colors[0];
    node.background = colors[1];
    break;

  case "\x02":
    node.bold = ! head.bold;
    break;

  case "\x0F":
    node = Format.make();
    break;

  case "\x1D":
    node.italic = ! head.italic;
    break;

  case "\x1F":
    node.underline = ! head.underline;
    break;

  case "\x16":
    node.color = head.background === null ? 0 : head.background;
    node.background = head.color === null ? 1 : head.color;
    break;

  default:
    node.text += token;
  };

  acc.push(node);
  return Format.parse(acc, tokens);
};


