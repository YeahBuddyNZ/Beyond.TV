# 0076. What's new: the newest feature on the home screen, from one list on the website

Date: 25/11/2026. Status: accepted.

## Context

Kyle (25/11/2026) asked for a short "What's new" card on the TV's home screen, driven by the same feature list the
weekly website check keeps up to date, and working with the remote alone. Features arrive often (light shows, the
family wall, the Morning board, Bedtime, Find in one week) and families mostly find them by accident.

## Decision

- **One list, on our website.** `docs/whats-new.json`, published to GitHub Pages with the rest of `docs/`: newest
  first, each line an id, a date and a title and one line in all five languages. Every pull request that adds
  something people can see adds its line there, beside the README and the website card, and the weekly website check
  fills in any that were missed. `tests/whatsnew.test.js` checks the list (five languages, short, newest first, no em
  dashes) and the rules below, and runs in CI.
- **Read, never sent.** The TV fetches the file at most twice a day (`web/whatsnew.js`, `WhatsNew.java`, off the UI
  thread on Google TV) and keeps the last copy for when the internet is down. It is one file, the same for every TV,
  so nothing about the house leaves it. A failed fetch is one line in the TV's log.
- **Said once on the home screen.** The newest line shows in Today at home as *New: Bedtime sounds* with its one line
  under it, until someone opens What's new, and for three weeks at most. Only the newest; Today at home stays short.
- **What's new, on the remote.** A *What's new* key in Shortcuts at the bottom of the home screen opens a screen with
  the last six, each with its date (DD/MM/YYYY). *Got it* or Back closes it. Opening it counts as seen for the TV.
  On Google TV, Shortcuts is grown-ups only, as before; on LG and Samsung kids have it too.

## Consequences

- A feature can be announced on every TV without an app update, and an announcement can be fixed by editing the file.
- Seen is per TV, not per person: one grown-up opening What's new clears the line for the house.
- A line that reaches the TV before the app that has the feature would point at nothing, so lines go in with the
  feature's own pull request, never ahead of it.
- Not yet tried on a real TV.
