// The themes in themes.css besides the default, each the class it puts on
// <body>. Shared by the app and the log search page.
export const themes = ["solarized-dark", "solarized", "slack", "slack-dark",
  "catppuccin-latte", "catppuccin-frappe", "catppuccin-macchiato",
  "catppuccin-mocha"];

// Puts the named theme's class on <body>; "default" or an unknown name
// leaves the default theme. The theme is also kept in localStorage, which
// an inline script at the top of each page's <body> reads to apply it
// before the first paint, instead of after the preferences load.
export function apply_theme(theme) {
  themes.forEach((t) => {
    document.body.classList.remove(t);
  });
  if (themes.indexOf(theme) != -1) {
    document.body.classList.add(theme);
  }
  update_theme_color();
  try {
    localStorage.setItem("theme", theme);
  }
  catch (e) {}
}

// Sets <meta name="theme-color"> to the theme's header colour, which
// browsers and in-app browser views use for their own toolbars.
export function update_theme_color() {
  const meta = document.querySelector('meta[name="theme-color"]');
  const color = getComputedStyle(document.body).getPropertyValue("--sidebar-bg").trim();
  if (meta && color)
    meta.setAttribute("content", color);
}
