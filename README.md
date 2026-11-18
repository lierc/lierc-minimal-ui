lierc-web
=========

The web UI of [relaychat](https://relaychat.party/), a web IRC client that
stays connected when you close the tab. Try it at <https://relaychat.party/>.

Questions or ideas? Come talk in [#relaychat](https://relaychat.party/join/?network=relaychat&channel=relaychat).

The frontend that uses [lierc-api](https://github.com/lierc/lierc-api).
There is no build step for development: the files are served as they are,
and the dev stack in
[lierc-docker-compose](https://github.com/lierc/lierc-docker-compose)
mounts this directory, so an edit shows up on reload.

The files in `static/js/lierc/` are ES modules. Modules import each other,
and refer to other static files, by relative URL; only the pages name
`/static/` paths.

Releases
--------

The site is deployed from releases, not from this repository. A release
ships only the files listed in `ship.txt`, so a new file needs a line
there. `bin/build vX.Y.Z <outdir>` (or `make dist VERSION=vX.Y.Z`) builds
the release tree:

- `static/` files go under `static/X.Y.Z/`, and the pages and
  `manifest.json` point there, so each release's files have their own
  URLs and browsers never mix releases;
- `app/index.html` gets the release in its `ui-release` meta tag, and
  `static/version.json` names it;
- the build fails if a shipped file refers to one that isn't shipped, or
  if a script or stylesheet names `/static/` directly.

CI builds on every push, so a missing `ship.txt` line fails there. Pushing
a tag `vX.Y.Z` publishes the release: the tarball and its sha256, attached
to a GitHub release, which relaychat-infra deploys.

Versions are semver. A new major or minor (`v7.1.0`) shows open tabs
"Update available"; a patch (`v7.0.1`) deploys without telling them.
