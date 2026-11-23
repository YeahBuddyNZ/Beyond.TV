# 0065. Beyond TV Channels: one line-up you surf like a real TV, NZ mix channels, and turning channels off

Date: 23/11/2026. Status: accepted.

## Context

Kyle asked on 23/11/2026 for Live TV to be "one cohesive interface, like you're just changing channels", live TV first
and then the rest, with the channels a family doesn't use turned off, and a Beyond TV of NZ shows and NZ music artists.
Live TV until now (ADR 0042, 0053, 0058) was a screen of tiles: you picked a tile, watched, and went back to the tiles.
Families dropping Sky expect a TV that comes on showing something, a number for every channel, and up and down to flick.

We can't stream NZ shows we have no rights to, and never pull a broadcaster's stream into our player (ADR 0042). What
we can do is play official YouTube channels' own videos in YouTube's own player, ads and all, as we already do for the
24/7 news channels.

## Decision

- **One numbered line-up.** In this order, with only what the TV has: the aerial, the Freeview, TVNZ+ and ThreeNow apps,
  our NZ mix channels, Featured, World news, Weather, space and music, the kids' channels, then Plex, Samsung TV Plus,
  LG Channels, Sky Sport Now and Neon. Numbers count from 1 down that list before anything is turned off, so a channel
  keeps its number. Kids get the aerial, the NZ apps and the kids' channels, as before. Adults now see the kids'
  channels at the end of the line-up (they can turn them off).
- **Live TV opens on a channel.** The Live TV button plays the channel last watched, full screen, straight away
  (Continue and Find still open the one asked for); the first time, the first channel. Up, down, CH+ and CH- change
  channel, the number keys go to one (shown as typed, then 1.6 seconds), OK opens the guide, Back goes home. A banner
  shows the number, logo, name, what's on now and next, and fades after five seconds.
- **Apps on the line-up are a card, never launched by surfing.** Landing on TVNZ+ shows its tile and *Press OK to open
  TVNZ+*; up and down carry on past it. Nothing opens an app without an OK press.
- **The guide is the old Live TV screen, over the picture.** Same rows of tiles (with a new *Made in Aotearoa* row and
  *For kids* for adults), each tile with its number, the channel playing focused. OK on a channel plays it, holding OK
  pins it (ADR 0058), numbers and CH+ / CH- go straight to the player, Back goes back to the channel.
- **Choose channels.** A button in the guide opens every entry on the line-up as tiles, on or off; OK flips one. Off
  ones leave the guide and surfing skips them; at least one stays on. Per person, kept on the TV only (`bt.live.off` on
  LG and Samsung, `off` in the `live` preferences on Google TV). Kids don't get the button.
- **NZ mix channels: NZ News, NZ Music, NZ Shows, NZ Sport.** A channel in `channels.json` with `mix` (official YouTube
  channels) instead of `youtube` is ours. Every hour `tools/live_now.py` takes the newest five uploads of each channel in
  it that YouTube lets other sites play (its oEmbed answers), between a minute and three hours, one from each in turn,
  up to 60, into `now.json` under `mixes` (video, title, length). The TV plays them one after another from where the
  clock says the mix is (the same place on every TV, so it feels live), in YouTube's own player with the rest as its
  playlist. A mix with no videos stays off air. The sources at the start: NZ News is 1News, RNZ, Re: News, Te Karere
  and Te Ao Māori News; NZ Music is 24 NZ artists' own channels (Lorde, SIX60, BENEE, Fat Freddy's Drop, Crowded House,
  L.A.B, Stan Walker, The Beths and more); NZ Shows is The Spinoff, MĀORI+ and Te Ao with Moana; NZ Sport is the All
  Blacks, New Zealand Cricket, Sky Sport NZ, the Black Ferns and the Silver Ferns. Their tiles are ours
  (`tools/mix_logos.py`: the four dots and the name on the mix's colour), never a broadcaster's logo.
- **Number and channel keys.** LG passes them on; Samsung only once asked, so `TV.wantKeys` registers 0 to 9 and CH+ /
  CH- while Live TV is open and lets them go after. Google TV gets them as key events.
- **Google TV plays in our player when surfing.** The YouTube app can't be flicked through, so channels play in
  YouTube's web player with the moving backdrop off. *Open channels in the YouTube app (smoother on older TVs)* in Choose
  channels sends a channel picked in the guide to the TV's YouTube app instead (ADR 0053's way); it starts on for
  Android 8, where the web player lagged on Kyle's Sony, and off elsewhere. Surfing past a channel never leaves Live TV.

## Consequences

Live TV feels like a TV. The hourly build reads about 40 more YouTube pages and checks up to 200 videos, a couple of
minutes; a mix that reads badly keeps its last list. Older TVs not yet updated ignore the mixes (their list needs
`youtube`) and work as before. The mixes are only as good as what those channels upload: NZ Shows is short (The Spinoff
and MĀORI+ post clips and some full episodes), and nothing licensed from TVNZ+ or ThreeNow can be in it. Not yet tried
on a real TV.

Next: a Freeview guide (what's on the aerial channels), then Live TV from the Beyond Family app (play a channel on the
TV, and send one to another Beyond TV, a friend's, with a code).
