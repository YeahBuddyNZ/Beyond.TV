# 0057. The family scoreboard and Daily chores, with stars for Candy Land

Date: 23/11/2026. Status: accepted.

## Context

Kyle asked for two things on the TV: a family scoreboard across all the games, with weekly winners for each kid, and a
daily chore and tidy challenge that earns stars to spend in Lolly Land (London's Candy Land on the TV, ADR 0056). Like
every game they start from the TV with the remote (ADR 0021); a phone is never needed. Kids aren't technical, and some
can't read yet.

## Decision

Two new screens under Games › Round the house, each a plain ES5 file that Google TV runs in TableActivity's WebView
(start `scores` and `chores`) and LG and Samsung run on the home screen.

**The family scoreboard** (`web/scores.js`).

- Points per person, a week at a time, Monday to Sunday on the TV's clock. Win a game: 3. Finish one: 1 or 2 (a race,
  a road, a bridge, a town, a round in Candy Land, an arcade game; a new best is 3). Each chore: 1, and 2 more for all of
  today's. The tidy-up race: 3 for first, 2 for second, 1 for everyone else.
- When the week ends, every person who scored gets their own award for what they did best (Arcade ace, Chore champion,
  Master builder, Stunt star), and the most points is the champion of the week, joint when level. So every kid wins
  something. The first look in a new week opens on last week's winners.
- Who scores: games with players name them (board games, silly games, the tidy-up race). A game for one (the arcade,
  Remote Control Land, Candy Land, Build it) scores for whoever is watching; on the Family profile it asks *Who's
  playing?* first, with *Just play* to play for no points. Family, guests, robots and visitors score nothing.
- Kept in the TV's own storage (`btv.scores`), ten weeks of it. Google TV's own tidy-up race (TidyActivity) keeps its
  places in the app's files (`ScoreLog.java`), and the scoreboard reads them through `BeyondTable.scores`.

**Daily chores** (`web/chores.js`).

- A column for each kid (everyone, when there are no kids), a tile for each chore with a picture as well as words. OK
  ticks it, OK again unticks it. Each tick is a star and a point; all of today's is the daily challenge, 2 more of each,
  paid once a day. An untick takes back what it gave, never below no stars.
- Five chores to start (make my bed, get dressed, brush my teeth, tidy my room, put my clothes away), from eight. A
  grown-up changes them with *Change the chores*, behind the grown-up PIN.
- Taking part in the tidy-up race ticks *Tidy my room* by itself, once a day.
- A new day starts the ticks again; stars keep. Kept in `btv.chores`; nothing is sent.

**The Star Stall** in Candy Land (`web/candy.js`), its seventh place: stars buy a sparkle shower (1 star, 10
sparkles), magic rain that makes the whole garden ready to pick (2), a star crown (4) and star wings (4), the last two
bought once and then worn from the Dress-up Castle. *Spend in Candy Land* on a kid's chores goes straight there for
that kid; otherwise the stall asks whose stars. Nothing is ever lost: not enough stars says how many more and to tick
off a chore.

Every word is in all five languages; How to play has a guide for both. `tests/scores.test.js` checks the weeks, the
awards, the chores' stars and points, the tidy-up race tick, and the stall.

## Consequences

The scoreboard and the chores live only on each TV, so two TVs in one house keep their own. Beyond Family's own jobs
(Earn your screen) are separate for now; joining them, and ticking chores from a phone, can come later without
changing what the TV does. Public pages call the candy game Lolly Land, as ADR 0056 says.
