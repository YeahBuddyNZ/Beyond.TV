# 0053. Build it: build a bridge

Date: 21/11/2026. Status: accepted.

## Context

The second of Kyle's three builder games (ADR 0052): "building bridges. They have to choose the right structures so it
doesn't fall down." It should teach why real bridges look the way they do, not only reward guessing, and a bridge that
falls should be fun, never a telling off.

## Decision

- **Build a bridge** is a second job in `web/builder.js` (`Builder.open('bridge')`), a tile in Games › Build it, and the
  `bridge` start string on Google TV.
- Six bridges in order, each opening when the one before stays up: the farm creek (6 m, cars), the wide river (24 m,
  trucks), the deep gorge (50 m, trucks, no legs: too deep), the railway (70 m, a train, no legs), the harbour (400 m,
  trucks, no legs: ships sail under) and the mountain track (60 m, people on foot, no legs). Each has a budget.
- The player picks a **shape** (beam, beam on legs, arch, truss, suspension) and a **material** (wood, concrete, steel)
  with ▲ ▼ for the row and ◀ ▶ for the choice, and sees the bridge drawn and its cost before testing. OK on *Test it!*
  drives the test truck (or car, train or walkers) over.
- What holds is a small table of how far and how heavy each shape and material can go and what it costs
  (`STRENGTH`), the same for every TV. It follows the real ideas: a beam is for short gaps, legs make each piece
  shorter, arches suit concrete because they squash, trusses are strong and light (railways), suspension crosses the
  widest gaps, concrete can't hang from cables, and wooden rope bridges are perfect for people on foot. Every bridge
  has at least one answer within its budget and none is won by everything (`tests/builder.test.js`).
- Too long or too heavy: the deck bends and breaks under the truck, the halves swing down and it splashes, then a
  card says why in a sentence and *it was a remote control test truck*. Legs where they can't go, cables in concrete,
  or over budget: the card says so straight away, without a crash. Stars are 3 for first time, 2, then 1.
- Back goes up one level: from a bridge to the list of bridges, then the pause menu, then Games. Stars stay on this TV
  under `btv.builder` (`bridgeStars`); nothing is sent.

## Consequences

- Planning a town is the last of the three, next, in the same file.
