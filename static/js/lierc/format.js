var Unformat = function(html) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, "text/html");
  var block = [
    "DIV",
  ];
  var tags = {
    "B": "\x02",
    "U": "\x1F",
    "I": "\x1D"
  };
  var invert = "\x16";

  function descend(node, string) {
    if (node.nodeType == 3) {
      string += node.textContent;
    }
    else if (node.nodeType == 1 || node.nodeType == 9) {
      if (block.indexOf(node.nodeName) != -1)
        string += "\n";
      if (tags[node.nodeName])
        string += tags[node.nodeName];
      if (node.classList && node.classList.contains('invert'))
        string += invert;
      for (var i=0; i < node.childNodes.length; i++) {
        string = descend(node.childNodes[i], string);
      }
      if (tags[node.nodeName])
        string += tags[node.nodeName];
    }
    return string;
  };

  return descend(doc, "");
};

var Format = function(text) {
  function parse (acc, tokens) {
    if (tokens.length == 0)
      return acc;

    var token = tokens.shift();
    var head = acc.length ? acc[ acc.length - 1] : make();
    var node = clone(head);

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
      node = make();
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
    return parse(acc, tokens);
  };

  var color_map = [
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

  function make() {
    return {
      text: "",
      color: null,
      background: null,
      bold: false,
      italic: false,
      underline: false,
    };
  }

  function clone(node) {
    return {
      text: "",
      color: node.color,
      background: node.background,
      bold: node.bold,
      italic: node.italic,
      underline: node.underline,
    };
  }

  var split = /(\x03\d{0,2}(?:,\d{1,2})?|\x0F|\x1D|\x1F|\x16|\x02)/;
  var tokens = text.split(split);
  if (tokens.length == 1)
    return [document.createTextNode(text)];

  return parse([], tokens).filter(function(item) {
    return item.text != "";
  }).map(function(item) {
    var span = document.createElement('SPAN');
    span.textContent = item.text;

    if (item.background != null)
      span.style.backgroundColor = color_map[item.background];
    if (item.color != null)
      span.style.color = color_map[item.color];
    if (item.bold)
      span.style.fontWeight = "bold";
    if (item.italic)
      span.style.fontStyle = "italic";
    if (item.underline)
      span.style.textDecoration = "underline";

    return span;
  });
};
