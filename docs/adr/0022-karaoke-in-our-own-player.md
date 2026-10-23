# 0022. Karaoke plays in our own player, with playlists

Date: 23/10/2026. Status: accepted. Replaces the playing half of [0020](0020-karaoke-night.md).

## Context

Kyle: "Can the Karaoke just pick the best ones with no ads? Or can we build the playlists within the Karaoke App?
... would be good if it was all in the app and didn't go to YouTube." Then: "a playlist builder is a must!" and
"We like the Lost Panda ones too, they fit in with the Beyond brand."

Under 0020 every song jumped to the YouTube app, the TV couldn't tell when it ended, and the next singer needed a
phone. YouTube's ads can't be skipped or blocked by us: YouTube Premium signed in on the TV removes them.

## Decision

- **Every TV plays karaoke in our own player**: YouTube's embedded player (youtube-nocookie) full screen inside Beyond
  TV. On Google TV it's a WebView in `KaraokeActivity`; on LG and Samsung it's `web/karaoke.js`. The player says
  when a song ends, so the night goes on by itself: the next singer's card, a five second count, their song.
  Back during a song goes to the next singer. A video that won't play in a player of ours is skipped with a note.
  Only when no video can be found at all does it fall back to the YouTube app, which ends the night.
- **Playlists**: saved line-ups of songs and who sings each (or everyone), up to 30 a family and 40 songs each,
  kept in Beyond Family (`tv_playlists`). Built, changed and played on the TV with the remote (Games, Karaoke), or on
  a phone. A phone's Play sends `karaoke-set`: the playlist's name and its turns (first name, colour, song, video id,
  search). Never a member id.
- **The best video**: when a song has no video, Beyond Family looks it up (`POST /tv/karaoke/find`), embeddable and
  safe search only, and prefers trusted karaoke channels: Sing King and Lost Panda first, then KaraFun, Stingray,
  Zoom and Global Karaoke. The video found is kept on the song so it isn't looked up again.

Beyond still never keeps or shows lyrics: the words are in the karaoke video.

## Consequences

Ads still play unless the TV's YouTube has Premium. The lookup needs a YouTube key on Beyond Family's server; without
one, songs with no video fall back to the YouTube app. Not yet tried on a real TV.
