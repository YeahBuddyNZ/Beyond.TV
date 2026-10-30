# 0035. The arcade: four remote-only games

Date: 30/10/2026. Status: accepted.

## Context

Kyle asked for arcade games on the TV, and had made some of his own in GitHub (Pac-Man, Space Invaders, Snake and
Pong). Those were written for a keyboard and a mouse in React. A TV remote on Google TV sends one press per push
(`TableActivity` forwards a key on its first down only, so a held OK doesn't slap over and over), which rules out games
that need a key held down.

## Decision

`web/arcade.js` holds four games drawn on one canvas, with our own names and art: Eel, Paddle, Sky Guard and Dot Chase.
They are the genres, not copies: no other game's characters, names or pictures.

- Every game steers by turning: a press of a direction sets it and the thing keeps going. OK fires or stops, and Down
  stops the ship. Back pauses, and Back again leaves.
- Paddle's robot gets quicker each time the person wins (kept on this TV), so it stays fair as people get better.
- Sounds come from `sfx.js`. Bests are kept in the TV's own storage and never sent anywhere.
- It is the same file on Google TV (`TableActivity`, start `arcade`), LG and Samsung, started from Games › Arcade.
- The rules that can be tested without a screen (the maze, turning, bouncing, the jellies' pace) are in
  `tests/arcade.test.js`, along with each game played by random presses.

## Consequences

Every game that needs held keys is out; a new arcade game must work on one press per push. Kids' time limits and awards
come next and will sit around this screen, not inside the games.
