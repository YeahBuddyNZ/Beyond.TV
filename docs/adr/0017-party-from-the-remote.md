# 0017. Party from the remote

Date: 23/10/2026. Status: accepted.

## Context

Party mode (ADR 0016) could only be started in Beyond Family, by a grown-up, on a phone. Kyle asked for it on the TV
itself, so the kids who haven't got phones can start one too.

## Decision

A Party button sits with the round buttons at the top of the home screen, for everyone, kids included. It asks what
kind: a disco, or the birthday of anyone on this TV (their first name, which the TV already has). Either starts the
same party as ADR 0016 for 30 minutes, lights and all, and ends the same way: any key, the time running out, or
another app taking the screen. `PartyPickActivity.java` on Google TV, `Party.choose` in `web/party.js` on LG and
Samsung.

Starting one from Beyond Family stays a grown-up's choice, because that reaches a TV from another room.

## Consequences

Anyone holding the remote can start a party; anyone can stop it with any key. The corner can now hold up to seven
buttons, so the home screen's arrays for tabs and buttons were made bigger.
