# 0081. Netflix, Disney+ and the other streaming apps always open

- Status: Accepted
- Date: 28/11/2026
- Decided by: Kyle ("Netflix and Disney are not", 28/11/2026)

## Context

Kyle said Netflix and Disney+ weren't working on his Beyond™ TV (a 2015 Sony BRAVIA on Android 8). The TV's log
showed nothing about them, because lines that name an app stay on the TV (ADR 0034). Reading the code turned up three
places where a streaming app could fail quietly:

- **The remote's app buttons on Sony.** Every Sony button was left to the TV ("Sony default").
  With the TV's own home screen off, an older BRAVIA can have nobody left to answer them, so the Netflix and Disney+
  buttons did nothing. Our filter also matched Netflix only by the scan code read from a 2022 BRAVIA, and swallowed a
  button whose app wasn't installed.
- **Finding the app.** The shelf, the remote, Find and Beyond Family's remote all ask Android for an app's launcher
  with its two shortcuts. When neither answers, the app's card simply vanished from the shelf.
- **Opening it.** When the TV entry of an app refused to start, Beyond TV said "Couldn't open" without trying the
  app's other entry.

## Decision

- On Sony, the Netflix, Disney+, Prime Video and YouTube buttons open their apps through Beyond TV by default.
  BRAVIA CORE and Crunchyroll stay with the TV. *Sony default* in Settings > Remote Buttons still hands any button back.
- On Sony, `KEYCODE_BUTTON_4` counts as the Netflix button whatever its scan code: Sony uses it for nothing else.
- A button whose app isn't on the TV goes on to the TV instead of being swallowed.
- `HomeApps.launchIntent` asks for the app's TV or phone entry itself when the two shortcuts give nothing, so the card
  stays and opens.
- When an app won't open, Beyond TV tries its phone entry before saying "Couldn't open", and the TV's log gets the
  kind of error (never the app's name) so a failure is visible in the check-in.

## Consequences

Netflix and Disney+ open from the shelf and from the remote on every TV that has them, including older Sony models.
A person who liked Sony's own handling can pick *Sony default* again. Nothing new leaves the TV beyond the error kind.
