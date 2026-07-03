# Three-Layer Architecture Reference

The structure that survived a seven-tool teaching suite's entire evolution — config / math / canvas separation, config-generated UI, immediate-mode redraws — restated here in its most robust form: plain JavaScript, no transpiler, dependencies per the stack profile chosen in SKILL.md rule 2 (suite profile: React UMD + Tailwind + MathJax, as the shipped tools actually use; portable profile: zero dependencies). The one absolute the suite's history enforced: in-browser Babel was removed at the second tool and never returned; React stayed but only as plain `React.createElement`; a later controlled test showed why — see the pitfalls reference. Visual conventions live in the design reference; this file is about structure.

## Layer responsibilities

### Config layer (`config.js`)

Declares *what the app exposes*. Everything user-tunable or display-relevant lives here:

```javascript
const AppConfig = {
  models: {
    'cobb-douglas': {
      name: 'Cobb-Douglas',
      // for HTML display: 'U(x,y) = A x<sup>&alpha;</sup> y<sup>&beta;</sup>'
      // for MathJax (if used): 'U(x,y) = A x^{\\alpha} y^{\\beta}'  — escaped backslashes!
      params: {
        alpha: { min: 0.1, max: 0.9, step: 0.05, default: 0.5, precision: 2, label: 'α (share of x)' },
      },
      visualization: { maxX: 20, maxY: 20, gridPoints: 200 }
    },
    'ces': { /* include rho with min/max/step actually LANDING ON the limit cases you teach */ }
  },
  economicParams: {
    income: { min: 10, max: 200, step: 5, default: 100, precision: 0, label: 'Income (m)' },
    // ...
  },
  getAllDefaults() { /* merge model + economic defaults */ },
};

if (typeof module !== 'undefined') module.exports = AppConfig;   // node-testability guard
```

- Every parameter spec carries `{min, max, step, default, precision, label}` — the UI maps over these, so adding a parameter is one config line.
- **Slider ranges are pedagogy.** Every limit case the lesson teaches must be reachable: range includes it, step lands exactly on it (step 0.3 from 0.1 never hits 0). Generous ranges beat tight ones — classroom users immediately push sliders to the ends, and a teachable value cut off by a cap is a documented reviewer complaint.
- Axis ranges and curve counts live here, not in drawing code — **and the suite convention is that they are fixed at runtime**: sized once to the reachable envelope (the most extreme equilibrium attainable anywhere in the shipped slider ranges, plus margin), not recomputed from current parameter values. Note that putting the value in config and then treating it as a floor that app code overrides loses the benefit while looking compliant — a rebuild test did exactly that (rationale and deviation cases: design reference §5; pitfalls §14).

### Computation layer (`mathCore.js`)

Pure functions only — no DOM, no canvas, no reads of global state. Each model implements a common interface so generic algorithms work across models:

```javascript
const MathCore = {
  models: {
    'cobb-douglas': {
      utility:   (x, y, p) => /* ... */,
      solveUMP:  (p) => /* closed form where it exists */,
      solveEMP:  (targetU, p) => /* ... */,
      generateIndifferenceCurve: (level, p) => /* points, or shape metadata for kinks */,
    },
  },
  performDecomposition(model, params) { /* {pointOrig, pointNew, pointComp, effects} */ },
  calculateDynamicLevels(model, params, maxX, maxY, n) { /* ray-sample origin→(maxX,maxY); see design reference §4 */ },
};

if (typeof module !== 'undefined') module.exports = MathCore;
```

The export guard is load-bearing: it's what makes `node verify.js` possible (see verification reference), which is the difference between *verified* identities and *claimed* ones when no browser is available.

- Prefer closed forms; where numeric, clamp domains (`Math.max(1e-3, v)`) and handle corners as explicit branches.
- Name results by economic meaning — `pointOrig`, `pointNew`, `pointComp` — never by plot letter. A/B/C naming got the compensated and new equilibria visually swapped twice in the suite before a semantic-naming refactor ended it.
- Kinked objects (perfect complements' L-shape, kinked budget sets) return *shape metadata*; sampling through a kink draws it wrong.
- Numeric defaults inside functions use `??`, never `||` (the falsy-zero bug made ρ = 0 unreachable once).

### Rendering layer (`canvasUtils.js`)

A small, stateless drawing toolkit. The app decides *what* to draw; this layer knows *how*:

```
initCanvas(canvas, width, height)      // devicePixelRatio scaling — skip this and plots ship blurry
calculateMargins(width, height)
createTransform(margins, w, h, maxX, maxY [, minX, minY])   // data→pixel; everything draws through it
drawAxes, drawGrid, drawTicks
drawCurve(ctx, points, transform, style)
drawLine(ctx, x1, y1, x2, y2, transform, style)
drawLShape(ctx, cornerX, cornerY, maxX, maxY, transform, style)
highlightPoint, addLabel
setupClipping / restoreClipping        // curves must not escape the (fixed) plot area
createRange(min, max, step)
interpolateColor(value, min, max, colorStart, colorEnd)   // level-graded curve families — see design reference §3
```

Keep it to roughly this API; scene-specific decisions (draw order, which curves, what colors mean) belong in the app's draw functions.

### App layer (inside `app.html`)

Vanilla JavaScript, one small inline script — the pattern is a plain state object and an explicit update pipeline:

```javascript
const state = { model: 'cobb-douglas', params: AppConfig.getAllDefaults() };
let analysis = null;

function recompute() { analysis = MathCore.performDecomposition(state.model, state.params); }
function renderAll() { drawMainPlot(); drawSecondaryPlot(); updateReadouts(); updateEquations(); }
function setParam(name, value) { state.params[name] = value; recompute(); renderAll(); }
```

- **Sliders are generated, not hand-written:** loop over the config's parameter specs, `document.createElement` a labeled `<input type="range">` with a live value readout for each, grouped into panels (Economic / Preference), each panel with a **Reset** button that merges *that panel's* defaults back in — Reset scope = the panel's own parameter group, not a global reset duplicated across cards (design reference §1). Reset matters pedagogically — students explore harder when nothing can break permanently, and per-group scope means resetting one experiment doesn't destroy another.
- **Draw functions repaint the full scene** — transform, grid, axes, then content — on every call. Immediate-mode redraw means no retained graphics state to get out of sync; the suite's pre-architecture monolith leaked memory precisely by accumulating per-render state.
- Cache only what profiling says to cache. For these plot sizes, full recompute-and-redraw per `input` event is fast; add memoization only if scrubbing visibly lags.

**React variant (suite profile):** React 18 UMD production builds with `React.createElement` (aliased: `const e = React.createElement`) — the pattern of all seven shipped tools, with `useMemo`/`useCallback` discipline (stable dependencies, nothing recreated per render). It is plain JavaScript: `node --check` parses it, no transpiler involved. JSX is excluded by stack rule 1 regardless — it cannot run without a transpiler, and the transpiler is how a test build shipped a blank page. In the portable profile, the vanilla state-object pattern above does the same job for one or two views.

**3D variant (the production tool):** when the concept is a surface, not curves, the suite uses Three.js (WebGL) with `OrbitControls` for rotation (never hand-rolled rotation — see the pitfalls reference), plus three non-obvious moves worth keeping. Cap the renderer: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — a WebGL framebuffer's cost is quadratic in pixel ratio, so an uncapped 3× display stutters the orbit (the 2D canvas path leaves DPR uncapped, where the extra resolution is cheap and crispness matters more). Label 3D axes by drawing the text to a 2D `<canvas>` and using it as a `THREE.CanvasTexture` on a `Sprite` — it billboards toward the camera and avoids `TextGeometry` and font-file loading; DPR-scale that label canvas so the text stays sharp. To tie the surface back to the 2D curves students know, add a translucent slicing plane marking which cross-section a paired 2D plot shows (horizontal plane = isoquant; vertical = total/marginal product) — the 3D analog of the two-synchronized-views marker below.

## Equations

One option per stack profile. In both, show *both* the general form and the currently-parameterized form, updated as sliders move — watching `x^0.50` become `x^0.62` connects algebra to geometry cheaply (full panel spec: design reference §6).

- **Suite profile — MathJax (the default).** What every shipped tool uses. Its two documented failure modes are silent *but statically checkable* — run this preflight before ever opening a browser:
  1. The `window.MathJax = {...}` config block appears **before** the loader `<script>` (source-order check).
  2. No unescaped backslashes in JS-embedded LaTeX — grep the source for single-backslash TeX commands in string literals (`"\alpha"` is just `"alpha"`; it must be `"\\alpha"`).
  3. `MathJax.typesetPromise()` is called after dynamic content updates — and only when the functional form changes, not on every slider tick (suite perf lesson).

  Then, in the browser pass, *read the rendered output* — the preflight catches the mechanisms, the human read catches anything else, because both failures degrade silently.
- **Portable profile — HTML/Unicode:** `U(x,y) = A·x<sup>α</sup>·y<sup>β</sup>` with literal Greek characters. Renders everywhere, offline, nothing to fail. The right choice when the file must work with no network; the trade is no multi-line derivations or aligned equations.

## The HTML shell

Portable-profile skeleton (the suite profile adds React, Tailwind, and MathJax CDN tags to `<head>` — MathJax config first):

```html
<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>…</title>
  <style>/* all styling here — no CSS frameworks */</style>
</head>
<body>
  <!-- layout containers, canvases -->
  <script src="config.js"></script>
  <script src="mathCore.js"></script>
  <script src="canvasUtils.js"></script>
  <script>/* app layer */</script>
</body></html>
```

In the suite profile, the CDN tags go in `<head>` (MathJax config first — see above); use production builds with current major versions, and *watch each URL load in the network tab once*. Generated dependency lists have repeatedly suggested outdated libraries; check, don't trust. Note on Tailwind: the suite uses the Play CDN (`cdn.tailwindcss.com`), whose failure mode is graceful (page renders unstyled, console warning) — acceptable for these tools, but it is network-only and officially not-for-production; for a hardened standalone, the handful of utility classes actually used can be inlined as static CSS. Every CDN subtracts from the "works offline" promise — tell the user which profile applies.

## Two synchronized views

The strongest pedagogical pattern in the suite: a **conceptual** canvas (the geometric picture — choice space, isoquants) beside an **implications** canvas (derived objects — demand curves, cost curves), with the same economic points marked consistently in both (same color, same label), semantic colors held constant, one legend, and any toggle affecting both views together. Cross-view consistency doubles as verification: a point that disagrees between views is a math bug announcing itself.

## Reusing this architecture for a new tool

Fastest proven path: take the closest existing tool as template, then (1) rewrite `config.js`, (2) replace `mathCore.js` model implementations behind the same interface, (3) keep `canvasUtils.js` nearly unchanged — it's domain-agnostic by design, (4) rewrite the app layer's draw functions and labels, (5) **re-derive the verification identity list for the new concept** — inheriting the old tool's checks is how wrong math sails through.
