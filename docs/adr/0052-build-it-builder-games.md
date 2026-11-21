# 0052. Build it: builder games, starting with a road

Date: 21/11/2026. Status: accepted.

## Context

Kyle asked for a builder mode: build a road by doing everything it takes in real life, in order, using the machines
and diggers; then build bridges, choosing structures that don't fall down; then plan a town with what a town really
needs (a school, a power station, water) rather than an ice cream shop, with people happy or sad when they're short.
It has to be fun and teach something, and start from the TV with the remote alone.

## Decision

- A new game file, `web/builder.js` (`Builder.open(job)`), with the jobs inside it. It is its own file so Remote
  Control Land (`rcland.js`, still being worked on) stays untouched; the machines are drawn again here, side on, for a
  building site rather than a park.
- The first job is **Build a road**: nine jobs in the real order (survey and peg out, clear the land, dig it level,
  put in the drains, spread the gravel, roll it hard, lay the asphalt, paint the lines, open the road), shown as a job
  list across the top. Each job starts with *Which machine does this job?*: four machines, one right. A wrong pick is
  never a fail: it says what that machine is really for, greys it out, and costs a star. Then ◀ ▶ drive the machine
  along the road and OK does its job where it stands. The paver is the one change of pace (▲ ▼ keep a steady speed,
  or the asphalt comes out thin or lumpy), and the line marker sprays as it passes each mark. Missed marks are touched
  up so the road is always finished; the stars remember.
- The front of the road is cut away, so the layers (soil, gravel, asphalt, the culvert under each stream) build up in
  view, with their names beside them. Each right pick shows a line on why the job matters.
- Back pauses (Keep building, How to play, Start again, Leave); Back again leaves, back to Games. The best stars and
  roads built stay on this TV under `btv.builder`; nothing is sent.
- The Games screen gets a fourth group, **Build it**, second from the top. Four groups are more than a 1080p screen,
  so on LG and Samsung the list slides up to keep the focused row in view (and the heading steps aside), and on Google
  TV the groups sit in a ScrollView. The Beyond Family note moves into the list, after the last group, so it never
  covers a row. Google TV opens the game in TableActivity's WebView (`start` "road").
- No emoji in the game (older TVs have no emoji font): everything is drawn on the canvas. The Games picture is drawn
  once by `tools/game_art.js road`.

## Consequences

Build a bridge and Plan a town come next as more jobs in the same file and more tiles in the Build it group (ADR to
follow if they change anything on the TV beyond that). `tests/builder.test.js` plays a whole road from the remote's
keys. Not yet tried on a real TV.
