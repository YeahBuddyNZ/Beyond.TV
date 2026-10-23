# 0011. When the TV comes on: an update check, and who's watching

Date: 23/10/2026. Status: accepted.

## Context

Beyond TV looked for an update every 30 minutes, and at boot only when the last look was more than 30 minutes ago.
Most TVs never boot: they sleep and wake. So a TV turned on in the evening could show last week's version for up to
half an hour, which is exactly when the family is in front of it. Kyle asked for it to look on boot, and to ask who's watching when it loads.

## Decision

The TV looks for an update every time it starts up and every time it wakes from standby (the screen coming on), as
well as every 30 minutes. The look waits for the network and starts 15 seconds after waking, so it never slows the
home screen down.

Who's watching is asked at the same moments (when there is more than one person), not only after four hours away,
because the person on the couch at 7pm is rarely the one from the morning. On LG and Samsung it is asked when the app
opens and when it comes back after more than two hours out of sight.

Nothing else changes: an update found is still offered with one OK press, and installing by itself stays the
person's choice (ADR 0004).

## Consequences

A fix reaches a TV the next time it is turned on, not up to half an hour later. Each wake costs two small requests to
GitHub, well inside its limits for one home.
