# 0066. Ask a grown-up from the TV, and the Morning board

Date: 24/11/2026. Status: accepted. Builds on 0060 (screen time limits) and 0064 (Beyond Family sets things on the TV).
Beyond Family's side is its ADR 0052.

## Context

Kyle wants Beyond Family and the TV more joined up (24/11/2026): "Like the wall and ticking off todos", and yes to the
ideas offered, among them a kid asking for more time with one tap to approve, and a "today" screen on the TV. Until now
the time-up screen only had a grown-up's PIN, which means getting up and walking to the TV.

## Decision

- **Ask a grown-up.** When screen time is used up and the TV is linked to Beyond Family, the time-up screen has
  *Ask a grown-up*: 15 more minutes, 30 more minutes or one more game (20 minutes). The TV posts
  `/api/tv/requests` with the kid's member id and what they asked for, nothing else. Every grown-up with the app gets a
  push and a card with Yes and Not now. The answer comes back as the `request-answer` command; a yes adds the minutes
  on the TV and says so kindly ("Mum said yes! 15 more minutes, Aroha."), a no says "Not this time".
- **The TV stays the way in.** The grown-up's PIN on the time-up screen works exactly as before, the limits themselves
  stay on the TV (0060), and an unlinked TV shows no Ask button. A kid asks at most 4 times an hour, and an ask goes
  quietly after 30 minutes.
- **The Morning board** (the *Today* button on the home screen, linked TVs only): a column for each person, kids first,
  with today's to-dos from Beyond Family to tick off with the remote, then the calendar (birthdays, events, tea) when
  the house noticeboard is switched on in Beyond Family, and the weather. Until Beyond Family sends to-dos, each
  kid's jobs show read only. It opens by itself once each morning between 5 and 10 the first time the home screen is
  up; *Show it each morning* on the board turns that off. Web (`web/morning.js`) and Google TV (`TableActivity`
  through the bridge, `Family.morning`) share the same page.

## Consequences

A kid can ask from the couch and a parent can say yes from anywhere, without the TV holding anybody's PIN any longer
than before. What leaves the TV is the member id, the kind and the minutes; never what they were watching. The board
shows only what the household already shares with its TVs.
