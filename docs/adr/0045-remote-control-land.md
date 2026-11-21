# 0045. Milo's Remote Control Land: a driving game for the remote

Date: 21/11/2026. Status: accepted.

## Context

Kyle asked for a dream game for his son: pick a remote control car, a digger or another machine and drive it round,
do front flips and tricks, jump off ramps and crash into things. He named it *Milo's Remote Control Land*. Like every
game it has to start from the TV with the remote (ADR 0021), and a TV remote sends one press per push, never a held key
(ADR 0035), so steering by holding an arrow is out.

## Decision

`web/rcland.js` is one canvas game, drawn with plain shapes (nothing to download), the same file on Google TV
(`TableActivity`, start `rcland`), LG and Samsung, started from Games › Milo's Remote Control Land.

- Five machines: race car, monster truck, digger, dune buggy and bulldozer, each with its own speed, jump, flip speed
  and strength. The digger's OK slams its bucket; the bigger machines smash rocks and squash old cars, the small ones
  bounce off them and are told which machine to try.
- One press per push: ▲ and ▼ change gear (reverse, stop, 1, 2, 3), ◀ and ▶ turn the machine an eighth of a turn, OK
  jumps. In the air ▲ or OK is a front flip, ▼ a back flip and ◀ ▶ a spin, queued up to three. A trick stopped halfway
  at landing is a wipeout: the machine tumbles and is back on its wheels a second later, with nothing lost but the combo.
- A park three screens wide with ramps (three sizes), turbo pads, a pond, a sandpit, a dirt track and things to smash
  (cones, crates, bowling pins, melons, toy blocks, sandcastles, old cars, rocks), plus stars and balloons up in the air.
  Smashed things come back after half a minute, out of sight.
- Juice: particles, pop-up points, skid marks, camera shake and zoom, sounds made on the TV (`sfx.js`, with a quiet
  motor hum that follows the speed and stops when the game pauses or closes).
- Points go into a combo (x2 every four in a row, up to x5). Eighteen challenges, three on screen at a time, give a
  goal. The best score, the counts and the finished challenges stay in the TV's own storage (`btv.rcland`); nothing is
  sent.
- Back pauses (Keep driving, Change machine, How to play, Leave), and Back again leaves. The game hands Back to the
  shared screen code (`UI.key`) rather than eating it, so it always works. Its How to play guide is in `guides.js`.
- The in-game words are the game's own, in all five languages, like the guides.
- `tests/rcland.test.js` drives every machine with random presses, flies the first ramp with a flip, and checks the
  smashing rules and the challenges.

## Consequences

Public pages (the website and the README) call it Remote Control Land, so a child's name only appears on the TV.
More parks, a timed race round the track and two players on one remote can come later on top of the same file.
