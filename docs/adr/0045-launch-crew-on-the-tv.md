# 0045. Launch Crew in the arcade

Date: 21/11/2026. Status: accepted.

## Context

Beyond™ Launch Crew is the rocket game on gobeyond.nz (`/play/launch-crew` in GoBeyond-Website): board the crew, fuel
the rocket, help the engineers fix the sparks, lift off, then fly through falling messages, zapping the scams and
letting the real ones through. It teaches kids to spot a scam. Kyle asked for it on the TV (21/11/2026: "put the beyond
game on here with rockets"). The website plays it by touch, with a button you hold to fuel; a TV remote sends one press
per push and has no pointer (ADR 0035).

## Decision

Launch Crew is the fifth game in the arcade (`makeCrew` in `web/arcade.js`), the same five steps and the same eight
messages (four scams, four real ones from Mum, Nana, Coach and Teacher), redrawn on the arcade's canvas with the rocket
in Beyond TV's purple.

- Board: left and right pick a crew member, OK boards them.
- Fuel: the needle sweeps up and down by itself and OK fills the tank when it is in the green, instead of holding a
  button. A wrong press only says try again.
- Fix: a spark pops on the rocket's nose, side or base, and the arrow pointing at it fixes it. Five to fix.
- Fly: three lanes, the rocket moves a lane with left and right, OK zaps the lowest message in its lane. A scam zapped
  or a real message delivered is a star; each wrong one says why, and nothing is taken away.
- The end shows up to three stars and the lesson: scams rush you, offer prizes or ask for secrets; when in doubt, ask a
  grown-up. The best is kept on this TV like the other arcade games, and nothing is sent.
- The website's grown-ups' links stay on the website: the TV version has no links out.
- Every line is in all five languages (Portuguese and Spanish in the file, German and Russian in `strings.js`), with a
  How to play guide in `web/guides.js`. `tests/arcade.test.js` checks the messages, the gauge, the stars and the lanes,
  and plays it through, perfectly and by random presses.

## Consequences

Two copies of the game now exist, the website's (React) and the TV's (ES5 canvas). A change to the messages or the
steps on one should be made on the other.
