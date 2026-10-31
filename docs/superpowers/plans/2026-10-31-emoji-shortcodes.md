# Emoji :name: Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Typing `:name` in the message input shows a themed list of matching emoji above it, and picking one (or typing the full `:name:`) inserts the emoji.

**Architecture:** A new `static/js/lierc/emoji-complete.js` holds pure helpers (find the `:query` before the cursor, rank matches) and an `EmojiComplete` class that drives one shared `<ul id="emoji-complete">` in the footer. `Emoji.load()` precomputes each emoji's typed name. The editor feeds it input events; the page-wide keydown in `uievents.js` gives it first refusal on keys while it is open.

**Tech Stack:** Plain ES modules, no build step, no test framework (pure helpers tested with a throwaway Node harness in the session scratchpad; DOM behaviour checked with headless Chromium against the docker-compose dev stack, as earlier UI work was).

**Spec:** `docs/superpowers/specs/2026-10-31-emoji-shortcodes-design.md`

## Global Constraints

- Typed name: the picker's `name`, lower case, whitespace runs as `_`, characters other than letters, digits, `_` and `-` dropped, repeated `_` collapsed. "Face with tears of joy" → `face_with_tears_of_joy`; "Flag: Japan" → `flag_japan`.
- Opens only for `:` at the start of the text or after whitespace, followed by at least 2 name characters, ending at the cursor.
- Matching: substring of the typed name; names starting with the query first, then the rest, each in picker order. All matches kept; the list scrolls.
- Keys while open: Up/Down move the highlight, Tab or Enter insert it (Enter never sends), Escape closes. Clicking a row inserts it.
- A closing `:` right after an exact name inserts that emoji at once.
- Insert replaces `:query` (and the closing `:`) with the emoji in `Emoji.tone` when it has tones, via `document.execCommand("insertText")`, then calls `Emoji.use(chars)`.
- List colours only from the theme's `--popup-*` variables.
- Commits go to lierc-minimal-ui `master`, locally. `make bust`, push and deploy only when the user asks.

## Review Focus

- Enter while the list is open must insert, never send the message. Task 2's browser check presses Enter.
- The cursor in the middle of text (`say :hea| there`): only `:hea` is replaced and ` there` survives. Task 1 tests `query_at` mid-string; Task 2's browser check edits mid-text.
- Names with punctuation ("Flag: Japan", "Keycap: #", "Woman: red hair") give typeable names without `:`. Task 1 tests `shortcode`.
- A second `:name` after an emoji already inserted (the input now has several text nodes): it must still open and insert. Task 2's browser check inserts two in a row.
- Before `emoji.json` loads, or with no matches, nothing opens and nothing throws. Task 1 tests `rank` with no entries; Task 2 checks a query with no matches.

---

### Task 1: Typed names, query detection and ranking

**Files:**
- Modify: `static/js/lierc/emoji.js` (`Emoji.codes`, filled in `Emoji.load`; `Emoji.shortcode`)
- Create: `static/js/lierc/emoji-complete.js` (pure helpers only in this task)
- Test: scratchpad `emoji-complete-harness/emoji-complete.test.mjs`, importing a `{"type":"module"}` copy of `static/js`

**Interfaces:**
- Produces:
  - `Emoji.shortcode(name: string) -> string` per Global Constraints.
  - `Emoji.codes: Array<{code: string, chars: string, tones: string[] | undefined}>`, in picker order, filled by `Emoji.load()`.
  - `export function query_at(text: string, pos: number) -> {start: number, end: number, query: string, closed: boolean} | null` in `emoji-complete.js`. `start` is the opening `:`'s index, `end` is `pos`. `closed` is true when `text[pos-1]` is `:` closing a query of 2 or more name characters; then `query` excludes both colons.
  - `export function rank(codes, query: string) -> codes[]`: prefix matches, then other substring matches.

- [ ] **Step 1: Write the failing harness cases**
  - `shortcode`: "Face with tears of joy" → `face_with_tears_of_joy`; "Flag: Japan" → `flag_japan`; "Keycap: #" → `keycap`; "Woman: red hair" → `woman_red_hair`; "Piñata" → `piñata`; "OK hand" → `ok_hand`.
  - `query_at`: `(":jo", 3)` → `{start: 0, end: 3, query: "jo", closed: false}`; `("say :hea there", 8)` → `{start: 4, end: 8, query: "hea", closed: false}`; `(":j", 2)` → null; `("12:30", 5)` → null; `("re:ok", 5)` → null; `(":)", 2)` → null; `("hi :joy:", 8)` → `{start: 3, end: 8, query: "joy", closed: true}`; `("a :x:", 5)` → null (closed but too short); `(":heart", 3)` → `{start: 0, end: 3, query: "he", closed: false}` (only up to the cursor).
  - `rank` over codes `[cat_with_tears_of_joy, joystick, face_with_tears_of_joy]` (that order) with `"joy"` → `[joystick, cat_with_tears_of_joy, face_with_tears_of_joy]`; with `"zzz"` → `[]`; `rank([], "joy")` → `[]`.
  - After `Emoji.load()` with a stubbed `fetch` returning the real `static/emoji.json`: `Emoji.codes.length` equals the number of emoji in its groups, and the entry for 😂 has `code` `face_with_tears_of_joy`.
- [ ] **Step 2: Run** `node <harness>.mjs <copy>/js`. Expected: cases fail (missing exports).
- [ ] **Step 3: Implement** the four interfaces above. Name characters are `[\p{L}\p{N}_-]` (Unicode flag `u`), the same set `shortcode` keeps.
- [ ] **Step 4: Run** the harness. Expected: all pass; `node --check` the copies of `emoji.js` and `emoji-complete.js`.
- [ ] **Step 5: Commit** `git add static/js/lierc/emoji.js static/js/lierc/emoji-complete.js && git commit -m "Add typed emoji names and :name matching"`

### Task 2: The completion list in the input

**Files:**
- Modify: `static/js/lierc/emoji-complete.js` (add `EmojiComplete`)
- Modify: `static/js/lierc/editor.js` (create it; call it on input and blur)
- Modify: `static/js/lierc/uievents.js` (document keydown: give it first refusal right after the `app.overlayed()` checks)
- Modify: `static/js/lierc/template.js` (`emoji_complete` template)
- Modify: `app/index.html` (`<ul id="emoji-complete" hidden></ul>` inside `#foot`, before `#color-info`)
- Modify: `static/css/lierc.css` (`#emoji-complete`)
- Test: scratchpad `emoji-complete-browser/check.mjs` (headless Chromium against the dev stack, UI mounted from the working tree)

**Interfaces:**
- Consumes: `query_at`, `rank`, `Emoji.codes`, `Emoji.tone`, `Emoji.use` (Task 1).
- Produces:
  - `export class EmojiComplete { constructor(input: HTMLElement, list: HTMLElement); update(): void; keydown(e: KeyboardEvent) -> boolean; close(): void; get open(): boolean }`. `update()` reads the selection's focus text node and offset; `keydown` returns true when it handled the key (and called `preventDefault`), false otherwise and always when closed.
  - `Editor.emoji: EmojiComplete`, built with `document.getElementById('emoji-complete')`.
  - Template `emoji_complete({matches: [{chars, code, selected}]})` → `<li data-index="…" class="selected?"><span class="chars">…</span> …code…</li>` rows.

- [ ] **Step 1: Write the browser check** (each line an assertion, reading `#emoji-complete` and the input's `textContent`):
  1. Type `:hear` → the list is visible with one row per emoji whose typed name contains `hear` (compute the expected count from `Emoji.codes` in the page), every row's name contains `hear`, and the first row is highlighted with a name starting with `hear`.
  2. ArrowDown, then Enter → the input is the second row's emoji only, the list is hidden, and no message was sent (no `POST /api/connection/…` request).
  3. Type `hi :face_with_tears_of_joy:` → the input reads `hi 😂`, with no list.
  4. Type ` :thu`, press Tab → the input gains 👍 (the top match), after the 😂; with `Emoji.tone = 1` set first, it gains 👍🏻.
  5. Type `12:30` and `re:ok` → no list. Type `:qqzz` → no list.
  6. Type `say  there`, move the cursor after `say `, type `:hea`, press Enter → `say <emoji> there`.
  7. Type `:hea`, press Escape → list hidden, input still `:hea`. Press Enter → the message sends.
  8. Type `:hea` and click the third row → that emoji inserted, input focused.
  9. With the `slack-dark` theme, the list's computed background equals `--popup-bg` (#222529) and a highlighted row's equals `--popup-hover`.
  10. The picker's recently used list starts with the last inserted emoji.
- [ ] **Step 2: Run** the check against the dev stack. Expected: fails (no list element).
- [ ] **Step 3: Implement**
  - `EmojiComplete.update()`: `query_at` on the focus text node; if `closed` and `rank` has an exact `code` match, insert it; else render `rank` results (or close when none).
  - Insert: set a range over `start..end` in that text node, `execCommand("insertText", false, chars)` with the tone applied as in `Emoji.item`, then `Emoji.use(chars)`, then close.
  - Rows insert on `mousedown` with `preventDefault()`, so the input keeps focus; the editor's `blur` closes the list.
  - Keep the highlighted row scrolled into view (`scrollIntoView({block: "nearest"})`).
  - CSS: positioned above the input like `.emoji-popup` (`position: absolute; bottom: 100%`), `max-height` about 8 rows, `overflow-y: auto`, `background: var(--popup-bg)`, `color: var(--popup-text)`, `border: 1px solid var(--popup-border)`, `li.selected` and `li:hover` `background: var(--popup-hover)`.
- [ ] **Step 4: Run** the check. Expected: all 10 pass; then rerun Task 1's harness and `node --check` every changed module.
- [ ] **Step 5: Commit** `git add app/index.html static/css/lierc.css static/js/lierc && git commit -m "Insert emoji by typing :name in the message input"`
