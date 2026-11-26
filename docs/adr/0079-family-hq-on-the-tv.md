# 0079. The Family wall looks like Family HQ

- Status: Accepted
- Date: 26/11/2026
- Decided by: Kyle ("Should look like this https://beyondfamily.app/family/hq", 26/11/2026)

## Context

ADR 0067 put each person's to-dos and the wall's stickies and wins on a dark Family wall screen of its own. Families
already run their week from Family HQ in Beyond Family (`/family/hq`, the fridge iPad's wall mode), and Kyle wants
the TV to look the same.

## Decision

The Family wall screen (`web/wall.js`, also in TableActivity on Google TV) is drawn like Family HQ, from `wall.hq` in
Beyond Family's sync (Beyond Family ADR 0065): paper, white cards and Caveat handwriting
(`app/assets/fonts/CaveatVariable.ttf`, OFL), the household's name and everyone's colours, the day's kind word, the
stickies, then the cards in the family's own layout from *Design*: small cards on the left, wide ones on the right.

- To do, Would love and This is broken: OK ticks an item, and the + under each list types a new one with the remote
  (`POST /tv/hq/:id/tick`, `POST /tv/hq/lists`). The menu, notes, this week's activities and the month are read only.
- Each person's own jobs (ADR 0067) lead the left column, and the week's wins close the right one.
- The page slides up and down to whatever has the focus, so every card is reachable with the arrows.
- Events kept to just me or specific people never reach the TV. The screensaver and Today at home are unchanged.

## Consequences

The APK and the LG and Samsung packages grow by Caveat (about 400 KB). A change to what HQ shows now needs the TV
checked too. Adding and ticking from the TV trusts whoever is at home, like the sticky and the fridge iPad.

## Alternatives considered

Keeping the dark screen and adding the lists to it: it would not look like HQ, which is what the family knows.
