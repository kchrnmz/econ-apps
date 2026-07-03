# Verification Reference

Two distinct risks, both with documented instances:

1. **Economically wrong code that runs perfectly.** In the source suite: CES first-order conditions wrong in four separate apps, weights off the standard normalization, a wrong cost-minimization tangency condition, an inverted perfect-complements curve. No crashes; every one caught by inspecting economic content.
2. **Broken code reported as verified.** In a controlled rebuild test: an app with mathematically perfect formulas and a thorough protocol document shipped as a *blank page* (parse error), while its docs claimed "automated checks already passing" — checks that had never executed, because verification was done by reading the code instead of running it.

So verification has four passes — execution first, because every other pass is theater if the artifact doesn't run — plus an honestly-labeled handoff.

## Pass 0 — Execute the artifact

Non-negotiable, in escalating order of completeness; do every level you can, and record which level you reached. Which levels execute here follows from the user's setup choices in [environment.md](environment.md) — double-check the chosen tools with a quick probe, then go from there; never install or re-download mid-build. `node` covers levels 1–2, a browser covers level 3. With neither, every level transfers to the instructor protocol and the handoff opens by saying nothing was executed — that configuration is exactly the one that once shipped a blank page, and the labeling is what protects the user.

1. **Syntax:** `node --check config.js mathCore.js canvasUtils.js` (and every other JS file). With the no-transpiler stack rule, what parses under node is what the browser will parse. This single command catches the failure class that shipped the blank page.
2. **Identities under node:** because `mathCore.js` is pure with an export guard, write and run a `verify.js`:

```javascript
const AppConfig = require('./config.js');
const MathCore = require('./mathCore.js');

let failures = 0;
function check(name, lhs, rhs, tol = 1e-9) {
  const ok = Math.abs(lhs - rhs) <= tol;
  if (!ok) { failures++; console.error(`FAIL ${name}: ${lhs} vs ${rhs}`); }
  else console.log(`ok   ${name}`);
}

// the identity list from the planning stage, evaluated at defaults AND at slider extremes:
// check('SE + IE = TE (good x)', effects.sub.x + effects.inc.x, effects.total.x);
// ...
process.exit(failures ? 1 : 0);
```

Run it at the defaults, at every slider's min and max, and at the limit-case values. Commit `verify.js` with the app — it re-runs free on every change.
3. **Browser, if available** (headless is fine; Playwright in whichever flavor — Python or node — environment.md records): open the final HTML, capture console errors, confirm sliders exist and dispatch updates, confirm canvases are non-blank. If no browser is available in your environment, **say so explicitly in the handoff** — do not infer "it loads" from "it parses."
4. **After bundling: repeat on the bundled file.** The standalone HTML is the deliverable; sources passing while the bundle fails is a real failure mode (script order, duplicated globals).

## Pass 1 — Identities, numerically

The identity list comes from the planning stage — derive it for *your* concept; examples by domain:

- Decomposition: substitution effect + income effect = total effect, per good.
- Duality: `solveEMP(solveUMP(p).utility, p)` returns the UMP bundle; expenditure at the indirect utility equals income.
- Demand: budget exhaustion (p·x = m) under local nonsatiation; Hicksian = Walrasian at the anchoring utility level.
- Production/cost: cost shares sum to 1 where they should; MC cuts AC at AC's minimum; Shephard's lemma vs. numeric differentiation.
- Growth: steady state satisfies s·f(k*) = (n+g+δ)k*; golden-rule s maximizes c* (and equals α under Cobb-Douglas).
- Equilibrium/welfare: markets clear; CS + PS + DWL accounting closes.

Tolerances: ~1e-9 for closed forms; a stated looser tolerance for numeric solvers. A violation appearing only in some parameter regions is a *regime bug* — a branch (corner, kink, limit case) computed wrong.

## Pass 2 — Limit and special cases

Drive every model to where it degenerates; check **math, rendering, and reachability** at each:

- **CES is the canonical trap** — three limits: ρ → 0 (Cobb-Douglas), ρ → 1 (perfect substitutes), ρ → −∞ (perfect complements). The CES formula is numerically explosive near ρ = 0: implement the limit as an explicit branch, and confirm the branch *triggers* (the falsy-zero bug made ρ = 0 silently unreachable once).
- **Corner solutions:** quasilinear/linear preferences corner at ordinary parameter values — the solver must return the corner, not a negative quantity or NaN, and the plot must show the bundle on the axis.
- **Kinks:** L-shapes drawn from shape metadata, corner on the correct ray (an inverted L shipped once).
- **Boundary parameters:** each slider at min and max, in combinations. Axes, labels, clipping all survive.
- **Reachability:** every teachable special value is actually reachable with the shipped min/max/step — range includes it and the step lands on it exactly. (A rebuild test caught a golden-rule savings rate that the s-slider's cap excluded at high α — found only because reachability was checked deliberately.)

## Pass 3 — Smoothness sweeps and visual audit (browser + human eye)

Open the app and drag every slider slowly end to end:

- **Regime jumps:** where theory says responses are continuous, any curve jump or point teleport flags wrong math at a branch boundary. This one technique found most of the suite's math bugs — in the author's words, "weird jumping between regimes when one would expect smooth response."
- **Shape sanity:** convexity the right way, substitutes linear, complements L-shaped, demands sloping as the model says.
- **Axes and orientation:** the right variable on each axis (a utility surface once rendered with utility as a *horizontal* axis).
- **Cross-view consistency:** every point marked in two views agrees — quantities, color, label. Disagreement is a math bug until proven otherwise.
- **Rendered equations:** literal `alpha` where α belongs, or raw `$...$`, are the two known silent MathJax failures; with HTML/Unicode equations, check sub/superscripts visually.
- **Performance:** rapid scrubbing at dense settings shouldn't lag or grow memory.

If you have no browser, this entire pass transfers to the instructor protocol — labeled as such.

## The handoff — instructor protocol, honestly labeled

The instructor is the final verifier by design: a trained domain eye catches what assertions miss (tools that passed everything above have still had bugs caught at this step). End every build with a protocol (`handoff.md`) in two sections:

```
Verification status — [tool name]
VERIFIED HERE (executed):
  - node --check: all modules parse
  - verify.js: 14 identities pass at defaults + 8 extreme points (run: node verify.js)
  - [browser checks, if you had a browser]

REQUIRES YOUR BROWSER (not yet executed — please confirm):
1. Open the file. EXPECT: two plots, sliders, equations render with proper symbols.
2. Set ρ = 0 (CES). EXPECT: curves identical to Cobb-Douglas; smooth as ρ crosses 0.
3. Raise priceX 2 → 4, decomposition ON. EXPECT: SE + IE = TE in the readout, both goods.
4. Slide each slider end to end. EXPECT: smooth responses, no jumps, no blank canvas.
5. [limit case]. EXPECT: ...
```

Rules: 5–8 lines, each falsifiable; **every number in the protocol is computed by executing `mathCore.js` under node against the final config** — extend `verify.js` to print the expected readouts and paste from its output. Never write an EXPECT value by hand or from memory: a rebuild test whose code was perfectly correct shipped a handoff claiming k* ≈ 8.685 at defaults when the app (and an independent re-derivation) said 11.047 — hand arithmetic in the doc, drift failure mode #15, and the first thing the instructor checks is wrong. Likewise, a protocol citing a superseded slider range is the same documented failure. Never list anything under VERIFIED that did not execute. Tell the user plainly: a failed EXPECT is a bug report, not a curiosity.
