// The themes in themes.css besides the default, each the class it puts on
// <body>. Shared by the app and the log search page.
export const themes = ["solarized-dark", "solarized", "slack", "slack-dark",
  "catppuccin-latte", "catppuccin-frappe", "catppuccin-macchiato",
  "catppuccin-mocha"];

// Puts the named theme's class on <body>; "default" or an unknown name
// leaves the default theme.
export function apply_theme(theme) {
  themes.forEach((t) => {
    document.body.classList.remove(t);
  });
  if (themes.indexOf(theme) != -1) {
    document.body.classList.add(theme);
  }
}
