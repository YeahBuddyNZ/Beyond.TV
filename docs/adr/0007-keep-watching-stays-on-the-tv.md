# 0007: Keep watching stays on the TV

Accepted, 23/10/2026.

## Decision

The home screen opens on Keep watching: the last few things each person opened from Beyond TV, as little TV screens, newest first. It is kept on the TV only (SharedPreferences `watched` on Google TV, localStorage on LG and Samsung), per person, for a fortnight, and never sent anywhere: not to Beyond Family, not in the daily check-in. An app opened plainly shows as its logo; a show opened from a pick keeps its title, photo and link, so OK opens the same show again. Tonight at home sits at the right of the screens.

## Why

Kyle approved the new home screen on LG and Samsung and asked for it on Google TV. Streaming apps don't share where you're up to, so what Beyond opened is the honest list we have. What somebody watches is the most private thing a TV knows; the check-in already promises never to send it.

## What it rules out

Sending what anybody watches off the TV, or reading another app's history. Showing one person's list to another person on the same TV.
