# 0030. Who's tidying? before the race

Date: 29/10/2026. Status: accepted. Adds to [0029](0029-tidy-race-counts-up.md).

## Context

The race put every kid's face up, so a kid who was away or asleep stayed "still tidying" and the race never got to
"All tidy!". Kyle: "Just in case there are 3."

## Decision

With more than one face, the race opens on Who's tidying?: every face ticked, the clock waiting at 0:00. OK on a face
takes them out (or puts them back), and Go! starts the race with the ones still ticked. With one face it starts
straight away, as before. Left on Who's tidying? for an hour, it closes. All from the remote; nothing goes back to
Beyond Family.

## Consequences

Same on Google TV (`TidyActivity.java`) and LG and Samsung (`web/tidy.js`). The nightly race now waits for a press of
Go! before the clock runs.
