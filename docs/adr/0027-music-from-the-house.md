# 0027. The family's own music on the TV

Date: 27/10/2026. Status: accepted.

## Context

Kyle wants the TV to notice when the family's music is playing on the house network and show it, without anybody
setting anything up. The music is Beyond Music (YeahBuddyNZ/Beyond-Music): albums the family owns, CDs copied in, and
New Zealand radio, served on port 8097 from a Mac, a Raspberry Pi or the Beyond Home box. It answers `GET /api/hello`
with `{app: "beyond-music"}` and has its own TV screens, driven by the remote.

## Decision

- **Finding it.** The TV looks where it found the music last, then `beyond-music.local` (the name the music server
  answers to on the house network), then the Beyond Home box's own address, again every five minutes while nothing
  answers. On Google TV, Android doesn't always answer `.local` names, so the TV asks itself: one multicast DNS
  question from its own port, which Beyond Music answers straight back (`Mdns.java`). Only an address on the home
  network counts.
- **Showing it.** Found, Music joins the apps: on LG and Samsung a Music app on the shelf, third after Netflix and
  YouTube, and added to a shelf somebody already chose; on Google TV a Music button up in the corner beside Live TV
  and the inputs. The first time, the TV says so once. Nothing found, nothing shows.
- **Playing it.** Opening it shows Beyond Music's own TV screens full screen, so there is one music app to keep up,
  not two: an iframe on LG and Samsung (`web/music.js`), a WebView on Google TV (`MusicActivity`). Back goes back
  inside Beyond Music first; at its first screen it hands Back to Beyond TV (`beyondBack()` on Google TV, a
  `postMessage` from the iframe), and Music closes.
- **Cleartext stays off on Google TV.** The WebView never asks the home network over plain http itself. It asks a
  relay on 127.0.0.1 (`MusicRelay`), the one address the network rules (`res/xml/network_security_config.xml`) let it
  use without https, which passes each request to that one music server over its own socket: a plain path only,
  the server's own Host, no Origin or Referer, songs streamed in pieces both ways. The relay lives only while Music
  is open.

## Consequences

- Nothing about what anybody plays leaves the house; Beyond TV keeps only the music server's address.
- Leaving Music stops the music. Music that keeps playing behind the home screen is a later step.
- Not yet run on a real TV: the relay and the mDNS question are tested in CI (`tests/MusicTest.java`), and the LG and
  Samsung side in a browser against a real Beyond Music server.
