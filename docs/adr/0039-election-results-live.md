# 0039. NZ election results, live, until 27/11/2026

Date: 07/11/2026. Status: accepted.

## Context

Election day is Saturday 07/11/2026 and voting closes at 7pm. Kyle asked for the live results on Beyond TV so the
family can watch them come in. Beyond's website already has the results page for TVs: gobeyond.nz/election/live/tv,
dark, full screen, no site header, and it updates itself when new numbers land. The official results are declared on
27/11/2026, after which there is nothing live left to watch.

## Decision

- A round button with a tick, *Election results*, at the top of the home screen, for everyone (kids included: it is
  information, nothing to tap into). Same place on Google TV, LG and Samsung.
- **Google TV:** `ElectionActivity` shows the page full screen in a WebView and keeps the screen on, so the
  screensaver doesn't cover the count. Back comes home. No bridge to the page: it only shows it.
- **LG and Samsung:** gobeyond.nz refuses to be framed (`frame-ancestors 'self'`), so the web app can't show it inside
  itself. `TV.openUrl` opens it in the TV's own browser (LG's Web Browser, Samsung's Internet), full screen. If that
  fails, a toast says where to find it.
- Only on TVs set to New Zealand time (`Pacific/Auckland`, `Pacific/Chatham`), and only up to the end of 27/11/2026
  New Zealand time. After that the button is gone with no update needed. `ElectionActivity.showing()` and
  `electionOn()` in `web/home.js` hold the same rule.
- Nothing is sent from the TV; the page is Beyond's own public site.

## Consequences

The next election (or a by-election) is the same pattern: point it at that night's page and set the end date. If a
lot of events like this come up, a list on GitHub Pages (like `docs/art/seasons.json`) would let the button change
without an app update.
