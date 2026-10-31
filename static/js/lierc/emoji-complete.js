// Inserting emoji by typing :name in the message input. Names are the
// picker's names as Emoji.shortcode writes them.

// the characters a typed name can hold, as Emoji.shortcode keeps them
const NAME = /^[\p{L}\p{N}_-]$/u;
const MIN_QUERY = 2;

// The :query ending at pos in text, if there is one: its ":" starts the
// text or follows whitespace, and at least MIN_QUERY name characters come
// after it. closed is true when a ":" right before pos ends the name.
export function query_at(text, pos) {
  let end = pos;
  const closed = text[pos - 1] == ":";
  if (closed)
    end--;

  let start = end;
  while (start > 0 && NAME.test(text[start - 1]))
    start--;

  const colon = start - 1;
  if (colon < 0 || text[colon] != ":")
    return null;
  if (colon > 0 && !/\s/.test(text[colon - 1]))
    return null;
  if (end - start < MIN_QUERY)
    return null;

  return { start: colon, end: pos, query: text.slice(start, end), closed };
}

// codes whose name contains query: those starting with it first, then the
// rest, each in their original order
export function rank(codes, query) {
  const prefix = [], rest = [];
  for (const c of codes) {
    const i = c.code.indexOf(query);
    if (i == 0)
      prefix.push(c);
    else if (i > 0)
      rest.push(c);
  }
  return prefix.concat(rest);
}
