# 0067. The family wall and to-dos from Beyond Family, ticked with the remote

- Status: Accepted
- Date: 24/11/2026
- Decided by: Kyle ("I really want to integrate beyondfamily more. Like the wall and ticking off todos", 24/11/2026, "Yes all of them")

## Context

Linked to Beyond™ Family, the TV already had people, notes, the noticeboard and each kid's jobs for earn your screen,
but it could not tick a job, and Beyond Family's wall (stickies, the Done wall's wins) never reached it. Daily chores
(ADR 0057) live only on the TV, so a job done on the TV never counted for the parents. Kyle's rule: everything starts
from the TV with the remote; the phone is an extra.

## Decision

A **Family wall** screen (`web/wall.js`; on Google TV the same file in TableActivity, start `wall`), from a pin
button at the top of the home screen whenever the TV is linked, for everyone, kids included:

- **To-dos:** each person's own Beyond Family jobs due today (`todos` on each person in `/tv/sync`), the watcher's first.
  OK ticks one, OK again unticks it. The tick shows at once and goes to `POST /tv/todos/:id/tick`, the same completion
  the app writes (Beyond Family ADR 0052), so the parents' jobs page catches up within about 15 seconds. If Beyond
  Family can't be reached the tick goes back and says so.
- **Stars and points:** a tick on the TV is a star in Daily chores' wallet (`Chores.give`), spent at the Star Stall, and
  a point on the family scoreboard under chores; an untick takes both back. Ticks made on a phone give no stars on
  the TV (the TV can't tell who pressed it, and a sync never changes a wallet).
- **The wall:** the stickies that are up and the last seven days' wins (jobs done, green time, see-and-do bonuses),
  first names and colours only, up to six photos. Anyone can put up a sticky from the remote (`POST /tv/wall/sticky`):
  six quick ones or typed, three colours, signed with the watcher's first name. Grown-ups take stickies down in the app.
- **Elsewhere on the TV:** *Today at home* leads with the watcher's to-dos left (or the newest sticky), and the
  screensaver shows one sticky or win at a time in a corner, over photos and over art (Android: `WallCard`, drawn off
  the UI thread when the photo changes). The wall is the household's own, so it shows over art too; the clock and
  captions still don't.

Nothing is kept on the TV but the stars. Ticks and stickies are the only things sent, and only to the TV's own household.

## Consequences

One truth for jobs between the TV and the app. The people signature on both platforms leaves the to-dos out, so a
tick never makes Who's watching save or the home screen rebuild. On Android 11 the screensaver runs in the main
process (ADR for ScreensaverAlone), where the Family sync isn't held, so it shows no wall card there.

## Alternatives considered

Folding Beyond Family's to-dos into Daily chores (two kinds of tick on one screen, and chores are kids-only). Pushing
every tick to the parents' phones (noisy). Putting up drawings from the TV (the remote can't draw; notes from a phone
already do that, ADR 0025).
