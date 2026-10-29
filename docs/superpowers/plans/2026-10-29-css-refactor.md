# CSS Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `static/css/lierc.css` into `themes.css` (palette and one block per theme) and a reorganised, nested `lierc.css`, with no visible change in any theme.

**Architecture:** A throwaway headless-Chromium harness compares computed styles (and screenshots) of a fixture page between the CSS as of `b64d333` and the working tree. Every refactor task ends with the harness reporting zero differences. The refactor itself runs in four steps: theme overrides become variables, the remaining literals become variables, then rules are regrouped, then they are nested.

**Tech Stack:** Plain CSS with native nesting; Node + Playwright `1.49.1` (Chromium headless shell) for verification only; Python `http.server` to serve the repo.

**Spec:** `docs/superpowers/specs/2026-10-29-css-refactor-design.md`

## Global Constraints

- No visible change in any theme (default, `solarized`, `solarized-dark`), on the mobile layout (≤800px) or on the search page. The harness reporting zero differences is the bar.
- No build step, no `@import`. Browser floor: native CSS nesting (Safari 17.2+, Chrome 120+, Firefox 117+).
- Theme switching is unchanged: `app.js` `set_theme()` adds `solarized` / `solarized-dark` to `<body>`, and default is no class.
- Class names and IDs are unchanged. JS and HTML are unchanged except for the new `<link>`.
- `themes.css` is linked immediately before `lierc.css` in `app/index.html` and `search/index.html`. `search.css` stays after `lierc.css`.
- `!important` stays where it is.
- The harness, fixture and screenshots are throwaway and never committed. They live in `$V=/tmp/claude-1000/-home-leedo-src-relaychat-infra/bc49a4b0-19a7-4f2a-b363-de2d88710f78/scratchpad/css-verify`.
- Commits go to lierc-minimal-ui `master` locally. Pushing, `make bust` for deploy, and the relaychat-infra bump happen only when the user asks.

## Review Focus

- **Nesting under selector lists** silently raises the specificity of the less specific members (`:is()` semantics). Covered by the harness's full-state matrix; Task 5's review also greps for nested rules under comma lists whose members' specificities differ.
- **`@media (display-mode: standalone)`** (`.remove-blur`) never matches in headless Chromium. The harness's `standalone` variant rewrites that query to `@media all` in both baseline and candidate (Task 1).
- **The hi-DPI font-smoothing query** matches only at `deviceScaleFactor: 2`. The harness runs one pass at DPR 2 (Task 1).
- **JS-applied state classes** absent from a plain fixture (`.filtering`, `.dragging`, `ol.loading`, `li.loading.loaded`, `.coloring`, `.disabled`, `body.disconnected`, `.hide-events`, `.hide-embeds`, `.send-typing`, `.show-nicklist`, `[data-panel-type=channel]`, `#topic.expanded`, `.flex-wrap.open`, `#switcher-wrap.open`, `.embed-wrap.open`, `.message-controls.open`, `.message-react.open`, `#emoji.open`, `#upload.open`, `#color-info.open`) are set by the fixture's states (Task 1).
- **The search page's `search.css` overrides** rely on `lierc.css` selectors keeping their specificity. The fixture's search page loads both, in the real order (Task 1).

---

### Task 1: Verification harness

**Files (all throwaway, under `$V`):**
- Create: `$V/package.json` (Playwright `1.49.1` only)
- Create: `$V/baseline/lierc.css`, a copy of `git show b64d333:static/css/lierc.css`
- Create: `$V/fixture/app.html`, `$V/fixture/search.html`
- Create: `$V/compare.mjs`

**Interfaces:**
- Produces: `node $V/compare.mjs` (serves the repo plus `$V` over `http://127.0.0.1:8765` with `python3 -m http.server`, started and stopped by the script). It prints one line per difference (`page state theme width element-path[::pseudo] property: baseline → candidate`) and a total, writes screenshots to `$V/shots/{baseline,candidate}/…png`, and exits 0 only when there are no differences.
- The candidate stylesheet list is `/static/css/themes.css` (if present) followed by `/static/css/lierc.css` from the repo. The baseline list is `$V/baseline/lierc.css`. Both are preceded by the three Font Awesome sheets, and `search.html` adds `/static/css/search.css` after them, as the real pages do.

- [ ] **Step 1: Install Playwright and Chromium in `$V`**

Run: `cd $V && npm init -y && npm i playwright@1.49.1 && npx playwright install chromium`
Expected: Chromium downloads, and `node -e "require('playwright').chromium.launch().then(b=>b.close())"` exits 0. If it fails on a missing shared library, stop and report the library name to the user. Installing a system package needs their approval.

- [ ] **Step 2: Write the fixtures**

`app.html` is `app/index.html`'s `<body>` markup with `<link>`s injected by `compare.mjs`, followed by a `#panel ol` list written by hand in `render.js`'s / `panel.js`'s structure. It has one row each of: plain, `.self`, `.highlight`, `.focused`, `.search`, `.connect`, `.disconnect`, `.info`, `.event` (with `time`), `.raw`, a 3-row monospace run (`monospace-start` … `consecutive` … `monospace-end`), `.date-separator`, `.last-read`, `.search-start`, an embed with and without `.embed-thumb`, an `.image-wrap` (image, plus `.hidden`), and `.reactions` with own and others' chips. It also includes `.message-controls`, `.nick-popup`, `.overlay` with `.dialog`, `.dialog.config`, `.help`, `.image-popup-wrap`, `.upload-popup`, an `.emoji-popup` with search, tone, groups and list, `#nicks` with nicks, and `.channel-controls`. `search.html` is `search/index.html`'s body.

- [ ] **Step 3: Write `compare.mjs`**

For page ∈ {app, search} × theme ∈ {default, solarized, solarized-dark} × viewport ∈ {1280×800, 390×844} × state ∈ the Review Focus class list, applied one group at a time on top of a base state:
- Collect `getComputedStyle` (every property) for every element, plus its `::before` and `::after`. Match elements by DOM path.
- Hover: for each of `li.chat` (every row kind), `.nav li`, `.flex-wrap-left header`, `#toggle-nicks`, `.embed-wrap`, `.image-wrap a`, `.reaction`, `.reaction.self`, `.emoji-groups button`, `.emoji-popup li`, `.message-react`, `#nicks li a`, `.nav-title.expandable`, `#emoji`, `#upload`, `#global-controls li`, `ul.channel-controls li a`, call `page.hover()` and collect that element's subtree.
- Focus: `#input .input`, `#switcher`, `#input .input.coloring`.
- Extra passes: `deviceScaleFactor: 2` (default theme, app, 1280), and a `standalone` pass whose stylesheet text has `@media (display-mode: standalone)` rewritten to `@media all` (both sides).
- Take a full-page screenshot per page × theme × viewport × base state on both sides.

- [ ] **Step 4: Prove the harness passes on identical CSS**

Run: `node $V/compare.mjs` (repo at `b64d333`, no `themes.css` yet)
Expected: `0 differences`, exit 0.

- [ ] **Step 5: Prove it catches each failure mode**

On a scratch copy of the candidate `lierc.css`, apply each change below, run `node $V/compare.mjs`, then undo it. Each must report at least one difference and exit 1:
1. In `body.solarized-dark #nicks ul li a:hover`, change `#fff` to `#ffe`. This is caught only by the hover pass in solarized-dark.
2. Move `#panel ol li.chat:hover` below `#panel ol li.chat.self`. This is a source-order change.
3. In `.remove-blur`, change `height: 11px` to `12px`. Caught only by the standalone pass.
4. Delete the hi-DPI `@media` block. Caught only by the DPR 2 pass.
5. In `@media (max-width: 800px)`, change `.nav li` padding. Caught only at 390px.

- [ ] **Step 6: No commit.** The harness is throwaway.

---

### Task 2: `themes.css` with the palette and theme blocks; theme overrides become variables

**Files:**
- Create: `static/css/themes.css`
- Modify: `static/css/lierc.css` (the 31 `body.solarized…` rules, the `:root` palette, `--panel-bg` on `.flex-wrap-right`)
- Modify: `app/index.html`, `search/index.html` (add `<link type="text/css" rel="stylesheet" href="/static/css/themes.css"></link>` immediately before the `lierc.css` link)

**Interfaces:**
- Produces: in `themes.css`, the Solarized palette (`--base03` … `--green`, values unchanged), then a `:root` block, then `body.solarized { … }` and `body.solarized-dark { … }` blocks. Each block sets every theme variable below. Later tasks use these names.

| Variable | default | solarized | solarized-dark | Used by today |
|---|---|---|---|---|
| `--panel-bg` | `#fff` | `var(--base3)` | `var(--base02)` | `.flex-wrap-right`, date separator `time`, `.last-read` and its `::before`, `#toggle-nicks:hover` / `.show-nicklist #toggle-nicks`, `.message-controls` |
| `--panel-text` | `inherit` | `inherit` | `#fff` | `.flex-wrap-right` `color` |
| `--bar-bg` | `#fff` | `var(--base2)` | `var(--base03)` | `#topic`, `#toggle-nicks` |
| `--foot-bg` | `transparent` | `var(--base2)` | `transparent` | `#foot` |
| `--input-bg` | `transparent` | `var(--base3)` | `transparent` | `#input .input` |
| `--input-border` | `#ccc` | `#ccc` | `var(--base01)` | `#input .input` |
| `--input-focus-border` / `--input-focus-ring` | `#7a9cd3` / `#9ec0f7` | same | `var(--base0)` / `var(--base0)` | `#input .input:focus` |
| `--date-text` | `var(--base01)` | `var(--base01)` | `var(--base1)` | date separator `time` |
| `--meta-text` | `#555` | `#555` | `var(--base1)` | `.channel-meta`, `#nicks ul li a` |
| `--meta-text-hover` | `#000` | `#000` | `#fff` | `#nicks ul li a:hover` |
| `--media-border` / `--media-border-hover` | `#eee`·`#ddd` / `#ccc` | same | `var(--base01)` / `var(--base00)` | `.image-wrap a` (default `#eee`), `.embed-wrap` (default `#ddd`): split into `--image-border` and `--embed-border` if the defaults must differ |
| `--reaction-bg` / `-hover` | `rgba(0,0,0,0.05)` / `rgba(0,0,0,0.09)` | same | `rgba(255,255,255,0.07)` / `rgba(255,255,255,0.13)` | `.reaction` |
| `--reaction-border` / `-hover` | `#ccc` / `#999` | same | `var(--base01)` / `var(--base00)` | `.reaction` |
| `--reaction-count` | `#666` | `#666` | `var(--base1)` | `.reaction-count` |
| `--reaction-self-bg` / `-hover` | `rgba(38,139,210,0.15)` / `0.25` | same | `0.25` / `0.35` | `.reaction.self` |
| `--reaction-self-count` | `var(--blue)` | `var(--blue)` | `#fff` | `.reaction.self .reaction-count` |

The table is the starting point. If the harness shows a default-theme value differs from the literal shown (e.g. `#topic` has no default background today, so `#fff` versus transparent over `#fff`), use whatever value makes the harness pass.

- [ ] **Step 1: Run the harness before changing anything**

Run: `node $V/compare.mjs`
Expected: `0 differences` (the starting point).

- [ ] **Step 2: Create `themes.css`, add the two `<link>`s, move the palette out of `lierc.css`, and rewrite each themed property in `lierc.css` as `var(--name)`. Delete all 31 `body.solarized…` rules.**

- [ ] **Step 3: Check that no rule outside `themes.css` mentions a theme**

Run: `grep -c 'solarized' static/css/lierc.css`
Expected: `0`.

- [ ] **Step 4: Run the harness**

Run: `node $V/compare.mjs`
Expected: `0 differences`. A difference that provably renders the same (spec's rule) goes in the commit message, one line each.

- [ ] **Step 5: Commit**

```bash
git add static/css/themes.css static/css/lierc.css app/index.html search/index.html
git commit -m "Move theme colours into one block per theme in themes.css"
```

---

### Task 3: Name the remaining literals

**Files:**
- Modify: `static/css/themes.css` (fixed named colours and fonts, outside the theme blocks)
- Modify: `static/css/lierc.css`

**Interfaces:**
- Consumes: Task 2's theme variables.
- Produces, in `themes.css` `:root` before the theme blocks:
  - `--font-ui`: the system stack `BlinkMacSystemFont, "San Francisco", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif`
  - `--font-mono`: `"Menlo", "Inconsolata", "Consolas", "Droid Sans Mono", "Monaco", monospace`
  - `--warning`: `#ffa130`
  - `--focus-border` / `--focus-ring`: `#7a9cd3` / `#9ec0f7`
  - `--coloring-border` / `--coloring-ring`: `#83d37a` / `#a9f79e`
  - `--popup-bg`: `#fff`, `--dialog-bg`: `#eee`, and a short grey ramp for the remaining `#000/#333/#555/#666/#777/#999/#ccc/#eee/#efefef`. Name greys by role where one role is obvious (`--border`: `#ccc`), and by value otherwise.

  The `body, input` stack (emoji fonts plus `var(--fa-family-classic)`) is `var(--font-ui)` with the emoji fonts inserted before `sans-serif`. Keep that exact order.

- [ ] **Step 1: Replace every colour literal and font stack in `lierc.css` with a variable.**

- [ ] **Step 2: Check for leftover literals**

Run: `grep -nE '#[0-9a-fA-F]{3,6}\b|rgba?\(|"Menlo"|BlinkMacSystemFont' static/css/lierc.css`
Expected: no output, except `rgba` values that only exist inside a single `box-shadow` or `text-shadow`. Leave those inline and list them in the commit message.

- [ ] **Step 3: Run the harness**

Run: `node $V/compare.mjs`
Expected: `0 differences`.

- [ ] **Step 4: Commit**

```bash
git add static/css/themes.css static/css/lierc.css
git commit -m "Name the remaining colours and font stacks"
```

---

### Task 4: Regroup rules by UI area and tidy

**Files:**
- Modify: `static/css/lierc.css`

**Interfaces:**
- Consumes: Tasks 2 and 3.
- Produces: `lierc.css` divided by `/* ===== Name ===== */` comments into these sections, in this order: Base, Layout, Sidebar and nav, Header, Topic and channel meta, Message list, Embeds and images, Reactions and message controls, Input and footer, Popups, Dialogs and overlays, Help. The hi-DPI block stays under Base, and the `.remove-blur` block stays under Base with its comment unchanged.

- [ ] **Step 1: Move each rule into its section, still unnested. The end-of-file `@media (max-width: 800px)` stays where it is for now.**
- [ ] **Step 2: Merge duplicate rules for one selector, apart from the mobile block (`.flex-wrap-left header h1` ×2, `#panel-name` ×2, `#global-controls-toggle` ×2, `.message-react:before` ×2, `.emoji-popup` ×3, `.help` with `background` twice, and `#toggle-nicks`, which sets `color` twice where the second one wins). Delete the dangling `padding` in `#panel ol li.info`, `text-left: right` in `.overlay .submit-group`, and the commented-out `.consecutive` block. Rewrite `.nick-popup h3, p` as `.nick-popup h3` plus a global `p { margin: 3px 0; }`, and `.help dt, dd` as `.help dt` plus a global `dd`. Each global rule gets a comment: "global on purpose: kept from the old `.x, p` selector".**
- [ ] **Step 3: Run the harness**

Run: `node $V/compare.mjs`
Expected: `0 differences`. Any difference here is a source-order or merge mistake: fix the order, don't change values.

- [ ] **Step 4: Commit**

```bash
git add static/css/lierc.css
git commit -m "Group lierc.css by area of the UI and drop dead declarations"
```

---

### Task 5: Nest, and move mobile rules into their components

**Files:**
- Modify: `static/css/lierc.css`

**Interfaces:**
- Consumes: Task 4's sections.

- [ ] **Step 1: Within each section, nest descendant and state selectors under their parent rule (`&.self`, `&:hover`, `& time`, `&::before`). Move each rule out of the end-of-file `@media (max-width: 800px)` into a nested `@media (max-width: 800px) { … }` inside the rule it adjusts, then delete the end-of-file block. Only nest under a comma list when every member has the same specificity.**

- [ ] **Step 2: Check for nesting under mixed-specificity lists**

Run: `grep -nE '^[^/{]*#[^,{]*,[^{]*\{|^[^/{]*,[^{]*#[^{]*\{' static/css/lierc.css`
Expected: for each hit that contains nested rules, all members of the list have the same specificity (e.g. all IDs, or all classes). Fix any that don't by splitting the list.

- [ ] **Step 3: Run the harness**

Run: `node $V/compare.mjs`
Expected: `0 differences`.

- [ ] **Step 4: Look at the screenshots**

Open every pair in `$V/shots/{baseline,candidate}` for the base states, all themes, both widths, and both pages.
Expected: identical by eye. The harness already checked them mechanically; this catches anything the computed-style comparison can't see.

- [ ] **Step 5: Commit**

```bash
git add static/css/lierc.css
git commit -m "Nest lierc.css rules and keep mobile tweaks with their components"
```

---

### Task 6: Cache-bust and hand off

**Files:**
- Modify: `app/index.html`, `search/index.html` (via `make bust`)

- [ ] **Step 1: Run `make bust` in the repo**

Expected: `updated app/index.html`, `updated search/index.html`; both `<link>`s for `themes.css` and `lierc.css` carry `?v=` hashes.

- [ ] **Step 2: Run the harness one last time**

Run: `node $V/compare.mjs`
Expected: `0 differences`. The `?v=` query strings don't affect the fixture.

- [ ] **Step 3: Commit**

```bash
git add app/index.html search/index.html
git commit -m "Bust the cache for themes.css and lierc.css"
```

- [ ] **Step 4: Report to the user: line counts before and after, the commit list, any "renders the same" differences that were accepted, and a reminder that pushing and the relaychat-infra bump are theirs to request.**
