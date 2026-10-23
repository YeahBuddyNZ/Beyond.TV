# 0019. Teen profiles, from the birthday in Beyond Family

Date: 23/10/2026. Status: accepted.

## Context

A kids' profile keeps a short list of kids' apps on the shelf, and YouTube Kids rather than YouTube. Kyle: an older
kid needs a teen profile with YouTube, and the TV should work out who is older from Beyond Family rather than
somebody remembering to change it.

## Decision

A kid of 13 or more is a teen. 13 is YouTube's own minimum age. Beyond Family works it out on the Auckland day from
the birthday on the Family page and sends `teen: true` on that person in `/tv/sync`. The TV is told only yes or no,
never the birthday or the age, so the day a kid turns 13 their shelf changes by itself.

A teen is still a kid in every other way: the grown-up PIN, no settings, no HDMI inputs, earn your screen and the
family-friendly picks all stay. The only change is the shelf: the kids' apps plus YouTube and music (Spotify and the
like). `People.teen` and `People.teenApp` on Google TV, `Profiles.teen` and `Profiles.teenApp` on LG and Samsung.

On a TV that isn't linked, the kids' profile switch in Who's watching goes off, kids, teen, then off again.

## Consequences

A kid with no birthday in Beyond Family is never a teen until somebody adds one; the TV page in Beyond Family nudges a
grown-up to. A shelf somebody arranged by hand for a kid is unchanged, as before.
