# 0072. Leaving ends the light show, and the games let go when you go Home

Date: 24/11/2026. Status: accepted. Changes ADR 0041 (the light show kept the TV's sound for when you came back) and
ADR 0024 (games in TableActivity's WebView).

## Context

Kyle (24/11/2026): "Light show is causing a bug it's hanging. Maybe it keeps running in the background. Family wall not
working."

- When the remote's Home button left the light show, TableActivity was only paused. The page kept its camera stream,
  its music and its canvas, ready to start the microphone or the TV's sound again on the way back, and the WebView
  stayed alive in `:home`, the same process as the home screen, on TVs where every MB counts.
- `build.sh` copies the web files into the APK by a hand-kept list. `wall.js` (ADR 0067) and `morning.js` (ADR 0069)
  were never added, so on Google TV the Family wall button and the Morning board opened a page that had nothing to
  run. LG and Samsung load the files directly and worked.

## Decision

- Going anywhere else ends the light show: `Lights.away()` closes it (microphone, TV sound, camera, music and drawing
  all stop). Google TV calls it from `TableActivity.onPause`; LG and Samsung when the page is hidden. Coming back finds
  the light show's own buttons, one OK from starting again. The TV's sound is no longer picked up again by itself.
- Android's own question about the camera or microphone is not leaving: the page carries on under it.
- Once TableActivity is out of sight (onStop, not turning or a question on top), it finishes, freeing the WebView. The
  board games already save each move and pick up where they were.
- `build.sh` copies `wall.js` and `morning.js`, and now stops the build if `table.html` or `ask.html` loads a script or
  style it didn't copy, so a new screen can't ship dead on Google TV again.

## Consequences

- Popping out to Spotify to change the song ends the TV sound light show; it starts again with one OK.
- Not yet tried on Kyle's Sony: the hang was not reproduced here. The logs from his TV showed no crash, so the fix
  is to stop everything that could run behind the home screen.
