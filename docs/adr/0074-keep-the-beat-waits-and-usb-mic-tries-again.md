# 0074. Keep the beat waits for a tap, and a silent USB microphone is tried other ways

Date: 24/11/2026. Status: accepted. Changes ADR 0044 (Keep the beat) and ADR 0050 (Listen to the room).

## Context

Kyle (24/11/2026), with a video of his Sony and a USB webcam: "There is no sound but it's showing it moving."

In the video, Listen to the room had heard exact silence from the webcam's microphone for three seconds, said "The
microphone isn't hearing anything", and switched to Keep the beat, which played a made-up beat at 120 a minute straight
away. The room was quiet, so the lights danced to nothing.

## Decision

- Keep the beat lies still until the first OK. The beat starts on that tap and the speed comes from the taps, as
  before. The rule that only real sound moves the lights now holds here too.
- A USB microphone that gives exact silence is opened another way before giving up (`RoomSound.next`): other
  recording sources (camcorder, voice recognition, unprocessed, default) and rates (48, 44.1, 16 kHz), then Android's
  own default microphone, a second and a half each. Some TVs only hand a webcam's sound over through one of them.
  Only once every way is silent does it say so and wait for taps.
- Nothing new is read, kept or sent: the same levels as before.

## Consequences

- Picking Keep the beat shows still lights and its words until someone taps.
- Not yet tried on Kyle's Sony: whether one of the other ways hears his webcam is only known on the TV.
