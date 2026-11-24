# 0069. Light show: six more looks, favourites for each person, and every look in a row

Date: 24/11/2026. Status: accepted. Adds to ADR 0041, 0044 and 0050; changes one key in Keep the beat (below).

## Context

Kyle (24/11/2026), looking at the light show on the Sony: "Build different and more that you can push right and
favourite." The show had four looks (Bars, Sound wave, Ring of light, Shooting stars), changed with ◀ ▶, and no way to
keep the ones a person likes. He also asked whether a camera works if one is hooked up: *Wave to make ripples*
(ADR 0050) is already there, shown in the picker only when the TV has a camera, and not yet tried on a real TV.

## Decision

- **Six more looks, each its own idea**, in `web/lights.js` beside the first four, so Google TV (TableActivity's
  WebView), LG and Samsung all get them: Fireworks (a rocket on each beat, bursting in the four dots' colours), Dance
  floor (tiles lit from the floor up, the lows in the middle, the colours stepping round on every beat), Tunnel (frames
  flying out of the middle as fast as the music is loud), Kaleidoscope (each pitch a dot, mirrored round the middle),
  Lava lamp (big soft blobs drifting with the music and swelling on the lows) and Galaxy (four spiral arms, the lows
  lighting the middle and the highs the edge). Like the others they only move to real sound: in silence they lie
  still (`tests/lights.test.js` draws every look, full and light, with music and in silence). Each has a lighter
  version for older and 1 GB TVs.
- **▲ hearts the look on screen** for whoever is watching (`Profiles.current()`, the family when nobody is picked).
  Favourites are kept on the TV only (`localStorage`, `bt-lights-faves`: person to look ids), never sent. ◀ ▶ go
  through the favourites first, then the rest, and the show opens on the first favourite.
- **▼ shows every look in a row** along the bottom, favourites first with a heart: ◀ ▶ try them live, ▲ hearts one,
  OK or ▼ or Back closes the row.
- **Keep the beat loses ▲ ▼ for faster and slower**, since ▲ and ▼ now mean the same in every kind of show. The speed
  still comes from tapping OK along to the music (ADR 0050), which sets it from the second tap.

## Consequences

- Ten looks, all from the remote, nothing needed on a phone.
- A person who used ▲ ▼ to nudge Keep the beat now taps OK instead; the guide and the help line say so.
- Not yet seen on a real TV. The kaleidoscope draws the most (up to 384 dots a frame in full mode); a TV that can't
  keep up drops to the light mode by itself, as before.
