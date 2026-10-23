# 0020. Karaoke night

Date: 23/10/2026. Status: accepted.

## Context

Kyle: "Can we do a karaoke thing and add in songs we like?" Karaoke needs the words on screen, and lyrics belong to
their publishers: Beyond can't store or show them itself.

## Decision

Beyond Family keeps the family's songs and tonight's queue (the TV page's Fun tab). Next singer sends a `karaoke`
command: the singer's first name and colour, the song and who sings it, a YouTube video id when one was pasted or
found, a search (`song artist karaoke`), how many are left and who's after. Never a member id.

The TV shows who's up, full screen over whatever is on (the last singer's song is usually still playing), counts
down from five, then plays the song's karaoke version, which brings the words:

- Google TV (`KaraokeActivity.java`): the YouTube app, at the video, or YouTube's own search when there is no video.
- LG (`web/karaoke.js`): the YouTube app, at the video (`contentTarget: v=<id>`), or opened with what to search for.
- Samsung: the video in a player of our own (YouTube's embed) when it is known, otherwise the YouTube app with what
  to search for.

OK starts at once; Back puts it away. Beyond never keeps lyrics.

## Consequences

The TV can't tell when YouTube's song ends, so the next singer comes from Next singer on a phone. A kid queued to sing
opens YouTube on the TV for that song, whatever their own shelf shows; the song and its video were chosen by the
family. Not yet tried on a real LG or Samsung.
