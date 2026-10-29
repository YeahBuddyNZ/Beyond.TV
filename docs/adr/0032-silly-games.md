# 0032. Silly games: party games with one remote

Date: 29/10/2026. Status: accepted. Adds to [0021](0021-games-start-from-the-tv.md) and [0024](0024-board-and-card-games-with-robots.md).

## Context

Kyle: fun games for grown-ups and kids, like "who would be the person", with lots of funny things, and people choose
on the TV. Quiz night and the dinner question need everyone's phone; these are for a room full of people with one
remote, nothing to sign in to.

## Decision

Games › **Silly games** (`web/laughs.js`), three games:

- **Who's most likely to…?** A funny line on screen, a 3, 2, 1 countdown, everyone points, then OK on whoever got
  the most fingers (or "It's a tie!"). Ten rounds, then awards: each person's funniest title ("Most likely to eat a
  whole pavlova on their own") and a crown for the most votes. Somebody who got none is "a mystery", never last.
- **Would you rather?** Two silly choices, left and right. On "go" everyone moves to that side of the room, and OK on
  the side with more people gets a quip. No score.
- **Spin for a dare.** The spinner runs round the faces, slows down and lands on someone (never the same person twice
  in a row), with a silly dare and a 15 second bar. Done it or Pass, both fine; "Who was bravest?" at any time.

Everyone in the TV's People is playing to start with, plus up to two guests. With a kid playing, or only guests, only
the family set of lines comes up; the grown-ups' extras (coffee, tabs, the rugby) join when everyone is a known grown-up.
Every line is clean either way. The lines are in all five languages inside `laughs.js`, because they are the game;
the screen's own words are in `strings.js` as usual. Nothing is kept after the game and nothing is sent anywhere.

Google TV runs the same file in TableActivity's WebView: `TableActivity.open(c, "silly")` and the page's
`BeyondTable.start()` open it instead of the board games.

## Consequences

A new line is one entry in a list, in five languages, and `tests/table-games.test.js` checks each has all five, no
dashes, and that a kid never gets the grown-ups' extras.
