# 0049. Remote Control Land: race mode, two players, and a camera you can find

Date: 21/11/2026. Status: accepted. Adds to ADR 0046 and ADR 0048.

## Context

Kyle asked for a race mode "where two players can race a track and whoever gets the best time. But also points for
stunts." He also couldn't find how to change the camera: ADR 0048 put it on the machines screen, in the pause menu and
on the coloured buttons, and nothing on the driving screen said so. Many remotes have no coloured buttons.

## Decision

Still one file (`web/rcland.js`), plain ES5 on one canvas.

- **A Mode row** on the machines screen: Free drive (as before), Race, and Race: 2 players.
- **A race** is two laps through numbered gates round the park (or round the lake on a water machine). Only the next
  gate counts, an arrow at the top points to it, and it flashes. A 3, 2, 1 countdown holds the machine still, then the
  clock runs. The panel top right shows the player, the lap, the time and the stunt points.
- **Stunts count**: every point from big air and tricks (with the combo) adds up, and every 500 takes a second off the
  time. The total is `max(0, time - stunts / 500)`; the lowest total wins.
- **Two players take turns on one remote** (hot seat): player 1 races, the results show their total and say "Player 2's
  turn: pass the remote", player 2 picks a machine and races, then the results show both and the winner (or a tie). TVs
  have one remote, so a split screen was not worth its cost on old TVs.
- The best race total is kept on the TV (`btv.rcland`: `race` for land, `raceWater` for the lake).
- **The camera is on screen the whole time**: under the score, which camera you are on and "Back, then ◀ ▶". In the
  pause menu ◀ ▶ change the camera on any row, so Back then ◀ ▶ works on every remote. Channel up and down and Info
  change it too where a remote has them, as well as the coloured buttons and 1, 2, 3.
- How to play gets a Race page, and its Cameras page says Back then ◀ ▶.

## Consequences

- Nothing new to download; free drive is unchanged apart from the camera chip under the score.
- Two players race one after the other, not side by side.
- Not yet tried on a real TV.
