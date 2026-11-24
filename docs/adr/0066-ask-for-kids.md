# 0066. Ask for kids: questions about the world, checked twice, and a log for their grown-ups

Date: 24/11/2026. Status: accepted.

## Context

Kyle asked on 24/11/2026 for the kids to use Ask Beyond (ADR 0025) to ask about the world, "with good filters on here",
for the kids to be taught that asking things they shouldn't gets blocked, and for parents to be told and shown a log.
Until now a kid on Ask got G and PG watching picks and a short answer to anything else, and the bottom of the screen
promised everyone "Beyond doesn't keep what you ask". A log of what kids ask breaks that promise for kids, so the
screen has to say so plainly.

## Decision

- **A kid's Ask is about the world.** On a kid's profile (or a kid asking from their own phone) the orb asks *What do
  you want to know?*, with starters like *Why is the sky blue?* and *What do kiwi eat?*, Type it, and one way back to
  *Something funny to watch*. Answers are two to four short sentences pitched at the kid's age (from their birthday in
  Beyond Family, else 8, or 13 for a teen), New Zealand English, with a fun extra fact. Up to three G or PG picks when
  they want something to watch. Remote only; the phone is optional.
- **Taught first, every time it matters.** The first time a kid opens Ask on a TV, a card with four lines and *Got it!*
  says what it's for, that it stops anything that isn't for kids, that their grown-ups can see everything they ask and
  are told when it stops, and never to share their address, phone number or passwords. The line at the bottom says
  *Your grown-ups can see what you ask here, in Beyond Family. If it isn't for kids, I'll stop and tell them.* every
  time. A stopped question says *Your grown-ups will see this question.* under a kind reply.
- **Checked twice, by Beyond Family, before anything shows.** A word list first (`shared/kidAsk.ts` there: sexual
  content, violence and weapons, self-harm, drugs and alcohol, slurs, dangerous challenges, and the kid's own phone
  number, email, address or password). Then a real moderation check: Claude reads the question as a child-safety
  reviewer for that age and returns safe or a reason. The answer is written, then checked again the same two ways,
  and only shown when everything passes. Anything less than a clear yes counts as stopped. If a check can't run,
  nothing is answered.
- **The log is the family's own.** Every kid question, what the TV said back, and whether it was stopped and why, goes
  in Beyond Family's `tv_kid_asks`, only readable by that household's grown-ups (TV › Settings › What the kids asked),
  for 30 days, and they can clear it any time. A grown-up's question is never kept, and the bottom line for grown-ups
  is unchanged. Nothing about it goes in the check-in, analytics or anywhere else.
- **Grown-ups are told.** A stopped question rings the household's grown-ups in Beyond Family (*Aroha's question was
  stopped on Lounge*), with the reason but not the words. A swear on its own is only logged, with *try different words*
  on the TV. A question about hurting themselves gets a gentle reply on the TV (find a grown-up you trust now, and What's
  Up's free number, 0800 942 8787) and is the one notification allowed through quiet hours.

## Known limits

Neither filter is perfect. Word lists miss new slang and misspellings and can stop a fair question ("what sex is my
cat"); the moderation check is a model and can be wrong both ways, and is told to stop anything it isn't sure of. Kids
can ask on another device. The log is a prompt for a conversation, not a guarantee, and Beyond Family says so.

## Consequences

- `web/ask.js` (LG, Samsung, and Google TV through `AskActivity` and `ask-host.js`) sends `kid`, `teen` and the
  profile's first name with a kid's question; a phone's ask carries the member and whether they're a kid.
- Beyond Family: `/tv/ask` runs the kid path for a child member or a kid profile, `GET` and `DELETE
  /family/tv/kid-asks`, the `tv_kid_asks` table (RLS on, no policies), notification kinds `kid_ask_blocked` and
  `kid_ask_worry`, and its own ADR.
