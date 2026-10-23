# 0012. The tidy-up race turns the TV on, and the TV says hello

Date: 23/10/2026. Status: accepted.

## Context

Kyle's family tidies up at 7:15 every night. He asked for a tidy-up race on the TV, and for the TV to turn itself on
for it. He also asked for "a nice start sound, a tone that says peace and love".

## Decision

**The race.** A grown-up sets a time, how long (5, 10, 15 or 20 minutes) and whether to turn the TV on, in Beyond
Family. The TV keeps that setting itself, so the alarm still goes off without the internet and after a restart. At
the time, Google TV wakes itself through its own ADB with the key the TV already allowed (never asking from there),
the same way the sleep timer turns it off, then opens the race. Android 10 and later only let a screen open from the
front, so there it presses Home and Beyond TV's home screen, which sees the race is due, opens it. In Original mode on
those TVs the TV turns on but the race may not open. LG and Samsung can't switch the TV on from an app, so the race
starts only when Beyond TV is open. It can also be started any time from the remote in Beyond Family.

The race is the kids (everyone, when there are no kids), never visitors. Pressing OK on a face is "done": first,
second, third. Finishing is "All tidy!"; running out of time is "Time's up!" and kind words, never a list of who
didn't finish. Nothing is kept or sent anywhere.

**The chime.** Four soft notes rising over a low hum, one note for each of Beyond's four dots: hum G3 196 Hz; notes
G4 392, B4 493.88, D5 587.33 and F#5 739.99 Hz at 0.10, 0.34, 0.58 and 0.82 s, each a sine with its octave at 0.15,
up to 0.12 in 0.05 s and dying away over 2.2 s (time constant 0.45 s). It's made as sound in code (Chime.java,
web/chime.js), so there's no file to ship. `tools/make_chime.py` writes the same notes as a WAV for the website and
the business screens. It plays when the TV comes on or the app opens, and at the start and end of the race. Home
Settings › Sounds (the old Navigation sounds) turns it off. Its volume is the TV's own.

## Consequences

The TV can now turn itself on at a set time. It only does so when a grown-up turned that on in Beyond Family, and
switching it off in the app or unlinking the TV stops it. Turning the TV on interrupts whatever is
playing: that's the point of a tidy-up alarm.
