A basic UI for lierc
====================

This is a frontend that uses the lierc-api.

This directory is mounted by the `lierc-h2o` container, and used
as the root directory served by the `h2o` HTTP server.

To build the assets run `make`. To monitor changes to assets and
rebuild automatically, run `make watch`. This make target requires
some perl modules to work.

Before deploying, run `make bust`. It adds a `?v=<hash>` cache
buster to each `/static/` asset referenced in the HTML files, so
browsers fetch changed assets. Commit the updated HTML files.

The files in `static/js/lierc/` are ES modules. Pages load them
through an inline `<script type="module">`, and `make bust` fills
in each page's `<script type="importmap">` so imported modules are
versioned too. A new module is picked up automatically.
