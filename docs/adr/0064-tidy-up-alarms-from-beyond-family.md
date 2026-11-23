# 0064. Tidy-up alarms: the days and a time away from Beyond Family, and the TV turns back off if nobody comes

Date: 23/11/2026. Status: accepted. Builds on 0012 (the tidy-up race turns the TV on).

## Context

Kyle asked for Beyond Family to configure the tidy-up alarms, and for the TV to turn itself off if the alarm isn't
answered within 5 minutes, "for weekend or when we're away" (23/11/2026). Until now the alarm went off every night at
one time, and a Google TV that woke itself for it in an empty house stayed on with the race showing for an hour.

## Decision

- **Beyond Family sets it** (TV › Tidy-up alarm): the time, how long, which days (0 Sunday to 6 Saturday, all seven
  to begin with), Turn the TV on for it, **Turn the TV off if nobody comes** (on to begin with) and **We're away** with
  the last day gone (`awayUntil`, YYYY-MM-DD; no alarm up to and including that day, then it carries on by itself).
  All of it rides in the same `home.tidy` from `/tv/sync` (`households.tv_tidy`, no migration). A TV that doesn't know
  the new fields goes off every night as before; a setting without them means every day, off if nobody comes.
- **The TV keeps it**, as before, so it works with the internet down. `TidyDays.java` and `Tidy.rules` in
  `web/tidy.js` work out whether today is an alarm day and when the next one is (twins; `tests/TidyDaysTest.java`,
  `tests/tidy.test.js`). Google TV books only the next real alarm and checks again when it fires.
- **Nobody comes: the TV turns itself off.** Only when the alarm opened the race (not from Games or a phone). A quiet
  line under the race says the time it will turn off. Any button at all within 5 minutes means somebody is home, and
  the line goes. Otherwise the race closes and the TV turns off the way the sleep timer and Bedtime do: Google TV
  through its own ADB (`Sleep.offNow`), LG through its power-off call, and Samsung, which lets no app turn it off, goes
  dark until a key is pressed (`Sleep.now`).
- From the remote nothing changes: the race still starts and plays on the TV alone, and Games › Tidy-up race works
  any time. The phone only sets the alarm.

## Consequences

A TV can now turn itself off after waking itself, which closes the gap 0012 left. It never turns off while someone is
using it, because using it means pressing a button. Nothing about who tidied, or whether anybody was home, is kept or
sent anywhere.
