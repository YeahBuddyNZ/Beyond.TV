# 0072. Warm notes, shuffled, and awards from Beyond Family

Date: 24/11/2026. Status: accepted. Builds on 0066 (warm notes) and 0067 (the family wall). Beyond Family ADR 0055 is
the other half.

## Context

Kyle (24/11/2026, with a photo of his TV showing "You're doing a great job, Zahni"): "We need to randomise this. And
then add things in Beyond Family. Like awards they got." The notes in 0066 went through everyone in the same order
from a start picked by the clock, and each person's line moved on once a day, so the same few lines came up again and
again. He also said Zahni is the mum: "Mums are to be celebrated. She's queen of the house."

## Decision

- **Shuffled, still fair.** Each round, everyone gets one note, in a fresh random order, and the round never starts
  with whoever had the last note. Each person's line is picked at random from their own lines, skipping the ones they
  had lately (the last 60 notes are remembered) and the tone (love, proud, fun, cheer) of the note just before. The
  memory is kept on the TV (`btv.warm` in local storage, `warm` in the people preferences on Google TV), so opening
  the screen again carries on rather than starting over. Only first names are in it.
- **More lines.** Six more for every kid, one more each for kindy, school and college, three more for grown-ups, all
  in five languages, every one kind. Mum (*Who they are* in Manage people) gets six of her own on top of the grown-ups'
  lines, including "Queen of the house".
- **Awards.** A grown-up gives a kid an award in Beyond Family (Family › Awards). `/tv/sync` sends each kid's last
  month of awards, three at most: `{title, emoji, from, note, on}`, first names only. About half of a kid's notes are
  then about an award ("You got the Reading star award, Aroha", "Mum gave you the Reading star award, Aroha", "Aroha,
  from Mum: ..."). Their newest award shows under their name on Who's watching in ember for a fortnight
  (`Warm.badge`, `WarmNotes.badge`). Awards also join the family wall's wins for the week (kind `award`).
- Twins as before: `web/warm.js` and `WarmNotes.java`. Both take the dice as an argument, so the tests roll the same
  dice and check the two say exactly the same notes.

## Consequences

The notes feel new each time without anybody being left out. Awards are only ever kind: there is no way to give a
bad one, and the TV never compares kids. A kid with an award hears about it more often for a month, which is the
point. Nothing new is sent off the TV.

## Alternatives considered

Pure random (a kid could go a long time without a note, and two kids notice). Awards kept only on the TV (parents
give them from their phones, and they belong with the certificates). A points value on awards (the Star Stall and
see-and-do already pay points; an award is recognition, not pay).
