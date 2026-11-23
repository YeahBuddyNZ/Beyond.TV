# 0057. Find: say a game, a channel, an app or a show

Date: 23/11/2026. Status: accepted.

## Context

Kyle approved a voice search button for games, channels and shows (23/11/2026). The roadmap had "voice search for
kids" waiting on Beyond Family. Every feature must start from the TV with the remote alone (ADR 0021), with no techy
settings, and kids must only ever be pointed at what a kid may open.

## Decision

A **Find** button (a microphone) sits at the top of the home screen for everyone, kids included, on Google TV, LG and
Samsung. `web/find.js` is the one screen: the same file on LG and Samsung and, in `AskActivity`'s WebView, on Google TV.

- **Listening.** Talk asks the TV's own voice search where there is one: Android's speech recogniser on Google TV (the
  remote's microphone; `RecognizerIntent`, the same as Talk to Beyond), and the browser's speech recognition where an
  LG or Samsung web engine has it. Where the TV can't hear, Type it brings the on-screen keyboard; it's always there.
  On Google TV the remote's search button, and the microphone where the TV hands it to the app in front, open Find
  already listening.
- **Matching happens on the TV.** What was said is matched against what this TV has: the Games screen (with the
  names people say, "chess", "lollies", "goodnight"), Tonight's sky and Live TV, the channels that play here and the
  apps. Small words ("can we play ... please") are left out, near misses are forgiven (one letter in a short word,
  two in a long one), and of the few things the voice search heard the one that finds most wins. Up to six big
  tiles, best first, open with OK. `tests/find.test.js` pins it.
- **Shows.** The last tile looks for a show: with Beyond Family linked it asks Ask Beyond ("Where can we watch ...?",
  ADR 0025), which answers with this TV's apps; otherwise, for a grown-up, the TV's own search on Google TV (across
  every app), else YouTube's search.
- **Kids** get the games, the kids' channels and their own shelf. A show for a kid only goes through Ask Beyond, which
  gives a kid's answer; without Beyond Family a kid's Find has no show tile.
- **Nothing is kept or sent by Find.** The voice search that hears the words is the TV's own (Google's, on Google TV
  and in a Chromium browser), as when the remote's microphone is used anywhere else on the TV.

## Consequences

The roadmap's "voice search for kids" is done. A new game adds its other names to `ALIASES` in `find.js` when people
would call it something else. `GamesActivity.groups` is now static so Find opens a game from the same list.
