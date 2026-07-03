# Design Reference — the Suite's Visual House Style

The visual conventions of the published seven-tool suite, extracted from its latest (highest-quality) generation — the cost tool (Oct 2025) is the most evolved instance. These are **conventions with their reasons attached, not mandates**: what worked, and why, so you can judge when a convention doesn't apply. The user's wishes and the learning goal (workflow stage 1) always outrank this file; when you deviate, say so in the plan so it reads as a decision rather than an omission.

Why this file exists: a controlled rebuild test produced a functionally correct app (7/7 on the assertion rubric) that *looked nothing like the suite* — dark dashboard sidebar instead of card grid, runtime axis autoscaling instead of a fixed frame. Functional rubrics can't see design; this file is what transmits it.

## 1. Layout grammar

Centered `<h1>` title with a one-line subtitle; below it a responsive card grid (`grid-cols-1 lg:grid-cols-3`, `max-w-7xl mx-auto` in Tailwind terms — same geometry in plain CSS for the portable profile). Each panel is a white card: rounded corners, subtle border + shadow, modest padding, an `<h2>` heading. Panel order: controls → plots → results readout; a full-width educational section sits below the fold.

**Reset is a scoping convention, not a placement one:** each *parameter group's* panel gets a Reset in its card header, restoring *that group's* defaults — in the suite's cost tool, the Cost Parameters card's Reset and the Production Function card's Reset are separate functions over disjoint parameter sets, so a student can reset the production function they broke without losing their chosen prices. Panels that own no parameters have no Reset in the suite; one parameter group means one Reset button. (The convention exists because its surface form transmits without its meaning: a rebuild test stamped a Reset onto every card, all wired to the same global reset — buttons that look scoped but aren't.)

*Not* the house style: page-spanning headers, dark sidebars, dashboard chrome. The tools read as worksheets, not control rooms.

## 2. Semantic color system

Held constant across every tool in the suite, so students who saw one tool can read the next:

| Token | Hex | Meaning |
|---|---|---|
| curve-family ramp | `#bfdbfe` → `#1e40af` | the model's curve family (indifference curves, isoquants), light→dark by level |
| highlight blue | `#1e40af` | the *currently relevant* curve (optimal IC, target isoquant) — bold 3px vs the family's thin 1px |
| constraint red | `#dc2626` | budget/constraint lines, the optimal point marker and its label |
| secondary green | `#059669` | a second constraint when one exists (isocost beside isoquants) |
| background family (flat fallback) | `#93c5fd` | thin background curves when not level-graded |

Line weight is part of the encoding: background family 1px, highlighted economic objects 3px. The optimal point is a red ring with white center (`highlightPoint` with `outerColor: '#dc2626'`, `innerColor: '#ffffff'`), labeled in bold red with its coordinates (`X*=…, Y*=…`).

**Anchoring a curve label — which point?** Prefer a model-computed feature: an axis intercept, an intersection, or where the curve exits the frame. These move only when the economics moves; an anchor at a fixed fraction of an axis stays on the curve but slides along it with every slider tick. Sweep the sliders and watch: labels should move with what they name, stay in frame, and not collide at the envelope's extremes.

**Keep labels off the lines they annotate.** Two techniques, both carried by `addLabel`: offset the label *perpendicular* to the nearby line so it doesn't sit on top of it (a near-vertical line → push the label east/west; a near-horizontal one → push it north/south) via `offsetX`/`offsetY`; and where a label must fall over curves or grid, give it a semi-transparent white background so the text stays legible (`addLabel` defaults to `backgroundColor: 'rgba(255, 255, 255, 0.6)'` with padding). Crowded plots use both — displace first, then back the text where overlap is unavoidable.

In two-view layouts, the same economic point keeps the same color and label in both views (see architecture.md "Two synchronized views").

## 3. Level-graded curve families

Background curves are colored by their economic level: map each curve's utility/output level through `CanvasUtils.interpolateColor(level, minLevel, maxLevel, lightBlue, darkBlue)` so darker = higher. "Higher indifference curves are better" becomes visible without any labels. This is the suite's newest design iteration (the cost tool; earlier tools use the flat `#93c5fd` fallback) — treat it as the recommended default for any curve family.

## 4. Dynamic level selection

Which levels to draw the background family at: sample along the ray from the origin to (maxX, maxY) and evaluate the model at each sample (`calculateDynamicUtilityLevels` pattern, in the math layer). This keeps the family visually evenly spread across the frame *for the current parameters* — fixed hard-coded levels bunch up or vanish as parameters move. For steep curve segments (CES near the axes), two adjustments keep the curve from looking broken. Sample with logarithmically spaced points so it stays smooth where it bends hardest. And start the sweep at the x where the curve first enters the frame — invert the curve at y = maxY to get x_entry — rather than at x ≈ 0: a uniform sweep from the axis puts the first sample's y far above the frame and skips the near-vertical top, so the curve looks cut off at the ceiling; entering at x_entry draws it right up to the top edge.

Note the division of labor: the *levels* recompute per parameter change; the *frame* does not (next section).

## 5. Static axes — the frame never rescales at runtime

The suite's convention: axis ranges are computed **once, from config**, sized to the *reachable envelope* — the most extreme equilibrium/curve values attainable anywhere in the shipped slider ranges, plus margin. Per-model fixed ranges fit this (each model gets its own `visualization` block in config); recomputing axis bounds from the *current* parameter values on each change does not.

**Rationale:** students perceive motion of economic objects against a stable frame. A rescaling frame converts "the equilibrium moved" into "the picture zoomed," makes before/after slider comparisons meaningless, and hides exactly the visual event the lesson wants (in a Solow tool, k* marching rightward as s rises *is* the lesson). Curves that exceed the frame are handled by clipping (`setupClipping`) — that is what it's for.

**The instance that earned this section:** the controlled rebuild test recomputed `kMax` on every parameter change so the steady state always sat "at ~65% of axis"; the config's axis value was demoted to a floor. The steady-state point appeared visually pinned mid-frame while the axes stretched around it. Autoscaling is the default charting-library instinct every generator regresses to unless told otherwise — this section is the telling.

**When to deviate:** only when one model's slider range genuinely spans orders of magnitude, and the deviation is visible and declared (a log scale, stated on the axis label) — never silent autoscaling.

**Mechanical check:** drag each slider end-to-end; axis tick labels must not change.

## 6. Equation panel

The panel belongs to the house style in **both profiles** — the profile choice changes the renderer, not the panel (a rebuild test that chose the portable profile dropped the panel along with MathJax; if you mean to drop it, plan it, don't lose it by association). Three things: the **problem statement** (the min/max with its constraint), the **general form**, and the **currently-parameterized form** — watching `x^0.50` become `x^0.62` as the slider moves connects algebra to geometry cheaply, and that connection only happens if the parameterized form updates live with the sliders (static canvas labels like `f(k)` don't do it). Rendering: MathJax in the suite profile (perf discipline from the suite's commit history: re-typeset with `MathJax.typesetPromise()` only when the functional form changes, not on every slider tick — parameterized values can update via plain DOM text where possible); HTML/Unicode sup/sub in the portable profile.

## 7. Results readout and educational content

Two panels the rebuild test omitted entirely:

- **Optimization Results** — the formal problem with current numbers substituted, plus the solved values (optimal bundle, achieved utility / minimized cost). This is the bridge between the picture and the algebra.
- **Educational section** (full-width, below the fold) — what each visual element means (legend rows: color swatch + text, e.g. "blue curves = indifference curves, darker = higher utility"), how to read the tool, and 3–5 interpretation points connecting manipulations to theory. This is also where the instructor's framing lives when the tool is student-driven.

## Transmitting the style without constraining the build

- Use the **token names** from §2 in code (`COLORS.constraintRed`, `COLORS.curveRamp`), not raw hex scattered through draw calls — the portable profile then inherits the palette for free.
- If the user has an existing suite tool or screenshot, treat it as the reference target: "make it look like this unless the pedagogy says otherwise" outranks every rule above.
