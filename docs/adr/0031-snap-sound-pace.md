# 0031. Snap: sound, an easier pace and more snaps

Date: 29/10/2026. Status: accepted. Adds to [0024](0024-board-and-card-games-with-robots.md).

## Context

Kyle, after playing on the family's Sony: the slap games need sound, should be slower, and Snap needs more snaps. With
eight pictures shuffled, a match came round about one card in eight, so most of a game was waiting.

## Decision

- **Sound**, made on the TV with Web Audio (nothing to download): a card turning, a match, your slap, a robot's slap,
  taking the pile, a slap too soon, and a little tune when a person wins; Ludo gets the dice, each hop, a six, a
  token home, a catch, and a win or a loss. All in `web/sfx.js`, which the arcade will use too. Quiet when Home
  Settings › Sounds is off.
- **Slower**: a card every 2.5 seconds at level 1 down to 1.7 at level 10 (was 1.6 to 1.0), 3.2 seconds to slap a
  match (was 2.6), and a longer breath after the pile is taken.
- **More snaps**: after the shuffle, each Snap card has a 22% chance of being the same as the one before it, and the
  cards are dealt round the table from whoever turns first, so the deck's order is the order they land on the pile.
  About one card in four is a match. Nobody, robots included, sees the deck: it is the same for everyone.

## Consequences

Same on Google TV (TableActivity's WebView, which may now play sound without a tap) and LG and Samsung, since both run
`web/snap.js`. Once someone takes the pile its order is theirs, so later matches come by chance, as in real Snap.
