// The tab's icon shows whether anything is unread: its "#" turns powder
// blue for unread messages, and a red badge counts the unseen highlights and
// private messages, like Discord's. The background stays as it is.

const colors = {
  unread: "#b0e0e6", // powder blue
  badge: "#e5383b",
  badge_text: "#ffffff",
};

// favicon_state is the icon to show for the panels' unread state, plus
// background: what arrived in the focused panel while the window was in the
// background (which never marks that panel unread). state is "highlighted",
// "unread" or "none"; count is the unseen highlights and private messages.
// Events (panel.missed) don't count, and the highlights panel only repeats
// what its source panels already say.
export function favicon_state(panels, background) {
  let unread = background.unread;
  let count = background.highlights;
  for (const panel of panels) {
    if (panel.id == "highlights")
      continue;
    if (panel.unread)
      unread = true;
    count += panel.highlights || 0;
  }
  if (count > 0)
    return {state: "highlighted", count};
  return {state: unread ? "unread" : "none", count: 0};
}

// badge_label is count as the badge shows it.
export function badge_label(count) {
  return count > 99 ? "99+" : String(count);
}

// Favicon draws src with the unread colour once it has loaded, and points
// link at the image for the state shown, drawing each count's badge the
// first time it's needed. Until then, or if src can't be loaded or drawn,
// link keeps src.
export class Favicon {
  #link;
  #src;
  #unread = null; // canvas of the recoloured icon
  #images = new Map();
  #state = "none";
  #count = 0;

  constructor(link, src) {
    this.#link = link;
    this.#src = src;
    const img = new Image();
    img.addEventListener("load", () => {
      try {
        this.#unread = recolored(img, colors.unread);
        this.#images.set("unread", this.#unread.toDataURL("image/png"));
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

  show(state, count = 0) {
    if (state == this.#state && count == this.#count)
      return;
    this.#state = state;
    this.#count = count;
    this.#apply();
  }

  #apply() {
    if (!this.#link || !this.#unread)
      return;
    let href = this.#src;
    try {
      if (this.#state == "unread")
        href = this.#images.get("unread");
      else if (this.#state == "highlighted")
        href = this.#badged(badge_label(this.#count));
    }
    catch (e) {
      console.log("favicon: can't draw the badge", e);
    }
    if (this.#link.getAttribute("href") != href)
      this.#link.setAttribute("href", href);
  }

  #badged(label) {
    const key = `badge:${label}`;
    if (!this.#images.has(key))
      this.#images.set(key, badged(this.#unread, label));
    return this.#images.get(key);
  }
}

// badged is icon with a red pill holding label across its bottom, as a PNG
// data URL.
function badged(icon, label) {
  const w = icon.width;
  const h = icon.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(icon, 0, 0);

  const pill_h = Math.round(h * 0.6);
  const pad = Math.round(h * 0.1);
  let size = Math.round(pill_h * 0.85);
  const font = () => `bold ${size}px Arial, Helvetica, sans-serif`;
  ctx.font = font();
  while (size > 8 && ctx.measureText(label).width > w - pad * 2) {
    size--;
    ctx.font = font();
  }
  const pill_w = Math.min(w, Math.max(pill_h, ctx.measureText(label).width + pad * 2));
  const x = (w - pill_w) / 2;
  const y = h - pill_h;
  const r = pill_h / 2;

  ctx.fillStyle = colors.badge;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + pill_w - r, y);
  ctx.arc(x + pill_w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + pill_h);
  ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = colors.badge_text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, w / 2, y + r + size * 0.05);
  return canvas.toDataURL("image/png");
}

// recolored is img with its mark (the colour furthest from the background,
// which is the top left pixel's) turned into color, as a canvas.
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
    return canvas;

  const to = hex(color);
  const axis = [mark[0] - bg[0], mark[1] - bg[1], mark[2] - bg[2]];
  for (let i = 0; i < d.length; i += 4) {
    let t = ((d[i] - bg[0]) * axis[0] + (d[i + 1] - bg[1]) * axis[1] + (d[i + 2] - bg[2]) * axis[2]) / furthest;
    t = Math.min(1, Math.max(0, t));
    for (let c = 0; c < 3; c++)
      d[i + c] = Math.round(bg[c] + (to[c] - bg[c]) * t);
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

// hex is "#rrggbb" as [r, g, b].
function hex(color) {
  return [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
}
