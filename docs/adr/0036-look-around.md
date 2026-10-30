# 0036. Look around: the sky as a window

Date: 30/10/2026. Status: accepted.

## Context

Tonight's sky (ADR 0023) is a flat chart of the whole sky. Kyle wanted the space part to be much more interactive: look
where you like, a phone's compass to point the TV's view, and star signs from the birthdays in Beyond Family. A flat
disc cannot do the first of those, because you cannot turn a disc.

## Decision

`web/skylook.js` draws the sky as a window onto it, from where the TV is, and the rest builds on it.

- The view is a stereographic projection about 110 degrees wide. Left and right turn it 20 degrees round the compass,
  up and down tilt it 12 degrees; it glides to the new direction. A remote sends one press per push, so each press is a
  step, never a held key.
- The sun, moon and star positions are sky.js's (`Sky.core`), so there is one set of sums, not two. Stars are turned into
  directions once every half minute, and each frame only multiplies them through the view.
- Whatever is in the middle of the screen is named: the nearest of the bright stars, Matariki, the constellations, the moon
  and the sun, by how much of its own reach it uses (a constellation is bigger than a star). A card says what it is,
  where it is, and a line about it.
- OK opens Find: turn to the Moon, the Southern Cross, Matariki or the brightest star up, or move the time.
- It is web only. On Google TV it runs in the games' WebView (`TableActivity`, start `sky`), which asks the app for the
  place through `BeyondTable.place()`; the native chart gets a press-down entrance to it. Nothing is sent anywhere.

## Consequences

Two parts of the plan are separate decisions with their own ADRs: the phone compass (a command from Beyond Family that
points the view) and the star signs (Beyond Family would send only the sign for each person, never a birthday).
