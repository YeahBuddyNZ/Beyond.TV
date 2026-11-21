# 0050. The light show hears the room, keeps the beat, and ripples when you wave

Date: 21/11/2026. Status: accepted. Adds to ADR 0044; the rest of 0041 and 0044 stands.

## Context

Kyle (21/11/2026): "The light show game doesn't pick up music in the background. Only tv music. Which doesn't really
work." And: "Would it be possible to use a camera connected to ripple the effects with sound. Like a hand wave."

On Google TV, *Listen to the room* asked the WebView for a microphone, and the WebView always took Android's default
input. On most Google TVs that is the remote's microphone, which only listens while its button is held: the show got
exact silence, lay still and said "Play some music in the room", even with music playing. A USB webcam or microphone
plugged in was never picked over it. Many TVs and remotes have no microphone at all, and then the only choices were
music the TV itself plays, or Calm lights.

## Decision

- **Google TV reads the microphone itself** (`RoomSound.java`, `AudioRecord`), picking a USB microphone or webcam
  first, then one built into the TV, then Android's default. It gives the page the same levels and wave shape as
  *The TV's sound* (an FFT on the TV, the AnalyserNode's scale), plus the loudest sample lately. The sound is read into
  one small buffer and overwritten block by block: never kept, written or sent. LG and Samsung keep the browser's
  microphone.
- **An asleep microphone is told apart from a quiet room** (`sleepy` in `web/lights.js`): a real microphone always
  hisses a little; one that gives exact digital silence for three seconds is asleep. The show then says so in plain
  words (the remote's microphone only listens while you hold its button; a USB webcam or microphone plugged into the TV
  can hear the room) and switches to Keep the beat, so it never just sits there.
- **The picker says up front** when there's no microphone, or only one that's probably the remote's, and what to plug
  in.
- **Keep the beat**, a new choice for any TV: a made-up band (kick, snare, hi-hat and a chord that moves every two
  bars, `beatFrame`) that every look reads like real sound. The person keeps it in time with the music in the room by
  tapping OK (the beat lands on each tap, the speed comes from the last few taps, 60 to 180 a minute), and ▲ ▼ make it
  faster or slower. It is picked on purpose and named for what it is, so it doesn't undo ADR 0044's rule that silence
  stays still: the music never seems to be heard when it isn't.
- **Wave to make ripples**, an on and off switch in the picker, shown only where a camera is there (Google TV: a
  camera is plugged in or built in; LG and Samsung: the browser lists one). The camera's picture is shrunk to 64 by 36
  grey dots about twelve times a second and compared with the one before in a 16 by 9 grid (`motion`); where a hand
  moves, a ripple of light spreads, mirrored so it follows you, faster and wider the louder the music, flashing ember on
  a beat. It works over every look, Keep the beat and Calm lights. Google TV asks Android's own camera question the
  first time; the picture is never shown, kept or sent. This needs the CAMERA permission (asked only when someone turns
  it on) and the camera features marked not required, so TVs without one still install.
- **The phone as a microphone or camera is not built.** A phone in Beyond Family reaches the TV through Beyond Family's
  server, which is too slow to keep a beat, and a phone's browser won't open its microphone or camera for a page on the
  house network without a certificate. Revisit once the TV and the Beyond Family app talk on the house network directly.

## Consequences

- Most Google TVs still can't hear the room without something plugged in: their only microphone is the remote's. The
  show now says so instead of looking broken, and Keep the beat keeps it lively.
- Most TVs have no camera: Wave to make ripples needs a webcam the TV accepts (a USB webcam on most Google TVs; some LG
  and Samsung models take their maker's own camera, and whether their web apps may open it is untested).
- A new permission (CAMERA) and a new kind of looking. The README's Privacy section and the website say what it reads.
- Not yet tried on a real TV: which input a TV calls built in, and whether its WebView opens a USB webcam, differ
  between makers.
- `tests/lights.test.js` checks the asleep microphone against a quiet room, tapping along, the made-up band, movement
  and ripples.
