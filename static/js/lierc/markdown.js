var Markdown = function(src) {
  var bold = /^\*([\s\S]+?)\*(?!\*)/;
  var italic = /^_([\s\S]+?)_(?!_)/;
  var text = /^[\s\S]+?(?=[\\<!\[_*`]|$)/;
  var out = "";

  while (src) {
    if (cap = italic.exec(src)) {
      src = src.substring(cap[0].length);
      out += "\x1D" + cap[1] +"\x1D";
      continue;
    }

    if (cap = bold.exec(src)) {
      src = src.substring(cap[0].length);
      out += "\x02" + cap[1] + "\x02";
      continue;
    }

    if (cap = text.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[0];
      continue;
    }

    if (src) {
      throw new Error("Infinite loop");
    }
  }

  return out;
};
