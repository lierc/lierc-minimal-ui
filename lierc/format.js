var Format = function(text) {
  function parse (acc, tokens) {
    if (tokens.length == 0)
      return acc;

    var token = tokens.shift();
    var head = acc[ acc.length - 1];
    var node = clone(head);

    switch (token.substring(0, 1)) {

    case "\x03":
      var colors = token.substring(1).split(",", 2);
      node.color = colors[0];
      node.background = colors[1];
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
      node.color = head.background
      node.background = head.color
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

  var split = /(\x03\d*(?:,\d+)?|\x0F|\x1D|\x1F|\x16|\x02)/;
  var tokens = text.split(split);
  var list = parse([make()], tokens);

  var spans = list.map(function(item) {
    var span = $('<span/>').text(item.text);

    if (item.background)
      span.css("background-color", color_map[item.background]);
    if (item.color)
      span.css("color", color_map[item.color]);
    if (item.bold)
      span.css("font-weight", "bold");
    if (item.italic)
      span.css("font-style", "italic");
    if (item.underline)
      span.css("text-decoration", "underline");

    return span;
  });

  return $('<span/>').append(spans);;
};
