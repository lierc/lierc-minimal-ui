# Emoji by :name: in the message input

## Why

Typing an emoji's name between colons is quicker than opening the picker,
and it's what people do in Slack and GitHub.

## What it does

- Type `:` at the start of a word, then at least 2 letters: a list of
  matching emoji opens above the input. A `:` inside a word (`12:30`,
  `re:`) or followed by fewer than 2 letters (`:)`) opens nothing.
- **Names** are the picker's own names (`static/emoji.json`), lower case
  with spaces as underscores: "Face with tears of joy" is
  `face_with_tears_of_joy`. No Slack or GitHub short names.
- **Matching** is a substring search of those names: `:joy` matches every
  name containing "joy". Names that start with the typed text come first,
  then the rest, each in the picker's order.
- **The list**: one row per match, emoji then name, the first match
  highlighted; about 8 rows visible, scrolling for the rest. It uses the
  current theme's popup colours (`--popup-*`), like the picker and dialogs.
- **Keys while the list is open**: Up and Down move the highlight; Tab or
  Enter inserts the highlighted emoji (Enter does not send the message);
  Escape closes the list. Clicking a row inserts it.
- **Typing the whole name**: a closing `:` right after an exact name
  (`:face_with_tears_of_joy:`) inserts that emoji at once.
- **Inserting** replaces the typed `:name` (and closing `:`, if typed) with
  the emoji, in the user's skin tone when it has tones, and adds it to the
  picker's recently used list (`Emoji.use`).
- The list closes when the text before the cursor no longer looks like
  `:name`, when the input loses focus, or after an insert.

## Non-goals

Slack or GitHub short names (`:joy:`, `:+1:`); converting `:name:` in
received messages; changing Tab completion of nicks and commands or the
emoji picker.

## Approaches

- **A new module (chosen):** `static/js/lierc/emoji-complete.js`, called by
  the editor on input and by the keydown path for keys, owning its list
  element. Keeps nick completion and the picker untouched.
- **Extend `completion.js`:** rejected. It cycles matches in place with Tab
  and has no list; adding a list, arrows and Enter would tangle the two and
  risk nick completion.
- **Reuse the emoji picker:** rejected. It's a grid, not the chosen list,
  and it's shared with reactions.

## Constraints from the existing code

- The input is a `contenteditable` element; the text before the cursor is
  read and replaced in the focused text node, as `completion.js` does.
- `uievents.js`'s document keydown handles Enter (send) and Escape before
  `Editor.keydown` runs, so while the list is open those keys, plus Tab and
  Up/Down, must go to the emoji list first.
- Names come from `Emoji.groups`, filled by `Emoji.load()`; before it loads,
  nothing opens.
- Theme colours: `static/css/themes.css` already defines the `--popup-*`
  variables in every theme; the list's CSS goes in `static/css/lierc.css`
  using only those.
- `make bust` before deploying, as for any static change.

## Left to the builder

Exact row height and list width; where the name string is precomputed
(at load, alongside `Emoji.names`); how many matches to keep (all, with the
list scrolling).
