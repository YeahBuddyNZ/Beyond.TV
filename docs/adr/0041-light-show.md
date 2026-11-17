# 0041. Light show: the room's music drawn as light

Date: 17/11/2026. Status: accepted.

## Context

Kyle found vizz.fm, a music visualiser in the browser, and wanted that on the TV: "visualisation and creating an audio
experience for the Beyond TV, using cameras and microphones on the TV", started from the remote. vizz.fm is closed
source with no licence (Mathew Preziotte's; his older party-mode is CC BY-NC, which doesn't sit with our GPL), so we
can't ship it. Kyle chose to build our own and ask Mathew about vizz.fm separately (17/11/2026).

Most TVs have no camera, and the microphone in a remote belongs to the voice assistant: apps can't listen through it.
A USB microphone or webcam does work on most Google TVs. Older LG and Samsung sets and 1 GB Google TVs struggle with
heavy 3D in a browser.

## Decision

`web/lights.js` is the Light show, in Games, on Google TV (`TableActivity`, start `lights`), LG and Samsung. One 2D
canvas, our own looks in Beyond's colours and four dots: Ring of light, Northern lights, Shooting stars and Dancing
dots. Left and right change the look, OK skips the song, Back leaves.

Where the sound comes from, picked on the TV:

- **Our music**: when Beyond Music answers, the Light show shuffles the family's own songs and plays them itself, so it
  can read them. On Google TV through the music relay (ADR 0027), started by `BeyondTable.music()`; Beyond Music
  answers a GET with no Origin (only the relay sends none) with `Access-Control-Allow-Origin: *` so the page may read
  the sound.
- **Listen to the room**: only shown when the TV has a microphone. Google TV asks Android once (`RECORD_AUDIO`, in the
  manifest with the microphone marked not required), and the WebView grants only the microphone, only to our own page.
  LG and Samsung ask the way their browser does. The sound never goes to the speakers.
- **Just lights**: no sound, a made-up beat.

The sound is only read as how loud each pitch is, each frame, on the TV. Nothing is recorded, kept or sent, and the
picker says so.

A TV that can't keep up (frames over 24 ms on average) drops to a light mode by itself: half the pixels, fewer stars and
ribbons, no trails. Google TV starts in it on Android 9 to 11 and on low-RAM TVs.

## Consequences

The camera waits for a later step (a dance mirror, kept on the TV like the microphone), and needs its own ADR. If
Mathew says yes to vizz.fm, it would sit beside these looks, not replace them. `tests/lights.test.js` covers the sums
and draws every look; the Light show has not yet been seen on a real TV.
