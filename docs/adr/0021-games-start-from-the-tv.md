# 0021. Games start from the TV

Date: 23/10/2026. Status: accepted.

## Context

Karaoke night (ADR 0020), quiz night and the dinner question could only be started from Beyond Family on a phone. Kyle
went looking for karaoke on the TV and couldn't find it: "all games, all of this should be started from the TV", and
under the Family profile, so everyone on the couch can see it. The Party button (ADR 0017) was the only game on the
home screen.

## Decision

A Games button (the gamepad) takes the Party button's place in the round buttons at the top of the home screen, for
everyone, the Family profile included. It holds every game and family activity: Karaoke, Party, Quiz night, Dinner
question, Tidy-up race and Bedtime breathing. `GamesActivity.java` on Google TV, `Games.open` in `web/games.js` on LG
and Samsung.

- **Karaoke** asks who's singing (anyone on this TV, or everyone together), then the song: the family's own songs
  from Beyond Family first, then a short list most families know, or any song typed or said on the remote. A song
  found that way goes on the family's list in Beyond Family too (`POST /tv/karaoke/songs`). Titles and artists only;
  the words come from the video and Beyond never keeps lyrics. `KaraokePickActivity.java`, `Karaoke.choose`.
- **Quiz night and the dinner question** still need phones for the answers, so they need the TV linked to Beyond
  Family. The TV starts them and moves them on: Show the answer, Next question and Finish sit on the screen
  (`POST /tv/quiz` and `POST /tv/question` with `start`, `reveal`, `next` or `end`). Beyond Family then sends the same
  commands a phone would, so every TV at home follows. A TV that isn't linked says so instead.
- **Party, the tidy-up race and bedtime breathing** start on this TV only, as before.

The TV sends the watcher's member id with a start, so Beyond Family can say who started it. Nothing new is stored on
the TV, and the TV learns nothing new: the family's songs (title, artist, video id) come with the sync it already has.

Who's watching now fits everyone on one screen: up to seven faces in a row, smaller as the family grows, then two or
three rows. No sideways scroll.

## Consequences

Anybody with the remote can start or end a quiz or the dinner question, including kids. That matches the TV being the
family's screen; on a phone, revealing stays a grown-up's button. Starting from a phone still works.
