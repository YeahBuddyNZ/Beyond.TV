# 0010: Your home, from the Beyond Home box

Accepted, 23/10/2026.

## Decision

When the family has a Beyond Home box (the Beyond Home app on their Home Assistant box) on the same network, the home screen gets a *Your home* tab: a card for each room, with a dot for each thing that's on. OK on a room opens it: its Moments (Movie night, Morning, Bedtime, Everything off), the one remote for that room's sound (quieter, louder, mute, on and off) and every light, heat pump, blind and plug in it, on or off.

The TV finds the box itself (it answers `/tv/hi` on port 8098; the TV tries the address it found last, then `homeassistant.local` and `homeassistant`). Nothing found, nothing shows. Found but not paired, the tab holds one card, *Connect Beyond Home*, which shows a six-letter code to type in the Beyond Home app under Settings, TVs. Kids' profiles don't get the tab.

## Why

Kyle asked for a Home button that makes the TV the everything hub. Beyond TV owns the screens and Beyond Home owns the house: the TV never sends a command of its own, only a named ask in a room ("Movie night in the Lounge", "louder", "this light"), and the box works out the calls and checks them against its own allow list. So a TV can't unlock a door, and nothing about what anybody watches comes back to the TV.

Pairing by code is the same as Beyond Family's TVs. The TV keeps its secret; the box keeps only a hash of it, and taking the TV off in the app stops it at once. Everything stays on the home network: the box answers only private addresses.

Google TV has the same tab (the first three rooms, the screens it has), and also finds the box by Home Assistant's own announcement on the network. It speaks plain http over its own socket (`LocalHttp`, shared with the cameras), home network only, so cleartext stays off for everything else.
