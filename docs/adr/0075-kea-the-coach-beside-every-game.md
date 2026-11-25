# 0075. Kea the coach beside every game

Date: 26/11/2026. Status: accepted. Builds on ADR 0043 (Learn chess and How to play).

## Context

Kyle (25/11/2026) asked for the chess coach and the How to play guides to reach every game. Every game already had a
guide (web/guides.js), but nobody was told it was there, and on Google TV karaoke, the party, quiz night, the dinner
question, the tidy-up race and bedtime (drawn natively, not in the WebView) only had theirs under Games › How to play.

## Decision

- **Kea the coach**, the chess coach's robot, now sits beside every game. The first time a game starts on a TV, Kea
  asks *First time playing ...?* with *Show me how* (the game's guide, then the game) or *Let's play*. Back leaves
  without playing. Shelves of games (board and card games, silly games, the arcade) already have How to play inside,
  so they start straight away.
- After that, at most once a day per game, Kea says one of the guide's top tips as the game starts (a short notice).
- **How to play inside every game:** a button on the opening screen of karaoke, the party, the tidy-up race, bedtime,
  Daily chores, the family scoreboard, quiz night and the dinner question, on LG, Samsung and Google TV. On Google TV
  the native screens open the guide in TableActivity (`guide:<game>`).
- Which games Kea has met is kept on the TV only: Prefs (`coached`) on Google TV, so the native games and the WebView
  agree, and localStorage on LG and Samsung. Nothing is sent, and it is not part of the check-in.
- Everything starts from the TV with the remote. Quiz night and the dinner question are only coached once the TV is
  linked to Beyond Family, since they can't start before.

## Consequences

- The first press on each game shows one extra screen, once per TV. Kyle's family has played most games already, so
  they will see Kea once on each.
- Not yet tried on a real TV.
