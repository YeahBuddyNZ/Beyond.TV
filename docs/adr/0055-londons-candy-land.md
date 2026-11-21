# 0055. London's Candy Land: a kind candy world for the remote

Date: 21/11/2026. Status: accepted.

## Context

Kyle asked for a game for his daughter, aged seven: *London's Candy Land*, "a 7 year old girl's wildest dreams come
true", positive, saying lots of fun and lovely things. Like every game it starts from the TV with the remote (ADR
0021), a remote sends one press per push (ADR 0035), and Back goes up one level, ending at Games (ADR 0047).

## Decision

`web/candy.js` is one canvas game drawn with plain shapes (nothing to download, no emoji font on the TV), the same file
on Google TV (`TableActivity`, start `candy`), LG and Samsung, under Games › Let's play.

- A map of a candy world (lolly trees, gumdrop hills, a chocolate river, a rainbow bridge, candy floss clouds) with six
  places joined by a ribbon path. The arrows walk to the nearest place that way, OK goes in, Back comes out.
- The places: the Bakery (pick a shape, the icing and up to ten toppings, then All done), the Candy Garden (plant,
  water, and it grows by the clock, even while the TV is off), the Sweet Shop (friends ask for a treat; a different one
  is a happy surprise too), Lolly Shower (catch falling sweets in a basket; a missed one is a snack for the bunny),
  the Rainbow Ride (a unicorn flies through rainbow rings to the castle) and the Dress-up Castle (skin, hair, outfit,
  crown, wings and a pet, in any colour, and OK twirls).
- Nothing is ever lost. There is no failing, no timer that ends badly and no game over: every round finishes with a
  celebration. Sparkles only go up, and they bring new friends (a unicorn first, then a bunny, a kitten, a gummy bear,
  a baby dragon, an owl, a penguin and a puppy), so there is always something to look forward to.
- Kind words all the way: cheers for trying, compliments, hellos with the profile's name. Where the TV can speak
  (`speechSynthesis`), it says them out loud; with sounds off it stays quiet. Sounds are made on the TV (`sfx.js`).
- Everything stays in the TV's own storage (`btv.candy`); nothing is sent.
- Every word is the game's own, in all five languages, with its How to play guide in `guides.js`.
- `tests/candy.test.js` plays every place with random presses for a long while and checks that sparkles never go down,
  Back always gets back to the map and then to Games, and nothing is drawn with a bad number.

## Consequences

Public pages (the website and the README) call it Lolly Land, so a child's name only appears on the TV (as with
Remote Control Land, ADR 0046), and the name stays clear of the board game's. More places and friends can be added to
the same map later.
