export const Embed = {
  patterns: []
};

let embed_id = 0;

Embed.embed_all = function(els, panel) {
  els.forEach((el) => {
    const links = el.querySelectorAll('.message-text a[href]:not(.processed)');
    links.forEach((link) => {
      Embed.embed(link, panel);
    });
  });
};

Embed.embed = async function(a, panel) {
  const href = a.href;
  const id = embed_id++;

  for (let i=0; i < Embed.patterns.length; i++) {
    if (Embed.patterns[i].test(href)) {
      const url = `//noembed.com/embed?url=${encodeURIComponent(href)}&maxwidth=450`;

      a.classList.add("processed");

      const response = await fetch(url);
      if (!response.ok)
        throw Error(response.statusText);
      const res = await response.json();

      if (! res.error) {
        panel.scroll(() => {
          const toggle = document.createElement('SPAN');
          res['id'] = `embed-${String(id)}`;
          toggle.setAttribute('data-embed', JSON.stringify(res));
          toggle.setAttribute('data-embed-id', res['id']);
          toggle.setAttribute("class", "embed-toggle");
          toggle.setAttribute("aria-hidden", "true");
          a.parentNode.insertBefore(toggle, a.nextSibling);
          panel.embed(a, res);
        });
      }

      return;
    }
  }
};

Embed.load = async function() {
  const response = await fetch("//noembed.com/providers");
  if (! response.ok)
    throw Error(response.statusText);
  const res = await response.json();

  for (const provider in res) {
    const p = res[provider].patterns;
    for (let i=0; i < p.length; i++) {
      Embed.patterns.push(new RegExp(p[i]));
    }
  }
};

Embed.load();
