# 0047. The Games screen: pictures in groups, and Back goes back one

Date: 21/11/2026. Status: accepted.

## Context

The Games screen had grown to fifteen pill buttons in a grid, all looking alike. Kyle asked for thumbnails and for the
games to be sorted into groups. He also found that leaving a game took him out of Games altogether: on Google TV,
GamesActivity closed itself as a game opened, so leaving the game landed on the home screen; on LG and Samsung the Games
layer closed the same way. Board and card games added a step, because its game list sat on top of Who's playing?, so
Back from the list went to the list of names. Kyle: "It needs to go back one. So in a game, back to the games list."

## Decision

- The Games screen is pictures in three groups: *Let's play* (Remote Control Land, Arcade, Board and card games, Silly
  games, How to play), *Party time* (Karaoke, Party, Light show, Quiz night, Dinner question) and *Round the house*
  (School lunches, Tidy-up race, Bedtime breathing). Each picture is a little scene of our own, drawn once by
  `tools/game_art.js` into `web/games/<id>.jpg` (560 x 316, about 15 KB each). The TVs show the pictures, so no TV
  needs an emoji font; `build.sh` puts them in the APK and `tools/webapp.py` in the LG and Samsung apps. The focused
  picture grows a little with a lilac ring. `GamesActivity.java` and `web/games.js` hold the same groups in the same order.
- Back goes back one step. On Google TV, GamesActivity stays open under the game, so closing the game comes back to it.
  On LG and Samsung the Games layer stays open under the game (`hub: true`), and a game's Done uses `UI.leaveGame()`,
  which closes layers down to the Games screen rather than all of them.
- In Board and card games the game list takes the place of Who's playing? once people are picked, so Back from the
  list goes back to the Games screen. A *Who's playing?* button on the list goes back to change them. Another game
  after a debrief returns to the list that is already open instead of opening a second one.

## Consequences

A new game adds a picture (a scene in `tools/game_art.js`, then `node tools/game_art.js`) and its tile in both
files. Fifteen tiles fit on a 1080p screen in rows of five; a sixth in a group means a second row or a new group.
