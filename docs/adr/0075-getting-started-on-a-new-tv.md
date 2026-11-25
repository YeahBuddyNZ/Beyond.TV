# 0075. Getting started on a new TV: three big-button questions, then the Drop Sky check

Date: 26/11/2026. Status: accepted.

## Context

Kyle (25/11/2026) asked for a first-run setup on the TV: big buttons, the remote only, no techy settings, ending with
the Drop Sky setup check (gobeyond.nz/tv/check). Until now a new TV opened straight on the home screen with Auckland's
weather (or the time zone's city on LG and Samsung), and everything else was waiting in Settings, where people who
aren't technical rarely go.

## Decision

- The first time the home screen comes up on a new TV it opens Getting started (`SetupActivity` on Google TV,
  `web/setup.js` on LG and Samsung, the same steps):
  1. Kia ora, three quick questions. *Let's go* or *Not now*.
  2. Where do you live? Sixteen New Zealand towns as big buttons (the same list and places on both, checked by
     `tests/setup.test.js`), or *Somewhere else*, which changes nothing.
  3. Who watches this TV? *Just grown-ups* or *Grown-ups and kids*. Kids only changes where it ends: on the people
     editor, so the family can be added straight away.
  4. A te reo Māori word each day? Sets the existing word of the day switch.
  5. All set, and could you drop Sky? A code to scan with a phone for gobeyond.nz/tv/check, with the address written
     under it. Google TV draws the code with `Qr`; LG and Samsung show it as `web/icons/tv-check-qr.svg`, drawn once by
     the same encoder, because the address never changes.
- Every answer is an existing setting (city, word of the day, people), so it can be changed later the usual way. Back
  goes a step back; Back or *Not now* on the first step leaves it alone for good.
- It shows once per TV. A TV that already had Beyond TV before this version (Google TV: installed earlier than its
  last update; LG and Samsung: anything already saved by the home screen) never sees it.
- Nothing is sent anywhere. The town is kept on the TV like the city in Settings; the phone opens the setup check
  itself.
- On LG and Samsung a picked town is saved as `place` in the home screen's settings and wins over the build's city
  and the time zone's. The home screen reloads once so the weather and sky follow it.

## Consequences

- A new TV is set up for its town and its people without opening Settings, and every new install is pointed at the
  Drop Sky check.
- Only New Zealand towns are offered. Anyone elsewhere presses *Somewhere else* and picks their city in Settings, as
  before.
- Not yet tried on a real TV: checked in a browser at 1920 x 1080 (LG and Samsung) and by CI's build (Google TV).
