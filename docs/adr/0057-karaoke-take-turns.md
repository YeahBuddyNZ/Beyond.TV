# 0057. Karaoke: take turns

Date: 23/11/2026. Status: accepted.

## Context

At a karaoke night the loudest singer tends to get the remote back. Kyle asked for a song request queue so everyone
takes a turn. Like every Beyond™ TV feature it starts from the TV with the remote (ADR 0021); the phone is an extra.

## Decision

Karaoke's first screen has **Take turns** beside *Sing a song* (playlists only show once Beyond Family is linked).

- Anyone adds a song with the remote: pick who is singing (each person on the TV, or Everyone), then find the song.
  The TV says where they are in line ("Aroha is 2nd in line").
- The order is fair, not first come first served: whoever has sung least goes next, and among them whoever asked
  first. Nobody sings twice until everyone with a song waiting has had a go. Everyone songs count as nobody's.
- After each song the card says who is up next and how many are waiting, with *Add a song* on it, so the list can
  grow while people sing. When it runs dry, *Everyone's had a go!* offers another round.
- The list can be opened to take a song out, and cleared with a second press. It holds up to 60 songs and is
  forgotten 8 hours after it was last touched, so last weekend's party doesn't come back.
- It stays on the TV (Android: the `karaoke` preferences; LG and Samsung: `bt.karaoke.turns` in the TV's storage).
- The rules live once per platform and are tested: `KaraokeTurns.java` (`tests/KaraokeTurnsTest.java`, run in CI) and
  `Turns` in `web/karaoke.js` (`tests/karaoke.test.js`). Change one, change both.

## Consequences

A singer's place can move back when someone who hasn't sung yet joins the list; that is the point. Requests from the
Beyond Family app can join the same list later.
