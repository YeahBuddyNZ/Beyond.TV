# 0033. Chess, and Ludo without robots for a group

Date: 29/10/2026. Status: accepted. Adds to [0024](0024-board-and-card-games-with-robots.md).

## Context

Kyle: "Can you build in chess". Board and card games already has who's playing, robots that grow with each person
and a debrief with tips. Chess fits the same shape, with one difference: nothing is hidden and nothing is luck.

Later the same day, Kyle: "Turn off game bots by default in ludo". A family playing Ludo together doesn't want a
robot taking a seat unless they ask for one.

## Decision

Games › Board and card games › **Chess** (`web/chess.js`):

- **Who plays.** One person plays a robot; two people share the remote and take turns. With more than two chosen,
  the first two play and the screen says so. Before the game, ◀ ▶ picks who has White (White moves first).
- **The remote.** The arrows move a square around the board, OK picks a piece up and its moves show as dots (a ring
  where it would take something), OK on a dot puts it there, Back puts it down. A piece with no move says why.
  A person playing Black against a robot sees the board from Black's side.
- **The rules, all of them:** castling, en passant, check, checkmate, stalemate, and draws by too few pieces, the
  same position three times and fifty moves with nothing taken and no pawn moved. A pawn reaching the far side
  always becomes a queen (no picking a knight instead: simpler with a remote, and almost never worse). The rules
  live apart from the screen (`Chess.rules`) and are checked by counting every move a few deep from known positions,
  which catches any rule that is wrong.
- **The robot** looks ahead with alpha-beta search, following captures through at the end so it doesn't leave a
  piece hanging. The level from ADR 0024 sets how far (one move up to level 2, two up to 5, three from 6) and how
  often it slips (about half the time at level 1, never from level 8; from level 4 a slip is a so-so move, never a
  piece thrown away). It never thinks for much more than a second and a half, so old TVs don't stall. It avoids
  going back to a position seen twice when it can. Chess hides nothing, so the robot knows only what the person sees.
- **The debrief.** Each move a person makes is weighed the same way. A clearly better move becomes a kind tip:
  a checkmate that was there, a piece that could have been taken, a piece left where it could be taken straight
  after, or a stronger move; and "castle early" when they never did. Praise for castling, a new queen, pieces taken
  and checks given. A draw is a draw for everyone (half a win towards the level).
- **The pieces** are the Unicode chess symbols, white with a dark outline and black with a light one, in a font list
  that has them on most TVs. If a TV's fonts lack them, they will show as boxes: drawn pieces would be the fix.
- **Sounds** (`web/sfx.js`): a piece put down, a double beep for check, and the existing capture and win sounds.

**Ludo** now starts with no robots when two or more people are playing; one person playing alone still gets one.
Robots can be added on the same screen as before.

## Consequences

- Board and card games has four games; the cards are a little narrower so they fit across the screen.
- Not yet run on a real TV: the search speed on a 2015 webOS TV and the chess symbols in its fonts are the open
  questions.
