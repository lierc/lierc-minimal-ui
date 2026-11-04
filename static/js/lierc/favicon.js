// The tab's icon shows whether anything is unread: a blue dot for unread
// messages, a red one when any of them is a highlight or a private
// message.

const colors = {
  unread: "#2f80ed",
  highlighted: "#e5383b",
};

// favicon_state is "highlighted", "unread" or "none" for the panels'
// unread state, plus background: what arrived in the focused panel while
// the window was in the background (which never marks that panel unread).
// Events (panel.missed) don't count, and the highlights panel only repeats
// what its source panels already say.
export function favicon_state(panels, background) {
  let unread = background.unread;
  let highlighted = background.highlighted;
  for (const panel of panels) {
    if (panel.id == "highlights")
      continue;
    if (panel.highlighted || (panel.unread && panel.type == "private"))
      highlighted = true;
    if (panel.unread)
      unread = true;
  }
  if (highlighted)
    return "highlighted";
  return unread ? "unread" : "none";
}

// Favicon draws src with each state's dot once it has loaded, and points
// link at the image for the state shown. Until then, or if src can't be
// loaded or drawn, link keeps src.
export class Favicon {
  #link;
  #src;
  #images = null;
  #state = "none";

  constructor(link, src) {
    this.#link = link;
    this.#src = src;
    const img = new Image();
    img.addEventListener("load", () => {
      try {
        this.#images = {
          none: src,
          unread: dotted(img, colors.unread),
          highlighted: dotted(img, colors.highlighted),
        };
      }
      catch (e) {
        console.log("favicon: can't draw the icon", e);
        return;
      }
      this.#apply();
    });
    img.addEventListener("error", () => console.log(`favicon: can't load ${src}`));
    img.src = src;
  }

  show(state) {
    if (state == this.#state)
      return;
    this.#state = state;
    this.#apply();
  }

  #apply() {
    if (!this.#link || !this.#images)
      return;
    const href = this.#images[this.#state] || this.#src;
    if (this.#link.getAttribute("href") != href)
      this.#link.setAttribute("href", href);
  }
}

// dotted is img with a dot of color, in a white ring, at its bottom right,
// as a PNG data URL.
function dotted(img, color) {
  const size = img.naturalWidth || 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, size, size);

  const r = size * 0.2;
  const ring = size * 0.05;
  const c = size - r - ring;
  ctx.beginPath();
  ctx.arc(c, c, r + ring, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  return canvas.toDataURL("image/png");
}
