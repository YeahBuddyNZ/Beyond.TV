# 0061. Family photos on the screensaver, with the kids' art

Date: 23/11/2026. Status: accepted.

## Context

Kyle asked for a photo screensaver from the family's own photos, with the kids' art mixed in. The screensaver already
shows film photos or paintings (Art mode). Getting photos onto a TV is usually the hard part for people who aren't
technical: no cloud accounts, no USB sticks.

## Decision

- **Getting them on:** Beyond™ TV Settings › Home Settings › *Family photos* opens a screen with a QR code. A phone on
  the same Wi-Fi scans it and opens a small page served by the TV itself (`app/assets/photos.html`), picks *Family
  photos* or *The kids' art* (and who drew it, from the kids on the TV), and sends as many as they like. The phone
  makes each one smaller first. The address and a four-number code are on the screen too, for typing.
- **Safety:** the TV only listens while that screen is open, for 20 minutes at most (`PhotoDrop`, port 8096). It only
  answers phones on the home network, only with the code on the screen, and stops listening after 20 wrong codes.
  Nothing goes to the internet or to us.
- **Framing:** each picture is drawn once at the screensaver's size and kept in the app's own files (`FamilyPhotos`,
  at most 300, oldest first out). A photo fills the screen; a tall one sits over a soft, dark copy of itself. A
  drawing hangs on a purple wall (`#2C2458` to `#0D0C18`) in a white mat with "By Aroha" under it.
- **Showing them:** the screensaver gets a fourth choice, *Family photos*, which the first photo sent turns on. Photos
  drift slowly like the film photos; drawings hang still like Art mode, one after every two photos. No clock or caption
  is drawn over them. With none sent yet it shows the paintings. *Remove all photos* (pressed twice) clears them.
- **Android only for now.** LG and Samsung web apps can't listen for a phone; they can get the same photos through
  Beyond Family later.
- `PhotoDrop`, the order (`PhotoDrop.mix`) and the QR encoder (`Qr`, checked against a real reader) are plain Java,
  tested by `tests/PhotoDropTest.java` in CI.

## Consequences

Photos live on the TV only: a factory reset or uninstall loses them, so the phone keeps the originals. A family with
more than one TV sends to each.
