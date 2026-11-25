# 0075. Our week: the Sunday family recap

Date: 25/11/2026. Status: accepted. Builds on 0057 (the family scoreboard and Daily chores), 0061 (family photos on the
screensaver), 0066 and 0072 (warm notes, Mum first) and 0067 (the family wall and to-dos).

## Context

Kyle asked for a Sunday family recap on the TV (25/11/2026, "Do them all"): the week's scores, chores done, family
photos and a warm note celebrating Mum, the queen of the house. Each of those already lives on its own screen; nothing
looked back on the week as a whole, together, on the big screen.

## Decision

- **One screen, Our week** (`web/week.js`, the same page on Google TV through `TableActivity` start `week`, LG and
  Samsung). Left: everyone's points for the week from the family scoreboard, with the award each is heading for, the
  champion in ember, and the stars each earned from chores and to-dos. Right: a thank you card, and the week's
  moments.
- **The thank you is for Mum.** When a grown-up is set as Mum (Manage people, *Who they are*), she gets a card of her
  own, *Queen of the house*, with one of five thank you lines picked by the week (so it stays the same all Sunday) and
  signed by the kids by first name ("Love from Aroha and Nikau"). With no Mum set, the grown-ups get it together.
- **Moments** are the family wall's wins from this week (0067), with their photos first, then on Google TV the family's
  own photos sent to the TV since Monday (0061), up to four. OK on one shows it big. With no photos, the wins in words.
- **How it opens, from the remote.** A star button, *Our week*, at the top of the home screen on Sundays and on Monday
  mornings (then it looks back on the week just gone), *Our week* on the family scoreboard any day, and by itself the
  first time the home screen shows on a Sunday between 4 and 9 at night, once a week, when there is a family on the TV
  (more than one person, or Beyond Family linked). *Show it on Sundays* on the screen turns the by-itself part off.
  `Week.rules.due` and `WeekRecap.java` are twins, tested by `tests/week.test.js` and `tests/WeekRecapTest.java`.

## Consequences

Nothing new is kept or sent. The points and stars are the scoreboard's, already on the TV; the wins are what the
household already shares with its TVs; the photos are read on the TV, shrunk, and shown in its own page. The TV keeps
only the week it last opened by itself and the on or off. It works without Beyond Family (scores and chores only), and
gets fuller with it. A family with no Mum set is never told it is missing one.
