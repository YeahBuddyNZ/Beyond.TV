# 0024. Board and card games, against robots that grow with you

Date: 25/10/2026. Status: accepted.

## Context

Kyle and the family asked for board and card games on the TV at bedtime: Ludo, card games like the ones on the family
table, and a fast slap game where the remote's OK button is the slap. The computer player shouldn't be so easy that
you always win or so hard that you always lose. It should know who it is playing, push each person a little further
over months, and tell them at the end how they could have played better. Whoever wins, it should show what a good
winner and a good loser sound like.

Some of the games families know are trade marks with their own artwork. Beyond doesn't use other people's names or
art.

## Decision

**Board and card games** joins the Games screen (ADR 0021). Who's playing first (up to four people from Who's
watching, plus Guest), then the game, then how many robots. The first games:

- **Ludo**, family rules: a six gets a token out and rolls again, landing on someone sends them home (not on a star or
  a start square), the exact number takes a token home. Quick (two tokens each) or full (four). OK rolls, ◀ ▶ picks a
  token.
- **Sheep, Penguin, Volcano**, our own slap game: each card that turns comes with the next word of the chant (Sheep,
  Penguin, Volcano, Fish, Hokey pokey); when the card is the word, everyone slaps OK and the last one takes the pile.
- **Snap**: slap when a card is the same as the one under it.

One person plays a slap game at a time (one remote); Ludo takes turns with the remote.

**The robots are fair.** The dice are random for everyone, a robot sees only what a person can see, and nothing is
fixed to let anybody win. They are named after New Zealand birds (Kea, Tūī, Ruru) and always show as robots.

**Each person's robots grow with them.** A level from 1 to 10 for each person and each game. Kids start at 2.5, teens
at 3.5, grown-ups at 4. A win moves it up about a third of a level, a loss down about a quarter, and it never drops
more than one and a half below the best it reached. So games stay close, and as a person gets better over weeks and
months the robots across the table get smarter with them. In Ludo the level is how often a robot picks the move a good
player would and how much it watches for danger; in the slap games it is how fast a robot slaps, how often it misses
and how often it slaps too soon. With several people in a game the robots play at the average of their levels.

**The debrief is true.** Every move a person makes in Ludo is weighed the way the robots weigh theirs; when another
move was clearly better (a catch, a token home, getting out of danger, getting out of the yard) the debrief says so,
up to two tips, in kind words. The slap games count real slaps: the fastest, the average, misses and slaps too soon.
The robot speaks as a good sport either way ("Well played, you beat us fair and square", "Good game, that was close"),
and every debrief ends with "Say good game to everyone who played".

**One set of games for every TV.** The games are written once, in `web/` (`table.js`, `ludo.js`, `snap.js`). LG and
Samsung run them in the web app. Google TV runs the same files in a WebView (`TableActivity.java`, with
`web/table.html` and `web/table-host.js`), which `build.sh` copies into the APK's assets. The rules and the robot
are changed in one place.

**Progress stays on the TV.** Levels, games played and won, and the fastest slap are kept on this TV only
(`files/table.json` on Google TV, the browser's storage on LG and Samsung), keyed by the profile. Nothing about the
games is sent anywhere, the check-in included. Guests are never kept. *Start fresh* on the games screen forgets
everyone's levels; for a kid with a grown-up PIN set, it waits for a grown-up.

## Consequences

The Google TV build now needs a WebView (Android System WebView, which Google TV and Android TV come with); without one the
games say so and close. A change to the games reaches Google TV with the next APK build.

Go Fish and a colours-and-numbers card game in the same spirit (our own names and art) come next, against robots that
never peek at your hand.
