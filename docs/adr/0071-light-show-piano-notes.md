# 0071. Light show: Piano notes names the note being played and lights its key

Date: 24/11/2026. Status: accepted. Adds to ADR 0070.

## Context

Kyle (24/11/2026), after the six new looks: "Can it show the note. Like piano note."

## Decision

- A new look, **Piano notes**, beside the others in `web/lights.js`: the note heard, named big (C, F♯, Middle C, with
  its octave), lit on a three octave keyboard (C3 to B5; higher and lower notes light the same key an octave in), and
  the last twelve notes along the top so a tune shows as it is played.
- The note comes from the same levels and wave every look reads, on the TV (`pitch`, `noteOf`): the strongest pitch
  from 60 Hz to 2.1 kHz, helped by its second and third harmonics so a note isn't taken for its overtone, then made exact
  by autocorrelation of the wave. A new note shows only once it has held for three frames. Nothing new is read, kept or
  sent.
- Note names follow the language on screen: C D E for English, H for B in German, Do Re Mi in Portuguese, Spanish and
  Russian.

## Consequences

- One note at a time (a piano melody, someone singing, a whistle) names well. Chords and full songs name the strongest
  note, which can jump about; the look still lights and breathes with the music.
- Like every look it lies still in silence. `tests/lights.test.js` checks seven notes from A4 to G3 are named right.
- Not yet tried on a real TV with a real piano.
