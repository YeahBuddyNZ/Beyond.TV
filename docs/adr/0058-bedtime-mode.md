# 0058. Bedtime mode: calm sounds, then the TV turns itself off

Date: 23/11/2026. Status: accepted. Builds on bedtime breathing (Google TV #51, LG and Samsung) and the sleep timer.

## Context

Kyle approved a bedtime mode that dims the screen, plays calm sounds and turns the TV off by itself (23/11/2026).
Bedtime breathing already showed a breathing night light on a black screen that faded to dark, and the sleep timer
already knew how to turn each TV off.

## Decision

Bedtime breathing becomes **Bedtime**, the same light with a sound and an ending, on Google TV, LG and Samsung
(`BedtimeActivity.java`, `web/bedtime.js`).

- **A short pick first, on the remote**: a sound (Rain, Waves, Fan or Quiet, heard for a moment as it's picked), how
  long (15, 30 or 45 minutes), then Goodnight. Rain and 15 minutes to begin with; the last choice is kept on the TV.
  From the moon button at night, Games and Find. A "bedtime" command from Beyond Family still starts straight away,
  for as long as it says, with the sound picked last.
- **The sounds are made on the TV**: filtered noise (pink for rain, brown for the waves and the fan), in an
  AudioTrack on Google TV and Web Audio on LG and Samsung. Nothing downloaded, nothing licensed. The waves rise and
  fall with the light's breathing. A TV without Web Audio gets the light alone.
- **Dims, then off.** The screen is black but for the light. Over the last 40% the light and the sound fade to
  nothing, then the TV turns off: on Google TV through its own ADB, the sleep key and then the power key, the same as
  the sleep timer (`Sleep.offNow`); on LG through its power-off call. Samsung lets no app turn it off, so there the
  screen stays dark and quiet until a key is pressed.
- **Any key before the end brings the TV back**, and nothing turns off. Leaving Bedtime stops the sound.
- The TV's picture and sound settings are never changed (the volume is the TV's own).

## Consequences

The Games tile, the moon button and How to play now say Bedtime. Settings stay out of it: the only choices are the
two on the pick, which a kid can make.
