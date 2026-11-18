# Channel join links

## Intent

A link a project can put in its README ("chat with us in your browser")
that gets a visitor into the project's IRC channel through relaychat:
signing up or logging in if they need to, adding the network if they don't
have it, and joining. The point is new users and inbound links.

## Goals

- `https://relaychat.party/join/?network=libera&channel=%23myproject`
  works for a logged-out visitor, a new signup and a logged-in user.
- The visitor ends up in the app with that channel open.

## Non-goals

- A link generator form or a README badge image (the link format is
  enough for now).
- Links to servers that aren't presets.
- Anything in lierc-api: the existing endpoints do it.

## Anti-goals

- A page joining a channel or adding a network without the person
  clicking Join: linking or embedding the address alone must not act.
- An open redirect: `next` never sends anyone off the site, or anywhere
  but `/join/`.

## Approaches

- **A (picked): in the UI.** A static `/join/` page reads the link, looks
  the network up in `static/js/lierc/networks.js`, and uses the existing
  API (`POST /connection`, or `JOIN` on an existing connection). Login and
  register carry the link through a `next` parameter. No API change, one
  repo, presets in one place.
- B: a `POST /join` endpoint in lierc-api checking a Go copy of the
  presets. Server-side, one request, but duplicates the preset list and
  needs an API deploy without protecting anything A doesn't (the API
  already checks hosts for any connection).

The user picked A.

## The link

`/join/?network=<key>&channel=<channel>`

- `network` is a preset's `Alias` (`relaychat`, `libera`, `oftc`,
  `ircnet`, `rizon`, `esper`, `hackint`, `snoonet`, `tilde`), matched
  case-insensitively. Anything else is an invalid link. (User decision:
  presets only.)
- `channel` is required. *My call:* a missing leading `#` is added
  (`channel=myproject` works, since a raw `#` in a URL is a fragment and
  people will get the escaping wrong); after that it must be `#` or `&`
  followed by 1–49 characters with no space, comma, control character or
  BEL. Otherwise invalid.

## The /join/ page

Same look as login/register (`auth.css`), title "Join #channel on
Network". It checks `/api/auth`:

- **Invalid link:** "This join link isn't valid", with a link to the home
  page.
- **Logged out:** "Join **#channel** on **Network**", one line on what
  relaychat is, and **Create an account** / **Log in**, linking to
  `/register/?next=<this join URL>` and `/login/?next=<this join URL>`.
- **Logged in:** the same heading and a **Join** button. (User decision:
  logged-in users click Join; nothing happens on page load.)

On **Join**:

1. `GET /api/connection`; find a connection whose Host (case-insensitive)
   and Port match the preset. *My call:* the first match if several.
2. **Found:** `POST /api/connection/<id>` with body `JOIN <channel>`
   (`content-type: application/irc`), as the app's join dialog does.
3. **None:** `POST /api/connection` with the preset's Host, Port, Ssl,
   Alias, `Nick` and `User` = the username (as `IrcNick` would make it:
   the API does that for the default network; *my call:* send the
   username and let the API's validation answer), `Highlight` = [the
   username], `Channels` = [channel], `SASL` false, no password. The API's
   error (e.g. the 5-connection limit) is shown on the page.
4. Go to `/app/#/<connection id>/<channel, URI-encoded>`.

## next, through login and signup

- Login and register accept `?next=`. It's followed only when it starts
  with `/join/?` (a same-site path); anything else is ignored and the page
  behaves as now.
- **Login:** on success, go to `next` instead of `/app/`.
- **Register:** on success, go to `/verify/?next=<next>`; the confirm page's
  **Start chatting** goes to `next` instead of `/app/`.
- The login page's "Register" link and the register page's "Log in" link
  carry `next` along.
- A logged-in visitor to login/register already goes straight to the app;
  with a valid `next` they go to `next` instead.

## Opening the channel

The app opens `/app/#/<connection>/<channel>` on load (`find_default_panel`).
Left to the builder: check this works when the channel's panel doesn't
exist yet because the JOIN is still in flight (a new connection takes
seconds to register), and make the panel get focused when it appears if it
doesn't.

## Testing

No test framework in the UI: a headless-Chromium script against a stub
API (as for the signup page), covering invalid links, logged out, logged
in with and without the network, the `#`-less channel, `next` through
register (via the verify page) and login, and a `next` that isn't
`/join/` being ignored.
