# 0029. The tidy-up race counts up

Date: 29/10/2026. Status: accepted. Replaces the countdown in [0012](0012-tidy-up-race-and-start-chime.md).

## Context

The race showed a clock counting down from the minutes set in Beyond Family, then "Time's up!". Kyle, after watching it
on the family's Sony: count up instead.

## Decision

The clock starts at 0:00 and counts up. Each person who presses OK on their face gets their place and their time
(1st 2:31). When everybody's done, "All tidy!" and who was fastest, as before. Nobody runs out of time, so there is no
"Time's up!". A race left open for an hour closes by itself. The minutes setting in Beyond Family is still sent and
still accepted, but no longer ends the race. The basket emoji before the title went too: Android 8's font has none.

## Consequences

Same on Google TV (`TidyActivity.java`) and LG and Samsung (`web/tidy.js`). Beyond Family needs no change; its minutes
box can go when that page is next touched.
