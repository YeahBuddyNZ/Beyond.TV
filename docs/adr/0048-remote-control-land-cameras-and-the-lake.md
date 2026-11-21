# 0048. Remote Control Land: three cameras and a lake with four water sports

Date: 21/11/2026. Status: accepted. Adds to ADR 0046.

## Context

Kyle loved Remote Control Land and asked for two more things: different angles, "like first person", and four water
sports. The game had one camera, from above, and one park.

## Decision

Still one file (`web/rcland.js`), still plain ES5 shapes on one canvas, nothing to download.

- **Three cameras**: from above (as before), chase (behind the machine, swinging round after its turns) and first person
  (in the driver's seat, with the front of the machine at the bottom of the screen). Chase and first person draw the
  same world in 3D by hand: flat shapes cut where they pass behind the camera, things standing up as flat pictures facing
  the camera, ramps as solid wedges and the machines as shaded boxes, everything painted furthest first. Flips, spins
  and wipeouts turn the machine in chase and turn the whole view in first person. No WebGL, so the oldest TVs that run
  the game still run every camera.
- The camera is picked on the machines screen (▼ to the Camera row) or in the pause menu (◀ ▶ on Camera), and the
  coloured buttons (or 1, 2, 3, C, V on a keyboard) change it while driving. It is kept on the TV with the rest
  (`btv.rcland`, `view`). From above stays the default: it is the easiest to drive and the lightest to draw.
- **A lake** with four water machines: jet ski, speedboat, surfboard and water skis (towed by a little boat). On the
  water a machine slides on after a turn and catches up (`grip`), which is how it feels different from land. White and
  red ski ramps float on the lake; a surf break on the right has waves rolling in that are moving ramps, which carry the
  surfboard faster than it can paddle and launch it off the crest. Islands with palm trees are solid; buoys, rubber
  ducks and barrels (the speedboat's job) are to bump; hoops, stars and balloons are to go through.
- The lake has its own eighteen challenges and its own best, counted apart from the park's (stats start with `w`), so
  nothing done on land ticks a box on the water.
- The machines screen has two rows, On land and On the water (▲ ▼ between them), then the Camera row.

## Consequences

- The 3D cameras draw more than the view from above (about 1.5 ms a frame on a laptop, against 0.5). Slow TVs may run
  them less smoothly; from above stays the default for that reason. Not yet tried on a real TV.
- The How to play guide has two new pages, Cameras and On the water.
