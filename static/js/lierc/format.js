import { Emoji } from "./emoji.js";

export const Unformat = function(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
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
        string += `\x03${node.getAttribute('data-color-fg')}`;
        if (node.hasAttribute('data-color-bg')) {
          string += `,${node.getAttribute('data-color-bg')}`;
        }
      }
      if (node.hasAttribute('data-color-reset'))
        string += "\x03";
    }
    for (let i=0; i < node.childNodes.length; i++) {
      string = Unformat.descend(node.childNodes[i], string);
    }
    if (Unformat.tags[node.nodeName])
      string += Unformat.tags[node.nodeName];
  }
  return string;
};

Unformat.block = [
  "BR",
  "DIV",
];

Unformat.tags = {
  "B": "\x02",
  "U": "\x1F",
  "I": "\x1D"
};

Unformat.invert = "\x16";

export const Format = function(text) {
  const tokens = text.split(Format.token_re);

  return Format.parse([], tokens).filter((item) => {
    return item.text != "";
  }).map((item) => {
    const span = document.createElement('SPAN');
    span.textContent = item.text;

    if (item.background != null)
      span.style.backgroundColor = Format.color_map[parseInt(item.background)];
    if (item.color != null)
      span.style.color = Format.color_map[parseInt(item.color)];
    if (item.bold)
      span.style.fontWeight = "bold";
    if (item.italic)
      span.style.fontStyle = "italic";
    if (item.underline)
      span.style.textDecoration = "underline";

    return Format.linkify(span);
  });
};

Format.url_re = /https?:\/\/[^\s<"]*/ig;
Format.token_re = /(\x03\d{0,2}(?:,\d{1,2})?|\x0F|\x1D|\x1F|\x16|\x02)/;

Format.emojify = function(node) {
  const tmp = document.createElement('SPAN');
  if ( node.nodeName != '#text' ) {
    return node;
  }
  if (node.nodeValue && Emoji.regex.test(node.nodeValue)) {
    const chars = node.nodeValue.match(Emoji.regex);
    const span = document.createElement("SPAN");
    tmp.textContent = node.nodeValue;
    let escaped = tmp.innerHTML;

    for (let j=0; j < chars.length; j++) {
      const title = Emoji.names[chars[j]];
      escaped = escaped.replace(new RegExp(chars[j], 'g'), `<span class="emoji" title="${title}">${chars[j]}</span>`);
    }
    span.innerHTML = escaped;
    return span;
  }
  return node;
};

Format.linkify = function(elem) {
  const children = elem.childNodes;
  const length = children.length;

  for (let i=0; i < length; i++) {
    const node = children[i];
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
      const replace = [];
      const text = node.nodeValue;
      let match;
      let pos = 0;

      while ((match = Format.url_re.exec(text)) !== null) {
        let url = match[0];
        const i = match.index;
        const before = text.substring(pos, i);
        let after;

        if ( i > 0 && before[ i - 1 ] == '(' && url[ url.length - 1 ] == ')' ) {
          url = url.substring(0, url.length - 1);
          after = ')';
        }

        const link = document.createElement('A');
        link.setAttribute('href', url);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noreferrer');
        link.textContent = url;

        replace.push(document.createTextNode(before));
        replace.push(link);
        if (after) {
          replace.push(document.createTextNode(after));
        }

        pos = Format.url_re.lastIndex;
      }

      if ( pos < text.length ) {
        replace.push(document.createTextNode(text.substring(pos)));
      }

      const p = node.parentNode;
      if ( replace.length ) {
        let n = Format.emojify(replace.pop());
        p.replaceChild(n, node);

        let o;
        while ( o = replace.pop() ) {
          o = Format.emojify(o);
          p.insertBefore( o, n );
          n = o;
        }
      }
      else {
        p.replaceChild(Format.emojify(node), node);
      }
    }
    else if (node.nodeValue) {
      node.parentNode.replaceChild(Format.emojify(node), node);
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

  const token = tokens.shift();
  const head = acc.length ? acc[ acc.length - 1] : Format.make();
  let node = Format.clone(head);

  switch (token.substring(0, 1)) {

  case "\x03": {
    const colors = token.substring(1).split(",", 2);
    node.color = colors[0];
    node.background = colors[1];
    break;
  }

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


