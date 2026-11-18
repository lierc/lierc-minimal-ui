# Channel Join Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/join/?network=<preset alias>&channel=<channel>` gets a visitor into that channel: signing up or logging in if needed, adding the network if they don't have it, joining, and opening the app on it.

**Architecture:** A pure ES module (`static/js/join-link.js`) parses and validates the link and the `next` parameter. A static `/join/` page with its own module script (`static/js/join.js`) shows the link's state and, on Join, calls the existing API. `auth-page.js` carries `next` through login, register and the verify page's Start chatting. No API change.

**Tech Stack:** Plain HTML, CSS (`static/css/auth.css`) and browser JavaScript, no build step. Presets from `static/js/lierc/networks.js`.

**Spec:** `docs/superpowers/specs/2026-11-18-join-links-design.md`

## Global Constraints

- Networks: only presets, by `Alias`, case-insensitive (`relaychat`, `libera`, `oftc`, `ircnet`, `rizon`, `esper`, `hackint`, `snoonet`, `tilde`).
- Channel: a missing leading `#` is added; then `#` or `&` plus 1–49 characters, none of them space, comma, control characters (U+0000–U+001F, U+007F) — BEL is among those.
- Nothing joins or adds a network on page load; only the Join button does.
- `next` is followed only when it starts with `/join/?`; otherwise ignored.
- The UI has no test framework: tests are throwaway scripts kept **outside the repo** (in the session scratchpad): a Node script for pure code, headless Chromium (`~/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell` with `playwright-core@1.48.2`) against a stub API for pages.
- Run `make bust` (add `join/index.html` to its list) before committing HTML that references changed or new `/static/` files.
- Work on the `join-links` branch, not `master`.

## Review Focus

- A link whose `channel` arrives URL-decoded with a `#` (`channel=%23foo`) and one without (`channel=foo`) both give `#foo`.
- `next` values like `//evil.example/join/?`, `/join/?x` with a different host via backslashes (`/\evil`), `javascript:`, or absolute URLs are ignored.
- A logged-in user whose matching connection exists under different letter case in Host (`IRC.Libera.Chat`) joins on it instead of adding a second one.
- The API refusing the new connection (the 5-connection limit) shows its message on the page and doesn't navigate.
- A channel joined on a new connection is focused when its panel appears seconds later (the app's `default_panel`, `app.js:783`).

---

### Task 1: Link parsing (`join-link.js`)

**Files:**
- Create: `static/js/join-link.js`
- Test: `<scratchpad>/join/link.test.mjs` (Node, outside the repo)

**Interfaces:**
- Consumes: `NETWORKS` from `static/js/lierc/networks.js` (objects with `name`, `Host`, `Port`, `Ssl`, `Alias`).
- Produces:
  - `parse_join(params: URLSearchParams) -> { network: <preset>, channel: string } | null`
  - `join_path(network: <preset>, channel: string) -> string` — `/join/?network=<alias>&channel=<channel, encodeURIComponent>`
  - `safe_next(next: string | null) -> string | null` — `next` if it starts with `/join/?`, else `null`

- [ ] **Step 1: Write the failing test** (`node --test`), asserting:
  - `parse_join(new URLSearchParams("network=libera&channel=%23foo"))` → network.name `Libera.Chat`, channel `#foo`
  - `network=LIBERA&channel=foo` → channel `#foo`; `network=esper&channel=&bar` (as params `channel` = `&bar`) → `&bar`
  - `null` for: unknown network `efnet`; missing network; missing channel; `channel=%23` (empty name); a 50-character name; names containing space, comma, `\x07`, `\x00`
  - `join_path(libera, "#foo")` → `/join/?network=libera&channel=%23foo`
  - `safe_next("/join/?network=libera&channel=%23foo")` returns it; `null` for `null`, `""`, `/app/`, `//evil.example/join/?`, `/\\evil`, `https://relaychat.party/join/?x`, `javascript:alert(1)`

- [ ] **Step 2: Run it, expect failure** — `node --test <scratchpad>/join/link.test.mjs` → fails importing `join-link.js`.

- [ ] **Step 3: Implement the three functions in `static/js/join-link.js`** (ES module, imports `./lierc/networks.js`).

- [ ] **Step 4: Run it, expect PASS.**

- [ ] **Step 5: Commit** `static/js/join-link.js` — "join links: parse and validate the link".

### Task 2: The `/join/` page

**Files:**
- Create: `join/index.html`, `static/js/join.js`
- Modify: `Makefile` (add `join/index.html` to `bust`)
- Test: `<scratchpad>/join/page.test.mjs` with a stub API server `<scratchpad>/join/stub.py`

**Interfaces:**
- Consumes: Task 1's `parse_join`, `join_path`.
- Produces: the page at `/join/`, panels with ids `invalid`, `logged-out`, `logged-in`; Join button `#join`; error line `#join-error`; links `#register` and `#login`.

- [ ] **Step 1: Write the stub and the failing browser test.** The stub answers `GET /api/auth` (401, or a user `{user:"newbie", ...}`), `GET /api/connection` (a configurable list), `POST /api/connection` (records the body; 200 with `{"Id":"new1"}`, or 400 `{"status":"error","error":"..."}` when told to), `POST /api/connection/<id>` (records the body). Tests, each a fresh page:
  - invalid: `/join/?network=efnet&channel=foo` → `#invalid` visible, no POSTs
  - logged out: `#logged-out` visible; heading text contains `#foo` and `Libera.Chat`; `#register` href is `/register/?next=` + encodeURIComponent of the join path; `#login` likewise; no POSTs on load
  - logged in, no Libera connection: `#logged-in` visible, no POST on load; click `#join` → one `POST /api/connection` whose JSON has Host `irc.libera.chat`, Port 6697, Ssl true, Alias `libera`, Nick and User `newbie`, Highlight `["newbie"]`, Channels `["#foo"]`, SASL false; then location is `/app/#/new1/%23foo`
  - logged in with connection `{Id:"c9", Config:{Host:"IRC.Libera.Chat", Port:6697}}`: click → body `JOIN #foo` POSTed to `/api/connection/c9` with content-type `application/irc`, no `POST /api/connection`; location `/app/#/c9/%23foo`
  - API refuses: `#join-error` shows the API's message, location unchanged, `#join` enabled again

- [ ] **Step 2: Run it, expect failure** (404 for `/join/`).

- [ ] **Step 3: Write `join/index.html`** in the login page's layout (`auth.css`, header bar, `<main>` with the three `section.panel`s, `<script type="module" src="/static/js/join.js">`), title "Join a channel · relaychat.party"; heading "Join <b>#channel</b> on <b>Network</b>" filled by script; logged-out text: "Relaychat is an IRC client in your browser that stays connected when you close the tab." with **Create an account** (`a.button`) and **Log in** (`p.alt` link).

- [ ] **Step 4: Write `static/js/join.js`**: parse the link; `GET /api/auth` (credentials same-origin) to pick the panel (anything but 200 is logged out; a network error shows logged out too); on Join, `GET /api/connection`, match Host case-insensitively and Port numerically, then the API call per the spec, then `location = "/app/#/" + id + "/" + encodeURIComponent(channel)`. Errors: the API's `error` field, else "Something went wrong".

- [ ] **Step 5: Run it, expect PASS.** `make bust`.

- [ ] **Step 6: Commit** `join/index.html`, `static/js/join.js`, `Makefile` — "join links: the /join/ page".

### Task 3: `next` through login, register and verify

**Files:**
- Modify: `static/js/auth-page.js`, `login/index.html`, `register/index.html`, `verify/index.html`
- Test: `<scratchpad>/join/next.test.mjs` (same stub, with `POST /api/auth` and `POST /api/register` logging in)

**Interfaces:**
- Consumes: Task 1's `safe_next` rule — `auth-page.js` is a classic script, so it keeps its own copy: `const next = safe_next(new URLSearchParams(location.search).get("next"))` with the same `/join/?` test, commented as matching `join-link.js`.
- Produces: login → `next`; register → `/verify/?next=<encoded next>`; verify's Start chatting `href` = `next`; the login page's Register link and the register page's Log in link carry `?next=`; an already-logged-in visitor to login/register goes to `next` instead of `/app/`.

- [ ] **Step 1: Write the failing browser test:**
  - `/login/?next=<join path>`: submit → location is the join path
  - `/register/?next=<join path>`: submit → `/verify/?next=…`; Start chatting's href is the join path
  - `/login/?next=//evil.example/join/?x`: submit → `/app/`
  - `/register/?next=<join path>`: the "Log in" link's href is `/login/?next=<encoded join path>`; and on `/login/?next=…` the Register link carries it too
  - logged-in visit to `/login/?next=<join path>` → goes to the join path
  - plain `/register/` and `/login/` still go to `/verify/` and `/app/`

- [ ] **Step 2: Run it, expect failure.**

- [ ] **Step 3: Change `auth-page.js`**: compute `next` once; the success redirect becomes `next || form.dataset.next || "/app/"`, except a form with `data-next="/verify/"` goes to `/verify/?next=` + encodeURIComponent(next) when there is one; the logged-in shortcut uses `next || "/app/"`; on the verify page set `a.button[href="/app/"]`'s href to `next` when there is one; rewrite the `a[href="/login/"]` / `a[href="/register/"]` links to carry `?next=`. Give the cross links (`Have an account? Log in`, `Register`) an id or class only if a selector needs it.

- [ ] **Step 4: Run it, expect PASS; rerun Task 2's test.** `make bust`.

- [ ] **Step 5: Commit** the four files — "join links: carry next through login, register and verify".

### Task 4: End to end

- [ ] **Step 1:** With the stub, run one browser test from `/join/?network=libera&channel=myproject` logged out → Create an account → register → verify page → Start chatting → join page logged in → Join → `/app/#/new1/%23myproject`.
- [ ] **Step 2:** On the dev stack (`lierc-docker-compose`, `API_ORIGINS` including `http://deep-thought:<port>`), open a join link for the `relaychat` preset's channel `#test` as a new user and check the app opens with `#test` focused once it joins (Review Focus: the panel appears after load). Take a screenshot.
- [ ] **Step 3:** Commit the plan and spec docs with the last change; `git status` clean.
