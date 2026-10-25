# 0023. Tonight's sky

Date: 25/10/2026. Status: accepted.

## Context

Kyle asked for star charts and moon charts on Beyond TV. A family on the couch after dark wants to know what that
bright star is, whether it's a full moon, and when the moon comes up. It has to work on every TV we run on, including
the oldest LG and Samsung ones, and it shouldn't need anything from the internet or from us.

## Decision

A star button in the round buttons at the top of the home screen, for everyone (kids included), opens Tonight's sky:
`SkyActivity.java` on Google TV, `Sky.open` in `web/sky.js` on LG and Samsung. Change one, change both.

- **The chart** is the whole sky overhead for the TV's location: the middle is straight up, the edge is the horizon,
  north at the top and east on the left. Stars to magnitude 5, the constellation lines, the brightest stars' names,
  the main constellations, the Southern Cross and Matariki (the Pleiades: "Matariki" in New Zealand or with te reo on,
  "Pleiades" elsewhere). Names never sit on top of each other: a name with no room is left off, the Southern Cross
  and the brightest stars first.
- **The moon** beside it: its phase drawn the way it looks from here (south of the equator a waxing moon is lit on
  the left), how much is lit, moonrise and moonset, sunset and sunrise for tonight, and the dates of the next full and
  new moon. The moon is on the chart too when it's up.
- Left and right move the sky an hour at a time; OK comes back to now. In the daytime it opens on tonight, at the
  first hour that's properly dark.
- At night the Tonight at home card shows the moon's phase and how much is lit.

Everything is worked out on the TV from its clock and location: no network, nothing sent, nothing stored. Star
positions come from d3-celestial's catalogue (BSD licence, `LICENSE-d3-celestial.txt`; the stars are Hipparcos), cut
down by `tools/make_sky.py` into `web/skydata.js` and `app/assets/sky.json` (about 42 KB). The sun and moon use the
Astronomical Almanac's low-precision formulas: the moon to about a quarter of a degree, full and new moon to about a
quarter of an hour, moonrise and moonset to a minute or two. Good enough for a family looking up; not for navigation.

## Consequences

One more round button at the top. Planets aren't on the chart yet; they would need orbital elements for each planet
and are a separate change. Star positions are J2000 and aren't precessed (about a third of a degree by 2026), which
doesn't show at this size.
