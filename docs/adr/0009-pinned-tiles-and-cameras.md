# 0009: Pinned tiles, and cameras that stay at home

Accepted, 23/10/2026.

## Decision

A household pins up to six tiles to its TVs from Beyond Family (TV page › Tiles on the home screen): an app, a show and the app it's on, the kids' jobs for today, or a camera. They show as a *Pinned* tab, first of the tabs, so they're what the home screen opens on. LG and Samsung show all six (smaller from five on, to stay clear of Tonight at home); Google TV shows the first three, the screens it has.

A camera tile is a still picture address on the home network, with no password in it. The TV fetches it itself every five seconds while the tab is showing (every two seconds full screen) and checks again that the address is on the home network before asking. On Google TV plain http is spoken over a socket of the app's own, so cleartext stays off for everything else.

## Why

Kyle chose "everything now, cameras too" over waiting for Beyond Home. A camera's picture is of somebody's house, so it never passes through Beyond Family, and no camera password is ever kept there. Cameras that need a password, and live video, come with Beyond Home, which lives in the house. Beyond Family's side is its ADR 0040.
