# 0043. Learn chess, and How to play for every game

Date: 18/11/2026. Status: accepted.

## Context

Kyle (18/11/2026): "On Beyond TV chess, can you make a training mode. So it will teach them how to play and the moves
and why and what they could have done with all the rules and how it all works." And: "Full instructions on every
game." Chess (ADR 0033) had every rule but explained none of them, and the debrief only gave tips at the end. The other
games said a line about themselves on the picker and nothing more, so a kid (or a grandparent) who didn't know a game
had nobody to ask.

## Decision

**Learn chess** is a card next to Chess in Games › Board and card games (`web/chesscoach.js`, on Google TV in
`TableActivity` like the other board games). It holds:

- **Fifteen lessons**, one idea each: the board and the aim, the pawn, rook, bishop, queen, knight and king, check,
  checkmate, castling, promotion, en passant, stalemate, the other draws, and points and good habits. Each is a few
  short lines, then (for all but three) a position on the real board to try it with the remote: take every pawn with
  the piece, take the rook giving check, mate in one, castle, promote, take en passant, mate without stalemating. A
  wrong try says why and puts the pieces back. Lessons done are ticked per person, kept on this TV with the robots'
  levels (`Table.record(person, 'lessons')`), never sent.
- **Play with a coach**: White against Kea at the person's own Learn chess level (its own record, `learn`, so it never
  moves their Chess level). After every move the coach grades it (great, good, not bad, careful), says why in plain
  words (it takes the middle, brings a knight out, puts the king in check, leaves the bishop unprotected, and so on) and
  what would have been better. OK on an empty square shows a good move on the board, and why. Before a big mistake (a
  missed checkmate, or worse by about a piece) it asks *Are you sure?*: try again, show me a better move, or keep my
  move. After each robot move it says what the robot did and what of yours is under attack. The grading uses the same
  two-move look ahead the debrief already used (`rank` in `chess.js`); the reasons are worked out on the board
  (`ChessCoach.why`), never made up.

**How to play** (`web/guides.js`): a guide for every game, a few pages each (the aim, the remote, the rules, tips),
turned with left and right, in words a kid can follow. It is reachable before and during play:

- Games › How to play lists every game (Google TV: `TableActivity` start `guides`).
- The board and card games' setup screen, and the pause screen Back brings up mid-game (Keep playing, How to play,
  Leave).
- The silly games, the arcade (and ▼ on the arcade's pause screen), school lunches and the light show each have a How
  to play button.

The guides and lessons are in all five languages in their own files, like the silly games' lines, because they are the
game rather than the screen around it. `tests/learn.test.js` checks every lesson can be passed with the moves the board
allows (and can be got wrong), the coach's grading on known positions, and that every guide line is in five languages
with no em dashes.

## Consequences

- Karaoke, a party, quiz night, the dinner question, the tidy-up race and bedtime breathing are Android screens on
  Google TV, so there their guide is in Games › How to play rather than inside the game.
- Five cards on the board game picker: the cards are a little narrower when there are more than four.
- A new game adds its guide to `guides.js` (and to `ORDER`) in the same change; the test fails a game in `ORDER` with
  no guide.
