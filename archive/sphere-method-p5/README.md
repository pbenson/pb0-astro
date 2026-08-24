# Sphere Method — original p5 sketch (2023)

The working 2D sketch of Murty's Sphere Method-7, kept here as the reference
implementation for the page tracked by the sphere-method bead. Copied from
`Dropbox/Pete/pbenson.github.io archive/p5/sphereMethod` (January 2023); the
p5 libraries it loaded are not copied, since the site supplies its own.

`classes.js` is the part that matters: `ConstraintSet.delta(x, y)` is δ(x), the
radius of the largest ball inscribed at x; `Sphere.touchPoints()` is the
touching set T(x); `Sphere.objectiveTouchPoint()` is the bottom point of the
ball in the −c direction; and `sketch.js` walks from a touching point through
the ball centre to the far constraint and interpolates back by the ε slider —
the near touching point of the paper.
