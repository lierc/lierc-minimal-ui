# CSS refactor: readable rules, one-block themes

## Why

`static/css/lierc.css` (about 2,200 lines) is hard to read and hard to theme.
Rules for one part of the UI are spread across the file, selectors repeat
(`#panel ol li.chat…` dozens of times), and a theme is 31 scattered
`body.solarized…` / `body.solarized-dark…` overrides, one per element that
differs. Changing a theme means finding all of them; adding one means writing
all of them again.

The goal is CSS that is easier to read and theming that is simpler: a theme is
one short block of colour variables, and nothing else in the stylesheet knows
which theme is active.

## Goals

- A theme is a single block of custom properties. Default lives on `:root`;
  `body.solarized` and `body.solarized-dark` redefine the same names. No rule
  outside those blocks mentions a theme.
- Rules are grouped by area of the UI and written with native CSS nesting, so
  each component reads top to bottom in one place, mobile adjustments included.
- Every hardcoded colour is replaced by a named variable.

## Non-goals

- No visual change. Every theme, the mobile layout and the search page look
  exactly as they do now. That includes today's quirks: dialogs, popups, the
  emoji picker and the nick popup stay white in every theme.
- No new themes, no dark-mode auto-detection, no user-picked colours.
- No change to how themes are switched: `app.js` `set_theme()` keeps adding
  `solarized` / `solarized-dark` to `<body>`, default is no class.
- No JS or HTML restructuring beyond the extra `<link>`. Class names and IDs
  stay as they are, since the JS builds and queries them.
- `index.html` and `unsubscribe/index.html` don't load `lierc.css` and are
  untouched.

## Anti-goals

- Any visible change in any theme is a bug, even an improvement.
- A build step of any kind (Sass, PostCSS, bundling). The files the browser
  loads are the files in the repo.
- `@import` between stylesheets: `bin/cache-bust` only versions `<link>` URLs
  in HTML, so imported files would be served stale after deploys, and imports
  load serially.

## Constraints

- Browser floor: native CSS nesting (Safari 17.2+, Chrome 120+, Firefox
  117+). Agreed. The file already needs `:has()`.
- `search/index.html` loads `lierc.css` followed by `search.css`, which
  overrides some of its rules (`.flex-wrap-left`, `#status`, …). The search
  page must look the same, so selectors and specificity that `search.css`
  relies on must survive. `search.css` itself is out of scope.
- Deploys run `make bust`, which versions every `/static/` link in the four
  HTML files.

## Approaches considered

1. **One file, reorganised.** Theme blocks at the top, sections by area below.
   No HTML change, but still one long file.
2. **`themes.css` plus `lierc.css`.** *Chosen.* `themes.css` holds the
   Solarized palette and the three theme blocks; `lierc.css` holds the rules.
   Editing or adding a theme means touching one short file. Costs one extra
   `<link>` in `app/index.html` and `search/index.html`.
3. **One file per UI area (8–10 files).** Easy to navigate by area, but every
   file needs a `<link>` in both pages, and cross-area pieces (the panel and
   row colours the reaction button uses) end up split. Too much ceremony for
   ~1,500 lines.

`@import` from one entry file was ruled out (see anti-goals).

## Design

### Files

- `static/css/themes.css`, linked before `lierc.css` in `app/index.html`
  and `search/index.html`:
  1. The Solarized palette (`--base03` … `--green`), unchanged.
  2. Theme-independent named colours (see below).
  3. `:root` default theme block, then `body.solarized` and
     `body.solarized-dark` blocks redefining the same theme variables.
- `static/css/lierc.css`: everything else, no theme selectors.

### Variables

Two kinds:

- **Theme variables**: values that differ between themes. Every theme
  block sets every one of them, so a new theme is a copy of a block. The
  starting set comes from today's 31 overrides, which collapse into a handful
  of roles. For example:
  - the message area background (today `--panel-bg`: `#fff` / `--base3` /
    `--base02`), which the date separator, the last-read marker and the
    nick-list toggle's hover state also use;
  - the bar background shared by the topic, the nick-list toggle and (in
    solarized) the footer;
  - the input's background, border and focus ring;
  - text and muted text in the message area and nick list;
  - embed and image borders and their hover colour;
  - the reaction chip colours.
- **Fixed named colours**: the same in every theme (the white popups and
  dialogs, `#ffa130` warning orange, focus-ring blues, the greys). They get a
  name and are defined once, outside the theme blocks. Making one of them
  follow the theme later is a matter of moving it into the theme blocks.

Where default and a theme differ only by "no value" (e.g. the default footer
and topic have no background, solarized sets one), the default block uses the
value that renders identically (`transparent`, or the colour that's
showing through).

`--row-bg` (set per message row) and the reaction button's layered background
stay as they work today.

### Rule organisation

`lierc.css` is split into commented sections in this order: base (html, body,
fonts, links), layout (flex wrappers), sidebar and nav, header, topic and
channel meta/nick list, message list and rows, embeds and images, reactions
and message controls, input and footer, popups (emoji, upload, nick popup),
dialogs and overlays, help. Mobile rules move out of the end-of-file
`@media (max-width: 800px)` block into the component they adjust, as nested
`@media` blocks.

Nesting mirrors the DOM/state: e.g. `#panel ol li.chat { … &.self { … }
&.highlight { … } &:hover { … } }`.

### Tidying that is in scope

These change nothing visible and are part of the refactor:

- The five copies of the system font stack and three of the monospace stack
  become `--font-ui` / `--font-mono`.
- Duplicate and split rules merge (`.flex-wrap-left header h1` twice, the nav
  rules in three places, `#toggle-nicks` setting `color` twice).
- Invalid declarations that browsers already ignore are removed: the dangling
  `padding` in `#panel ol li.info`, `text-left: right` in
  `.overlay .submit-group`.
- The commented-out `.consecutive` block is removed.

Two selectors are global by accident: `.nick-popup h3, p` styles every `p`,
and `.help dt, dd` styles every `dd`. They stay global (the look must not
change) but are written as explicit `p` / `dd` rules with a comment saying so.

### Pitfalls the builder must watch

- **Nesting under selector lists changes specificity.** A nested rule
  behaves like `:is(…)`, whose specificity is that of its most specific
  member: nesting under `.a, #b` gives the `.a` branch ID specificity. Only
  nest under a list when the members have equal specificity, or the cascade
  changes.
- **Source order.** Regrouping moves rules. Where two rules of equal
  specificity hit the same element (base rules vs the mobile media block, the
  `#emoji:before` / `:hover:before` pairs, the row tints, where
  `li.chat.self` beats `li.chat:hover` only by coming later), the winner must
  stay the same.
- `!important` stays where it is (10 uses). Removing it is out of scope.

## Verification

"Looks exactly the same" is checked mechanically, not by eye:

- Build a static fixture page from `app/index.html`'s markup, plus a
  representative message list: plain, self, highlight, focused/search,
  connect/disconnect, info, event, raw, monospace runs, date separator,
  last-read and lastlog markers, embed with and without thumbnail, image,
  reactions (own and others'), message controls with the emoji popup open,
  and open dialogs, the upload popup, the nick popup and the help screen.
  The fixture also covers the search page's markup.
- For each of default, `solarized` and `solarized-dark`, at desktop width
  and at 390px (mobile), and with hover/open states forced where they matter,
  compare `getComputedStyle` for every element (and `::before` / `::after`)
  between the old CSS and the new CSS. Any difference is a bug unless it
  provably renders the same (e.g. `transparent` vs no background over the same
  parent), and each such case is listed in the commit message.
- Screenshots of the same states, old vs new, as a second check.

This needs a headless browser. Nothing is installed today: no Chromium, and no
Playwright. Getting one (e.g. `npx playwright install chromium`, kept out of
the repo) needs the user's OK first. The user's own Chrome via the
claude-in-chrome tool is the fallback.

The fixture and comparison script are throwaway tooling and are not committed.

## Left to the builder

- Exact variable names and the final split between theme and fixed variables.
- Section comments, ordering within sections, formatting style.
- How far nesting goes. Readability decides, not depth for its own sake.
- Fixture contents beyond the list above.
