class Unformat {
  static block = [
    'DIV'
  ]

  static tags = {
    'B': '\x02',
    'U': '\x1F',
    'I': '\x1D'
  }

  static invert = '\x16'

  static irc_text (html) {
    var parser = new DOMParser()
    var doc = parser.parseFromString(html, 'text/html')
    return Format.descend(doc, '')
  }

  static descend (node, string) {
    if (node.nodeType == 3) {
      string += node.textContent.replace(/^\u200b/, '')
    } else if (node.nodeType == 1 || node.nodeType == 9) {
      if (Unformat.block.indexOf(node.nodeName) != -1) {
        string += '\n'
      }
      if (Unformat.tags[node.nodeName]) {
        string += Unformat.tags[node.nodeName]
      }
      if (node.nodeType == 1) {
        if (node.classList && node.classList.contains('invert')) { string += Unformat.invert }
        if (node.hasAttribute('data-color-fg')) {
          string += '\x03' + node.getAttribute('data-color-fg')
          if (node.hasAttribute('data-color-bg')) {
            string += ',' + node.getAttribute('data-color-bg')
          }
        }
        if (node.hasAttribute('data-color-reset')) {
          string += '\x03'
        }
      }
      for (var i = 0; i < node.childNodes.length; i++) {
        string = Unformat.descend(node.childNodes[i], string)
      }
      if (Unformat.tags[node.nodeName]) {
        string += Unformat.tags[node.nodeName]
      }
    }
    return string
  }
}
