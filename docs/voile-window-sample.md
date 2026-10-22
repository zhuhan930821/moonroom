# Whole-wall sliding voile

One continuous rail spans the whole Gothic-window wall. Two pale cream/lavender translucent panels slide outward to the far left and right, or inward to meet at the center. This is one curtain set for the wall, not a separate pair for each arch. Press `C` in exploration mode to toggle; movement is smoothly damped. The original `drum-corner.glb` remains intact; its velvet curtain node is hidden by default and can be restored with `?voileSample=0` for comparison.

The two cloth surfaces are built in `src/scene/SheerCurtainSample.jsx`: 96 × 36 mesh subdivisions per panel, irregular pleats, cream-to-pale-lavender shader gradient, alpha blending with `depthWrite=false`, double-sided rendering, and fixed render order. Each panel uses a different phase for restrained low-frequency wind motion. They are render-only and do not change collisions or the existing furniture interactions.

## Browser captures

- Before: `screenshots/voile-whole-wall/before-purple-curtain.png`
- Open: `screenshots/voile-whole-wall/curtains-open.png`
- Closed: `screenshots/voile-whole-wall/curtains-closed.png`
- Reopened: `screenshots/voile-whole-wall/curtains-reopened.png`

The captures use the same camera position and show all three arches from left to right.

## QA

- Browser console: no errors during capture.
- The wide-view browser capture checks the sliding state sequence and reports runtime errors and draw calls. Headless software-renderer FPS is not a meaningful desktop GPU benchmark.
- The headless browser uses software WebGL and reports less than 1 FPS; this is not a meaningful desktop GPU performance benchmark.
- Star embroidery was omitted from the sample to keep the window view legible.
