# 0018. Messages from Beyond Family wait for OK

Date: 23/10/2026. Status: accepted.

## Context

"5 minutes to dinner" from Beyond Family showed as a card in the corner of the home screen for 15 seconds, and over
another app (YouTube, Netflix) as a small toast. Kyle: it needs to be much bigger over other apps, and they have to
accept it to close it.

## Decision

A message fills the screen over whatever is on: the icon, the words big enough to read from the couch, who sent it,
and an OK button. It stays until somebody presses OK, on the remote or on the phone's remote. Back does nothing; Home
still leaves, as it always does. A newer message replaces the one showing. `SayActivity.java` on Google TV, `say` in
`web/family.js` on LG and Samsung.

On Android 10 and up, a screen can only open over another app once Beyond TV is allowed to show over apps. Beyond TV
allows itself through the TV's own ADB (`appops set ... SYSTEM_ALERT_WINDOW allow`), only once that key is already
allowed, never asking from there. Until then, and on a TV without it, the message is a long toast as before. Android 8
and 9 need nothing.

## Consequences

Video in the other app pauses behind the message, which is the point. On LG and Samsung the message shows when Beyond
TV is open; over another app it shows when they come back to Beyond TV.
