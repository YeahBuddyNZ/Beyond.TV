# 0058. Live TV now and next, favourite channels, and the home screen opening on Continue

Date: 23/11/2026. Status: accepted.

## Context

Kyle picked two improvements from a list of ten on 23/11/2026. First, Live TV's tiles only said a channel's name and
country, so you had to open a channel to find out what was on, and the channels you watch most sat wherever the row put
them. Second, the home screen always opened on the first app, even when someone had been watching Sky News or playing
Remote Control Land a minute before the TV went off. Everything has to work from the remote alone, with no settings to
learn.

## Decision

- **Now and next on the tiles.** The hourly website build (`tools/live_now.py`, ADR 0053) now also keeps the title of the
  live video each channel is streaming, cleaned for a tile ("LIVE:" and emoji in front dropped, dashes as commas, at most
  90 characters). When the channel has scheduled its next stream within a day, it keeps that stream's title and exact
  start time too, read from the video's own page (`scheduledStartTime`, never guessed from the "Scheduled for" text,
  which is in YouTube's own time zone). `now.json` carries `title` and `next: {title, at}` beside `video`.
  Each tile shows what's on now under the channel's name; the focused channel gets a card in the top right corner with
  its name and country, *Now* and the title, and *Up next* with the start in the TV's own time. *Up next* disappears once
  that time has passed. A channel with no title says *Live*. Older `now.json` files without titles still work.
- **Favourite channels, per person.** Holding OK on a channel pins it to *Your favourites*, the first row of Live TV, with
  a star on its tile; holding OK again (on either tile) takes it off. A short press still plays it. The line under the
  heading says *Hold OK on a channel to pin it to the top*, so nobody needs to be told. Each person has their own (kids
  too, from the channels they can see), newest first, up to twelve, kept on the TV only (`bt.live.fav` on LG and Samsung,
  the `live` preferences on Google TV). On LG and Samsung a hold is OK pressed for 650 ms with the remote repeating it; a
  TV that never says the key came up still plays the channel, so a short press can never pin by mistake.
- **The home screen opens on Continue.** Keep watching (ADR 0007) now also remembers the Live TV channel and the game
  last played from Beyond TV (`beyond:live:<id>`, `beyond:game:<id>`), each with its logo or picture. When the home
  screen opens (the TV coming on, a profile picked, a new start), it selects Keep watching and puts the focus on its
  first screen, marked *Continue* in purple, so one OK press picks up where that person left off: the app opens, the
  channel plays, or the Games screen opens with that game on top of it (so Back returns to Games). With nothing in Keep
  watching the home screen opens on the App Dock as before. Pressing Home while already on the home screen still goes to
  the first app. How to play, quiz night and the dinner question aren't remembered: there's nothing to continue.

## Consequences

The hourly build reads one more page per channel that has a scheduled stream (at most three per channel, usually none),
so it takes a few seconds longer. The titles are the broadcasters' own words, shown as text only. A favourite whose
channel goes off air is hidden until it's back. What someone watched and pinned stays on the TV, per person, and is
never sent anywhere (the check-in is unchanged). Kids still go through *earn your screen* before Continue opens Live TV.
