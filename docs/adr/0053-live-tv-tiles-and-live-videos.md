# 0053. Live TV: logo tiles, more channels, and the video that is live now

Date: 21/11/2026. Status: accepted.

## Context

Live TV (ADR 0042) went onto Kyle's Sony on 21/11/2026. Three things came back. The channels were plain text pills,
and Kyle asked for "beautiful icons that relate to the channels. Think Netflix, Apple TV". Many channels said
"Video not found". And playing was "very laggy". Kyle also asked for more popular channels and a featured row.

"Video not found" came from YouTube's `embed/live_stream?channel=` link: it only works while a channel runs exactly one
live stream, and big news channels often run two (a 24/7 stream and an event). The lag came from YouTube's web player
inside our WebView on a TV's weak browser, with our moving backdrop still drawing underneath.

## Decision

- **Logo tiles.** Each channel is a square tile with the channel's own logo (its YouTube channel picture), its name and
  where it's from underneath, growing with a lilac ring when focused, like the Games screen. Apps (Freeview, TVNZ+,
  ThreeNow, Plex, Sky Sport Now, Neon) show their own icon (LG, Samsung) or TV banner (Google TV), as on the shelf.
  Rows slide sideways under the focus. A logo is only ever used on the tile that opens that channel's own stream.
- **The video that is live now.** Every hour the website build (`pages.yml`, `tools/live_now.py`) reads each channel's
  own YouTube page and writes `docs/live/now.json`: the live video each channel is streaming (the busiest, when there
  are several), and refreshes `docs/live/logos/`. TVs play that exact video. A channel that isn't live is left out, so
  nobody lands on "Video not found". If now.json is more than three days old, or a run couldn't read most channels
  (it then keeps the old file), TVs show every channel and play by channel id as before.
- **On Google TV a channel plays in the TV's YouTube app** when it has one: the TV's own video decoder, no lag. Back
  comes back to Live TV. Without the YouTube app it plays full screen in Live TV as before, with up and down changing
  channel, and the moving backdrop stops while a channel plays. LG and Samsung keep the in-app player, now by video.
- **More channels and rows.** Featured (Sky News, ABC News Live, NBC News NOW, Al Jazeera, LiveNOW from FOX, ABC News
  Australia), World news (CNN Headlines, DW, France 24, NHK World, CNA, Euronews, Bloomberg, TRT World, WION, GB News),
  Weather, space and music (FOX Weather, NASA's space station, Lofi Girl), and PBS KIDS for kids. Each channel in
  `channels.json` names its row (`group`); kids' profiles see the kids row only, beside the aerial and free-to-air apps.
  Every one is the broadcaster's own official stream.

## Consequences

The website now deploys every hour as well as on each change. YouTube may turn the build's requests away some day;
then the last now.json stands for three days and after that TVs fall back to playing by channel id, which works for
channels with one stream. On Google TV, up and down no longer change channel while a channel plays in the YouTube app;
Back and the next tile do. A channel's picture can change on YouTube: the hourly run picks it up.
