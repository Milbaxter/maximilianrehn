# Maximilian's personal site

Static GitHub Pages site. Serve locally with `python3 -m http.server 8080` and open http://localhost:8080.

The workbench loads the latest available public GitHub events for Milbaxter, up to the API's 300-event limit. It shows work on owned repositories (excluding the profile repository), not stars or private activity. Notes show the six most recently active projects; the activity strip covers all matching projects. Counts represent events, not commits. Windows use UTC calendar days. GitHub can delay events by several hours.

`data/workbench.json` is a public-only snapshot used when GitHub cannot be reached or the visitor is rate limited. The interface labels its capture date and still filters it against today's date, so old work does not appear current. No token or server is needed. Project descriptions come from public repository metadata.

Run data behavior checks with `node --test tests/*.test.mjs`.
