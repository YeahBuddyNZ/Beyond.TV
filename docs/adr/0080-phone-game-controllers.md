# 0080. Phones as game controllers, beside the remote

- Status: Accepted
- Date: 27/11/2026
- Decided by: Kyle ("Can we bring a game controller to the beyond family app for tv", 27/11/2026)

## Context

Beyond Family's TV page already has a phone remote: arrows, OK, Back and Home, each tap a `key` command through
`/tv/sync` (ADR 0026 and before). It works in the games, but it is shaped like a TV remote, it is one remote for the
house, and the TV can't tell one phone from another, so nothing on the TV can be played by two people at once. Kyle
asked for a game controller in the app. The standing rule stays: every game starts and plays from the TV's own remote,
and phones are an extra, never a must.

## Decision

- Beyond Family gets a **Game controller** (TV › Play): a full screen pad held sideways or upright, a big d-pad on the
  left, A and B on the right, the player's own colour and name, and a buzz on every press. It sends `pad` commands
  `{button: up|down|left|right|a|b}` on the finger going down, not up, to cut the wait. Beyond Family adds who pressed
  (member id, first name, colour). Anyone in the household can pick one up, kids too, the same as the remote.
- On the TV, `web/pads.js` turns a press into the remote's own key (A is OK, B is Back), so **every game that works
  with the remote works with a phone**, with no change to the game. The remote keeps working beside it.
- A game that wants players reads `Pads.from()`: the phone's player for a phone press, `null` for the remote. The
  first one is **Paddle for two** (`web/arcade.js`): the first controller to press takes the left paddle, and a second
  one (the remote or another phone) takes the robot's, in their own colours with their names on the screen. Beating a
  person doesn't make the robot quicker.
- The first press from each phone says *Aroha picked up a controller* on the TV, again after ten quiet minutes.
- On Google TV the press goes straight into the games screen's page when it is in front (`TableActivity.pad`, no ADB),
  otherwise it is the same key as the phone's remote through the TV's own ADB, so Karaoke and the rest still answer.
- A press older than four seconds that the TV hasn't collected is dropped by Beyond Family, so a slow TV never plays
  catch-up with a queue of stale moves.

## Consequences

Every game is playable from a phone today; only Paddle knows two players. Other games can learn players one at a time
through `Pads.from()` (next in line: Remote Control Land's two player race, Ludo and chess, so each phone moves its
own pieces). Latency is the phone to Beyond Family to the TV's long poll: fine for turning and pressing OK (every
game steers by turning, ADR 0035), not for anything that needs a held button. Nothing is kept: presses are delivered
and gone.

## Alternatives considered

- A direct link between the phone and the TV on the home network (WebRTC or a local socket): faster, but LG and
  Samsung web apps can't listen for connections, and it would need the phone and TV to find each other. Kept for
  later if the round trip proves too slow.
- Held buttons (down and up): no game needs them, since the TV's remote sends one press per push.
- A separate controller app: Beyond Family already knows the household, the TVs and who is holding the phone.
