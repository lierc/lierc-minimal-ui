A basic UI for lierc
====================

This is a frontend that uses the lierc-api.

This directory is mounted by the `lierc-h2o` container, and used
as the root directory served by the `h2o` HTTP server.

To build the assets run `make`. To monitor changes to assets and
rebuild automatically, run `make watch`. This make target requires
some perl modules to work.

Dependencies
============

 * `brotli` command
 * `handlebars` nodejs module
 * `AnyEvent::Filesys::Notify` perl module
