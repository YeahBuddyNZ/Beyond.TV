# 0051. Remote Control Land: healthy snacks score, sugary ones cost

Date: 21/11/2026. Status: accepted. Adds to ADR 0046 and ADR 0049.

## Context

Kyle asked for the machines to "collect good snacks for points and sugary stuff for negative".

## Decision

- Snacks float at bumper height on the park's track and round the lake, drawn by hand on the canvas (no emoji font).
  - Healthy ones (apple, carrot, banana, broccoli) sit in a green ring. Driving through one scores 150, with the combo.
  - Sugary ones (lolly, donut, fizzy drink, cupcake) sit in a red ring with a line through. Driving through one takes
    150 off the score, never below nothing, and ends the combo.
- Every third spot is sugary, so there is always one to dodge. Like stars, they come back after about 30 seconds.
- In a race (ADR 0049) snack points count with the stunt points: healthy ones take time off, sugary ones put it back.
- They are added last when the park and the lake are built, so nothing else moves.
- How to play's Tips page says what they do.

## Consequences

- No new challenges, so the eighteen on each side stay as they were.
- Not yet tried on a real TV.
