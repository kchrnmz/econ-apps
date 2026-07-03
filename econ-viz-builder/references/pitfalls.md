# Pitfall Catalog

Failure modes observed while building a seven-tool teaching-visualization suite (200+ commits, plus a pre-git chat-built generation), and in a controlled rebuild test of this skill. Read before extended debugging; each entry is symptom → mechanism → mitigation, with the real instance that earned it a place here.

## 1. Plausible-but-wrong economics

**Symptom:** the app runs, plots look professional, nothing errors — and the economics is wrong.
**Instance:** wrong CES math in four separate apps; a cost-minimization tangency condition that was simply incorrect; CES weights off the standard normalization.
**Mitigation:** the full verification reference (identities asserted numerically, limit cases, smoothness sweeps). Treat "it renders" as zero evidence of correctness. The discovery channel that worked: *watching plot behavior across parameter changes* — wrong math shows up as jumps where theory predicts smoothness.

## 2. The falsy-zero parameter bug

**Symptom:** one specific parameter value can't be selected, or silently acts like another value.
**Mechanism:** `value || default` treats 0 (and `""`, `NaN`) as "unset." In a CES app this made ρ = 0 — the Cobb-Douglas limit, the single most pedagogically important value — unreachable.
**Mitigation:** `value ?? default` for every numeric parameter, everywhere. Then verify reachability by actually selecting the special values in the running app.

## 3. Silent MathJax failures (two independent ways)

**Symptom:** equations display as literal text (`alpha`, raw `$x^2$`) — no error anywhere.
**Mechanism:** (a) the MathJax config object was defined *after* the loader script tag, so it was ignored; (b) LaTeX in JS strings with unescaped backslashes — `"\alpha"` is just `"alpha"` to JavaScript.
**Mitigation:** config script block before the loader, `"\\alpha"` in all JS-embedded LaTeX, `MathJax.typesetPromise()` after dynamic updates — and a human actually *reading* the rendered formulas before shipping (this shipped twice unnoticed).

## 4. The robustness→bloat spiral

**Symptom:** each defensive fix makes the file bigger, slower, and the next bug harder to find.
**Instance:** a chat-built 2,500-line monolith developed stack overflows and memory leaks (recursive validation loops, debounced functions recreated per render, dev-build React, hundreds of points × dozens of curves redrawn per render). Two rounds of defensive patching grew the file ~20% while the crashes continued; later, the AI itself recommended deleting its own earlier defensive code as redundant. In the authors' words, the tool "became bloated after making it robust."
**Mitigation:** when fixes start defending against the architecture, change the architecture. The cure here was the three-layer rebuild: pure math layer (nothing to recurse into the DOM), `useMemo`/`useCallback` discipline (stable dependencies, no per-render recreation), immediate-mode redraw (no accumulating state), production React. Every subsequent tool on that architecture had zero stability incidents.

## 5. Patch loops — when to stop iterating

**Symptom:** the same bug survives two or three plausible patches.
**Instance:** a 3D rotation skew bug absorbed multiple patch attempts; the fix came from the question "if you re-implemented the whole rotation in a standard way, how would you do it?" — replacing ad-hoc scene rotation with standard orbital camera controls.
**Mitigation:** two failed patches is the signal. Stop, name the standard textbook pattern for the subsystem, and re-implement against it. Also: separate diagnosis from action — produce a written analysis of the mechanism *before* touching code ("I want analysis of the problem and steps to fix it, do not rewrite the file" was the prompt discipline that emerged). Patches applied without a stated mechanism are guesses.

## 6. Outdated or wrong CDN dependencies

**Symptom:** generated HTML references old library versions, deprecated CDNs, or dev builds.
**Instance:** outdated JS libraries recurred across early chat-built versions and had to be repeatedly removed; the dev build of React contributed measurably to the performance crisis.
**Mitigation:** check every CDN URL — current major version, production build, loads successfully in the browser. Generated dependency lists are suggestions to verify, not facts.

## 7. Label/semantics drift

**Symptom:** the right values displayed under the wrong labels — points or curves swapped.
**Instance:** "point B" (new equilibrium) and "point C" (compensated) were confused and swapped twice across two apps, until a refactor renamed everything semantically (`pointOrig` / `pointNew` / `pointComp`).
**Mitigation:** name every economic object in code by its economic meaning from day one. Plot letters are display strings, never identifiers. Include a label-correctness line in the instructor protocol — mislabeled correct math teaches the wrong lesson just as effectively as wrong math.

## 8. Blurry canvas

**Symptom:** fuzzy lines and text, especially on laptops/projectors — i.e., exactly the classroom display.
**Mechanism:** canvas sized in CSS pixels without `devicePixelRatio` scaling.
**Mitigation:** `initCanvas` scales the backing store by `devicePixelRatio` once, at setup. Silent quality failure: nothing errors, students just squint.

## 9. Lost uncommitted work

**Instance:** one set of experimental improvements existed only outside version control; it is also the only work in the suite's history that was lost and had to be rebuilt from memory.
**Mitigation:** `git init` before the first line of code; commit every working increment. Also keep the standalone build separate from source — editing the bundled file directly forks the codebase silently (the build script regenerating it will destroy those edits).

## 10. CDN dependence (a trade-off, not a bug)

The zero-dependency default avoids this entirely. When MathJax or React earn their way in, the file is no longer truly offline: a CDN outage or URL rot breaks it in front of a class. Mitigations to offer the user, not impose: test on the actual classroom network; keep a zero-dependency fallback copy for high-stakes sessions; state the dependency in whatever documentation ships with the tool.

## 11. Iteration churn without scope control

**Symptom:** dozens of regenerated versions, regressions reintroducing earlier bugs ("you had it right in version 1").
**Instance:** the first tool went through 47 artifact versions in a single day, including a regression loop, before stabilizing.
**Mitigation:** the workflow disciplines in SKILL.md — plan before implementing, one feature per commit, diagnosis before patching, and constrain each request's scope ("change only the rendering of X"). Broad "fix it" iterations regress what already worked.

## 12. A transpiler in the runtime

**Symptom:** the deliverable is a blank page — no UI, no console hint visible to a casual user, nothing.
**Mechanism:** JSX requires in-browser Babel; any syntax Babel rejects means *the entire app never exists*. The failure surface is rich: in the controlled rebuild test, TeX braces inside JSX (`$k^{{{a.toFixed(2)}}}$` — TeX wants literal braces, JSX assigns them meaning) killed the build at parse time, with mathematically perfect formulas behind the wall.
**Instance:** the rebuild test shipped exactly this blank page; the source suite itself removed Babel at its second tool ("Remove unused Babel dependency") and never reintroduced it — six of seven tools run `React.createElement` untranspiled.
**Mitigation:** stack rule 1 — ship only code that runs as written. No JSX, no Babel. Then `node --check` becomes a real gate: what parses under node is what the browser parses.

## 13. False verification self-reports

**Symptom:** documentation says "checks passing" about an artifact that does not run.
**Instance:** the rebuild test's protocol document claimed "Automated checks (already passing)" — its `verify()` lived inside an app that never executed; verification had been done by reading code, not running it. The result was worse than no protocol: it instructed the instructor to relax exactly where vigilance was needed.
**Mitigation:** verification Pass 0 (execute: `node --check`, identities under node, browser if available), and the honest-reporting rule — the handoff separates VERIFIED HERE (executed) from REQUIRES YOUR BROWSER (not executed). Never report a check that didn't run.

## 14. Runtime axis autoscaling

**Symptom:** the equilibrium point looks pinned in place mid-frame while the axis tick labels change as sliders move — the frame zooms instead of the economics moving.
**Mechanism:** axis bounds recomputed from *current* parameter values on each change — the default charting-library instinct ("autoscale so nothing clips") that any generator regresses to unless told otherwise. Putting an axis value in config doesn't prevent it: the rebuild test had `kMax` in config and then demoted it to a floor, recomputing the real bound each change so k* always sat "at ~65% of axis."
**Why it matters pedagogically:** a rescaling frame converts "the steady state moved" into "the picture zoomed," breaks before/after slider comparisons, and hides the visual event the lesson exists to show.
**Mitigation:** size axes once from config to the reachable envelope (the most extreme values attainable within the shipped slider ranges, plus margin) and never rescale at runtime; clipping handles curves that exceed the frame (design reference §5). Mechanical check: drag each slider end-to-end and confirm the tick labels do not change.

## 15. Documentation drifting from the shipped code

**Symptom:** the verification protocol or user notes cite parameter values, ranges, or behaviors from an earlier version.
**Instance:** the rebuild test's protocol referenced a savings-rate slider max of 0.60; the shipped slider's max was 0.75 (changed during development, doc not regenerated). A later rebuild with fully correct code shipped a handoff claiming k* ≈ 8.685 at defaults — the app computed 11.047; the doc number was hand arithmetic, and it sat on the *first* line the instructor would check.
**Mitigation:** treat docs as build outputs, not running notes — every number in the handoff is produced by executing `mathCore.js` under node against the final config (extend `verify.js` to print the expected readouts and paste from its output), as the last step before delivery.
