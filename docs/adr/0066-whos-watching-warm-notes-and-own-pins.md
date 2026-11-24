# 0066. Who's watching: grown-ups first, warm notes, and a grown-up's own PIN with tap to allow

Date: 24/11/2026. Status: accepted. Builds on 0019 (teen profiles) and the shared TV requests in Beyond Family.

## Context

Kyle (24/11/2026, with a photo of his TV): adults first with Mum first, then the kids; little animated notes on the
Who's watching screen ("Your mum loves you", "You're doing amazing at school", "Keep up the good work at kindy"),
lots of positive things; smaller faces to make room; and PINs on grown-ups' profiles, with a tap to allow from the
Beyond Family app. Everything still has to start from the TV with the remote: the phone is optional.

## Decision

- **Order.** Family first (still one press away), then grown-ups with whoever is marked Mum leading, then the kids,
  then visitors from other homes. Otherwise the order people came in. `WarmNotes.rank` and `Warm.order` (twins).
  Mum or Dad is set on the TV in Manage people (*Who they are*), kept on that TV only.
- **Warm notes.** One kind line at a time under the faces, rising in, staying about five seconds and drifting away,
  with a dot in that person's colour and a little hop of their face. `WarmNotes.java` and `web/warm.js` (twins,
  tested by `tests/WarmNotesTest.java` and `tests/warm.test.js`). Fair by design: everyone gets a turn before anybody
  gets a second, and every kid draws from the same lines, so no child is singled out. Kids get lines about kindy,
  school or college when known; grown-ups get thank-yous; "{grown-up} loves you, {kid}" names the house's grown-ups
  in turn, by name, so it is true in a blended family. Nothing is invented about anybody. Reduced motion keeps the
  fade and drops the movement. All five languages.
- **Kindy, school or college** comes from the birthday in Beyond Family as one word (`stage` in `/tv/sync`, never the
  birthday), or is set on the TV in Manage people, which wins.
- **Smaller faces** on Who's watching only; Manage people keeps the bigger ones.
- **A grown-up's own PIN.** Optional, set in Manage people (*Their own PIN*), typed twice; changing or taking it off
  needs it typed first. Kept on the TV only: Google TV keeps a SHA-256 of the id and PIN, LG and Samsung keep it like
  the grown-up PIN. Picking that profile from someone else's asks for it. The house's grown-up PIN for kids stays as
  it was.
- **Typed with the remote.** The PIN page is now a number pad on screen on Google TV too (it was the TV's keyboard),
  so arrows and OK are all it takes; a remote with numbers types them straight in.
- **Tap to allow.** When the grown-up is in Beyond Family and the TV is linked, *Allow from my phone* asks Beyond
  Family (`POST /tv/requests`, kind `unlock`, shared with the kids' requests). Only that person's own phone is asked and
  only they can answer; the TV checks `GET /tv/requests/:id` every two seconds for up to two minutes. Allow opens the
  profile; anything else says so kindly and the pad is still there.

## Consequences

The screen says something lovely every few seconds without anybody setting it up. A PIN never leaves the TV, and the
phone only ever answers yes or no. Mum first needs one choice on each TV, because Beyond Family doesn't know who is
whose mum and shouldn't guess.
