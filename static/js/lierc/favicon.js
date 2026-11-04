// The tab's icon shows whether anything is unread: its "#" turns blue for
// unread messages, and red when any of them is a highlight or a private
// message. The background stays as it is.

const colors = {
  unread: "#b0e0e6", // powder blue
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

// Favicon draws src with each state's colour once it has loaded, and points
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
          unread: recolored(img, colors.unread),
          highlighted: recolored(img, colors.highlighted),
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

// recolored is img with its mark (the colour furthest from the background,
// which is the top left pixel's) turned into color, as a PNG data URL.
// Each pixel keeps how far it lies from the background towards the mark,
// so anti-aliased edges stay smooth and the background is unchanged.
function recolored(img, color) {
  const w = img.naturalWidth || 64;
  const h = img.naturalHeight || 64;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;

  const bg = [d[0], d[1], d[2]];
  let mark = bg;
  let furthest = 0;
  for (let i = 0; i < d.length; i += 4) {
    const dist = (d[i] - bg[0]) ** 2 + (d[i + 1] - bg[1]) ** 2 + (d[i + 2] - bg[2]) ** 2;
    if (dist > furthest) {
      furthest = dist;
      mark = [d[i], d[i + 1], d[i + 2]];
    }
  }
  if (furthest == 0)
    return canvas.toDataURL("image/png");

  const to = hex(color);
  const axis = [mark[0] - bg[0], mark[1] - bg[1], mark[2] - bg[2]];
  for (let i = 0; i < d.length; i += 4) {
    let t = ((d[i] - bg[0]) * axis[0] + (d[i + 1] - bg[1]) * axis[1] + (d[i + 2] - bg[2]) * axis[2]) / furthest;
    t = Math.min(1, Math.max(0, t));
    for (let c = 0; c < 3; c++)
      d[i + c] = Math.round(bg[c] + (to[c] - bg[c]) * t);
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

// hex is "#rrggbb" as [r, g, b].
function hex(color) {
  return [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
}
