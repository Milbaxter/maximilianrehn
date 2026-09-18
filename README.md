# Maximilian's personal site

Static GitHub Pages site. The simple homepage links to `workbench.html` in a new tab; GitHub activity loads only on that page. Serve locally with `python3 -m http.server 8080` and open http://localhost:8080.

The workbench loads the latest available public GitHub events for Milbaxter, up to the API's 300-event limit. It shows work on owned repositories (excluding the profile repository), not stars or private activity. The six latest projects active within ten days sit at the front. Older projects become smaller scraps further down the same bench. Notes gradually fade with age and disappear after thirty days of inactivity; new activity brings them back. Up to eighteen projects are visible. Hover or keyboard focus restores a faded note, and every note links straight to its repository. There are no filters, counters, or detail panels. GitHub can delay events by several hours.

`data/workbench.json` is a public-only snapshot used when GitHub cannot be reached or the visitor is rate limited. The interface labels its capture date and still filters it against today's date, so old work does not appear current. No token or server is needed. Project descriptions come from public repository metadata.

Run data behavior checks with `node --test tests/*.test.mjs`.
