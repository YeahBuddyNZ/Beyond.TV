# 0058. Screen time limits per profile

Date: 23/11/2026. Status: accepted.

## Context

Parents asked for a daily screen time limit for each kid, set on the TV, and shown kindly: no telling-off and no
countdown that makes a child anxious. Kids' profiles (ADR 0019) already keep the grown-up PIN in front of Settings.

## Decision

- **Setting it:** Who's watching › edit a kid › *Screen time a day*: no limit, 30 min, 1 h, 1 h 30, 2 h or 3 h. Only
  kids' profiles have it, and only a grown-up can edit profiles once a PIN is set.
- **What counts:** time a kid with a limit spends in apps and Live TV, from the moment they leave the home screen.
  The home screen, the screensaver and the time-up screen don't count, nor does the TV being off (a gap of more than
  6 hours counts nothing, and no single stretch counts more than 3 hours). A new day starts at midnight on the TV's
  clock. On Android a small service in the `:home` process (`ScreenTimeService`) counts every 30 seconds while a
  limited kid is watching and stops otherwise; on LG and Samsung (`web/screentime.js`) the web app counts the time it
  is hidden behind another app and time in its own Plex player.
- **Showing it:** the line under the greeting says "⏳ 40 min of screen time left". Five minutes before the end a
  gentle note says it is time to find a good place to stop.
- **When it runs out:** a full screen in the kid's own colour: "That's screen time for today, Aroha. Great watching!
  How about a game, a book, or a run around outside?" OK goes back to the home screen, where the apps ask again.
  *Grown-up: 15 more minutes* asks for the PIN (straight away if there is none), and *Switch who's watching* lets
  someone else watch. On Android the screen comes over the app (Beyond TV allows itself to draw over apps once,
  through the TV's own ADB, when a limit is first set); if that isn't allowed, a note shows instead.
- **Nothing leaves the TV.** Limits and minutes are kept apart from the people list, so a Beyond Family sync never
  wipes them, and nothing about them goes in the daily check-in.
- The rules are in `ScreenTime.java` (`tests/ScreenTimeTest.java`, run in CI) and `web/screentime.js`
  (`tests/screentime.test.js`). Change one, change both.

## Consequences

It is a family tool, not a lock: the TV's own Settings and the remote's input button still work, and a determined
teenager can switch profiles if there is no PIN. Limits set from the Beyond Family app can come later.
