# 0044. The light show follows real sound, and can hear the TV

Date: 18/11/2026. Status: accepted. Replaces the looks and "Just lights" of ADR 0041; the rest of 0041 stands.

## Context

Kyle (18/11/2026): "Can you make the light show more like what we want, more like a visualiser, it's bouncing with no
audio playing." ADR 0041's light show moved without sound on purpose: "Just lights" played a made-up 112 bpm beat,
Northern lights and the ring drifted on a timer, and a quiet room's hiss still nudged every look. Its looks read the
sound as three bands (lows, middle, highs), so even with music they pulsed more than they followed it. And on Google TV
the music people actually play (Spotify, YouTube Music, a radio app) couldn't drive it at all.

## Decision

- **Only real sound moves it.** Every frame goes through a noise gate (`gate` in `web/lights.js`): it learns the
  steady hum per pitch (a fridge, the TV's own hiss) and takes it away, then anything under 12% counts as nothing.
  Silence gives zeros, so every look lies flat and still. After two seconds of quiet a line says what would wake it
  (play music in the room; start music in an app like Spotify; waiting for music). Nothing turns on a timer.
- **A real visualiser.** The pitches are read on a log scale from 40 Hz to 14 kHz (`logBands`), the way ears hear
  them, from a 2048-point analyser on -85 to -20 dB, plus the shape of the wave. Four looks: **Bars** (a spectrum with
  falling peak caps), **Sound wave** (an oscilloscope, steadied on each rising edge), **Ring of light** (the spectrum
  round a circle, turning only as fast as the music is loud) and **Shooting stars** (born only on beats and loud
  moments). Northern lights and Dancing dots are gone: neither showed the music itself.
- **Calm lights** replaces Just lights: the one choice with no sound, Beyond's four dots drifting slowly round the
  middle, about a minute a lap, no beat.
- **The TV's sound, on Google TV.** A new source, *The TV's sound*, reads Android's Visualizer on the TV's whole
  output (session 0, `TvSound.java`), so music playing in another app can be drawn. It needs RECORD_AUDIO (asked once,
  the same prompt as the microphone) and MODIFY_AUDIO_SETTINGS (no prompt). Like the microphone it only ever gives
  levels and the wave's shape, a few hundred numbers a frame, read on the TV and never kept or sent. It lets go when
  someone leaves the light show (to change the song) and picks up again when they come back. Some TVs refuse session
  0: the page then says so and points at *Listen to the room*. LG and Samsung have no way for a web app to hear the
  TV's output, so they keep Our music and the microphone.
- If Beyond Music plays but the browser can't hear it (a server without the CORS header of Beyond Music PR #11), the
  show says so once and reports it through the check-in (`Checkin.error('lights', ...)`), with no song or name.

## Consequences

- A quiet room shows a still screen and a hint, not a show. That's the point: the lights follow the music.
- The Visualizer adds a permission (MODIFY_AUDIO_SETTINGS) and a new kind of listening; the README's Privacy section
  and the website say what it reads. Not yet tried on a real TV: Visualizer on session 0 differs between makers.
- `tests/lights.test.js` checks that every look moves with music and stays still in silence, and that the ring never
  turns without sound.
