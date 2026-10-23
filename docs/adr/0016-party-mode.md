# 0016. Party mode

Date: 23/10/2026. Status: accepted.

## Context

Kyle asked for evening games for the family, and a party mode for a birthday or a disco night, with Beyond Home's
lights joining in.

## Decision

A grown-up starts a disco or a birthday in Beyond Family, on one TV, for 15 minutes to two hours. The TV makes the
music itself (`PartyMusic.java`, `web/party.js`): an 8 second loop at 120 beats a minute, and for a birthday the
Happy Birthday tune first, the melody only, which is out of copyright. Nothing is downloaded and there is no music to
license. Coloured lights sweep the screen and pulse on the beat. A birthday shows the person's first name, which the TV
already has.

With a Beyond Home box, the TV asks for the box's Party moment at every chord change (every two seconds), passing the
beat so the box moves each light's colour on, and for Party over when the party ends, which puts colour lights back to
warm white. The room is the first one the box lists with a Party moment; the box lists rooms with a TV first. The box
builds and checks every call, as it does for every Moment (ADR 0010).

The TV never changes its own volume. Any key, Finish in Beyond Family, the time running out, or another app taking the
screen ends the party.

## Consequences

A house with two TVs in rooms with lights may light the wrong room, since the TV doesn't know which room it is in yet.
Nothing about a party is stored. The tune and loop are the same on Google TV, LG and Samsung; change one, change both.
