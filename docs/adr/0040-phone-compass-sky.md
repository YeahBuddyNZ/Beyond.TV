# 0040. A phone's compass points the sky

Date: 17/11/2026. Status: accepted.

## Context

Look around (ADR 0036) turns with the remote's arrows. Kyle wanted a phone's compass to point the TV's view too: hold
the phone up to the real sky and the TV shows the same patch.

## Decision

Beyond Family's TV page gets a "Point the sky" card (Fun tab). It sends two new commands through the usual TV command
queue.

- `sky` opens Look around on the TV (or does nothing if it is already showing).
- `sky-look` carries an azimuth and altitude in degrees. The phone sends about three a second, only when the aim has
  really moved, and the server keeps only the newest one waiting for each TV so a slow TV never replays old aims.
- The TV turns the view to it with the same glide the arrows use. If Look around is not showing, an aim does nothing,
  so a stray update never opens a screen.
- The phone does the compass maths (`shared/skyPoint.ts`). On Android it uses the absolute orientation sensor. An iPhone
  learns its north offset while it lies flat, from the compass heading Safari gives it.
- Starting it from the TV stays the rule: the arrows and the Find menu always work. The phone is the extra.

## Consequences

Only a direction in the sky is sent, never a location or anything about the person. The remote is never locked out: any
arrow press takes the view back. Sensors need a phone and the person's permission on it (iPhone asks once).
