# 0055. Build it: plan a town

Date: 21/11/2026. Status: accepted.

## Context

The last of Kyle's three builder games (ADR 0052): "plan a Town with what do you need. Like school. Power station.
Water grid. Etc etc. Rather than an ice cream store. Then have the people happy and sad if they don't have enough."

## Decision

- **Plan a town** is a third job in `web/builder.js` (`Builder.open('town')`), a tile in Games › Build it, and the
  `town` start string on Google TV.
- Three towns, each opening when the one before is done: a little village (30 people; water, power, food), a country
  town (60; adds wastewater, a school and a doctor) and a busy town (100; adds jobs and fire safety). Each has money
  to spend, in thousands.
- The land is a 12 by 7 grid with the highway coming in on the left. The arrows move a square; OK opens a strip of
  what can go there (road, houses, the buildings that town needs, a park and an ice cream shop), with each one's cost
  and what it gives in one line. OK on something built offers to knock it down for half the money back.
- The rules, the same on every TV: a building works only when a road joined to the highway runs past it, so roads
  must connect. Each house holds 10 people. Each building serves so many people (a water tower 60, a power station 80,
  a supermarket 40, a wastewater plant 60, a school 60, a doctor's 60, a workshop 50); a fire station covers houses up
  to 4 squares away. Power stations, wastewater plants and workshops are noisy and smelly, so a house right next to
  one is grumpy.
- Every lived-in house shows a face: green with nothing wrong, amber with one problem, red with more. The panel on the
  right lists each need with what the town has against how many live there, and every few seconds somebody says what
  is wrong in a sentence, so a sad face always has a reason.
- The ice cream shop and the park are there on purpose: fun, but not a need. The first ice cream shop says so
  ("water, power and food come first"), and money spent on it is money a need doesn't get.
- The town is done when it has its people and every house is happy. Stars come from the money left: a quarter for
  three, a tenth for two. `tests/builder.test.js` plans each town from the keys within its money, three stars possible.
- Back closes the strip, then the pause menu, then Games. Stars stay on this TV under `btv.builder` (`townStars`);
  nothing is sent.
