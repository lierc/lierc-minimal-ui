class Embed {
  static patterns = []
  static embed_id = 0

  static embed_all (els, panel) {
    els.forEach( el => {
      el.querySelectorAll('.message-text a[href]').forEach( link => {
        Embed.embed(link, panel)
      })
    })
  }

  static embed (a, panel) {
    var href = a.href
    var id = embed_id++

    for (var i = 0; i < Embed.patterns.length; i++) {
      if (Embed.patterns[i].test(href)) {
        var url = '//noembed.com/embed?url=' +
          encodeURIComponent(href) + '&maxwidth=450'

        fetch(url).then( res => {
          if (!res.ok) {
            throw Error(res.statusText)
          }
          return res.json()
        }).then( res => {
          if (!res.error) {
            panel.scroll( () => {
              var toggle = document.createElement('SPAN')
              res['id'] = 'embed-' + String(id)
              toggle.setAttribute('data-embed', JSON.stringify(res))
              toggle.setAttribute('data-embed-id', res['id'])
              toggle.setAttribute('class', 'embed-toggle')
              toggle.setAttribute('aria-hidden', 'true')
              a.parentNode.insertBefore(toggle, a.nextSibling)
              panel.embed(a, res)
            })
          }
        })

        return
      }
    }
  }

  load () {
    fetch('//noembed.com/providers').then( res => {
      if (!res.ok) {
        throw Error(res.statusText)
      }
      return res.json()
    }).then( res => {
      for (provider in res) {
        var p = res[provider].patterns
        for (var i = 0; i < p.length; i++) {
          Embed.patterns.push(new RegExp(p[i]))
        }
      }
    })
  }
}

Embed.load()
