# 0037. Turn the TV off from a phone

Date: 31/10/2026. Status: accepted.

## Context

Kyle asked: "Can we turn the tv off with the app?" Beyond Family could turn the TV on (ADR 0026) but not off, so
somebody in bed or out of the room had to find the remote.

## Decision

A `sleep` command from Beyond Family (`{kind: "sleep"}`), sent by the Turn off button beside Turn on on the TV page's
remote.

- **Google TV and Android TV:** `FamilyService` runs it through the TV's own ADB the way the sleep timer already does
  (`Sleep.Receiver`): the sleep key, then the power key on TVs that ignore it. Only when the screen is on, so a TV
  that's already dark is never switched back on by the power key. It needs the TV's ADB key allowed, the same as the
  remote's keys, and never asks for the key from there.
- **LG:** the sleep timer's way, the TV's remote control API (`system/turnOff`), which the TV asks once to allow.
- **Samsung (Tizen and Orsay):** Samsung lets no app turn the TV off, so the screen fades to black, the same as the
  sleep timer, and any key brings it back.
- Beyond Family keeps the command for a minute only. An off press that turns up later, after somebody has turned the TV
  back on, would be a surprise.

## Consequences

Nothing new is stored or sent anywhere. Anyone in the household can turn the TV off, the same as anyone can use the
remote and turn it on. The TV's own remote and the sleep timer work exactly as before.
