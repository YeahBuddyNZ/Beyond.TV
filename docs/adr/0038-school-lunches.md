# 0038. School lunches: kids pick, grown-ups get the list

Date: 05/11/2026. Status: accepted.

## Context

Kyle asked for a school lunch game on the TV: great lunch ideas, especially ones the family can make on a Sunday, so
the kids choose their own lunches for the week and the grown-ups end up with a list of what they chose. Lunches are a
weekly struggle, and a kid who picked their lunch is more likely to eat it.

## Decision

`web/lunch.js` is School lunches, started from Games › School lunches on the TV with the remote. It is the same file
on Google TV (`TableActivity`, start `lunch`), LG and Samsung.

- **Pick my lunches:** a kid swipes through lunch ideas one card at a time, right for yum and left for nah, until
  Monday to Friday are full. Up or down shows how it is made. Ideas they keep saying nah to go to the back of their
  pile next time.
- **Grown-ups' list:** each kid's week and the lunches they love most (picked week after week). Starting a new week
  asks for the grown-up PIN; it clears the week and keeps the loves.
- **Sunday cook-up:** this week's picks that can be made ahead, with what you need and three steps each, and a shopping
  list that merges every ingredient once. With nothing picked it offers a few Sunday ideas.
- 21 ideas written by us, 16 of them made on a Sunday, in all five languages in the file. Every one is nut free,
  because most New Zealand schools ask for that; `tests/lunch.test.js` checks it.
- Everything stays on the TV (localStorage `bt.lunch`), like the arcade's bests. Nothing is sent.

## Consequences

The list lives on the one TV for now. Sending it to Beyond Family, so a grown-up has it on their phone at the
supermarket, is the obvious next step and needs a table and routes there; the TV must keep working without it.
