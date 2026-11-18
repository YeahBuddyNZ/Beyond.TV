# 0042. Live TV: free channels on one screen

Date: 18/11/2026. Status: accepted.

## Context

Kyle's clients want to drop Sky because it costs too much, and asked for "all the channels" on Beyond TV, with paid
extras like Sky Sport. One client's list: Fox News, Jones!, Freeview, History, Discovery, Living. In New Zealand Sky
holds the rights to Fox News, Jones!, History and Living (Sky Entertainment) and Discovery (Sky Starter): nobody else
may carry them, and the cheap "all of Sky" IPTV boxes are piracy. The free channels are on the aerial (Freeview), in
the Freeview, TVNZ+ and ThreeNow apps, in Plex and the TV makers' own free channel apps, and many news channels stream
their own channel free on YouTube around the clock. The research is in Kyle's doc "Live TV on Beyond TV: life after
Sky" (18/11/2026). Kyle chose "Free Live TV tab" (18/11/2026).

## Decision

The Live TV button at the top of the home screen opens a Live TV screen instead of going straight to the aerial
(`web/livetv.js` on LG and Samsung, `LiveTvActivity.java` on Google TV; change one, change both). Its rows show only
what the TV has:

- **Here in Aotearoa**: the TV's own aerial (what the button did before, now the first thing focused), then the
  Freeview, TVNZ+ and ThreeNow apps. We open the apps; we never take a broadcaster's stream into our own player.
- **World news, free**: ABC News, Sky News, Al Jazeera, DW, France 24, NHK World, CNA, LiveNOW from FOX, Euronews and
  Bloomberg, each its own official YouTube channel's live stream, played full screen in YouTube's own embedded player,
  ads and all (as karaoke does, ADR 0020). Up and down change channel. The list is `docs/live/channels.json` on our
  website, so a channel can be added or dropped without an app update; the TV keeps the last good list and carries its
  own copy. Only a channel's own stream: never a list of streams somebody else copied.
- **More free channels**: Plex (its free channels), Samsung TV Plus, LG Channels, when installed.
- **Paid extras**: Sky Sport Now and Neon, when installed.
- **Which channels can I get?** (New Zealand TVs): free with an aerial or the Freeview app, free here, and paid only
  from Sky, in plain words.

Kids get the first row only. The drawer's Live TV still goes straight to the aerial. Nothing new is sent anywhere: on
LG and Samsung the channel's name goes to Beyond Family's "now watching" like an app's does.

## Consequences

Beyond TV never sells or carries Sky's channels. A family that wants them still needs Sky (a Sky Pod or Box on HDMI) or
Sky Sport Now; a reseller deal with Sky, free channels inside the app through an aggregator, and a channel guide are
later steps that each need their own agreement and ADR. A YouTube channel can stop allowing its stream in other apps:
then it shows YouTube's message, and we drop it from the list on the website. `tests/livetv.test.js` covers the rows,
the list and its fallbacks; not yet seen on a real TV.
