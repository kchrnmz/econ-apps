---
name: econ-viz-builder
description: Build interactive, single-file HTML visualizations for teaching economics and other quantitative subjects — parameter sliders, live canvas plots, rendered equations, no install or server required. Use this skill whenever the user wants an interactive teaching tool, classroom demo, explorable model, or "app" illustrating a quantitative concept (consumer theory, production, growth models, market equilibrium, sampling distributions, game theory…), even if they don't say "visualization" — including requests like "make something my students can play with to understand X" or "an interactive graph of Y with sliders."
---

# Econ Viz Builder

Build a self-contained interactive teaching visualization: one HTML file an instructor can project in class, post to an LMS, or email to students, who run it by double-clicking. Distilled from a seven-tool suite (consumer theory, production, cost) built this way and used in a graduate micro course — and from a controlled rebuild test whose lesson is baked into the stack rules below.

**What the finished product looks like:** a centered title over a responsive grid of white cards — controls, one or two synchronized `<canvas>` plots redrawn on every parameter change, the model's equations in general and currently-parameterized form, a results readout, an educational section below — with a Reset button per *parameter group*, each scoped to its own group's defaults. The full visual house style is in [references/design.md](references/design.md). Plain JavaScript (no transpiler), developed as a few small modules, shipped as a single bundled HTML file.

## How to read this skill

Almost everything here is a **default, not a rule** — distilled from what worked and what failed across the suite's history, each with its reason stated so you can judge when it doesn't apply. If the user wants something different, or the learning goal pulls another way, deviate: record what you're deviating from and why in the plan, and (where it affects them) in the handoff. This document is a floor of accumulated experience, not a ceiling on your judgment — be better than it where you can.

Two things are not defaults, because they protect the user's ability to *trust* the deliverable rather than any style choice: **verify by executing the artifact** (Pass 0), and **never report a check you did not run** (the honest-handoff rule). Everything else bends.

**Assume the user has not read this skill.** As you work, narrate each step in a sentence of plain language before you do it — what you're about to do and why — so the user can follow and redirect without knowing the skill's internals. Keep it brief; this is orientation, not a transcript.

**Environment:** [references/environment.md](references/environment.md) records which tools the **user chose** for this machine at setup ([SETUP.md](SETUP.md)). Read it before building, double-check the chosen tools with a quick probe (`node --version` and the like), and go from there. Every dependency is optional: `node` makes verification *executed* rather than claimed, a browser adds the visual pass, and a capability the user left out changes what the handoff claims — never whether the workflow runs. Never install or re-download anything at build time, and don't substitute tools the user didn't choose; if the record doesn't match reality, say so and degrade honestly. If environment.md is missing, run SETUP.md first.

## Stack guidance — strong defaults, with the evidence behind them

The central risk in this domain is *silent failure*: economically wrong code that runs fine, and broken code that fails invisibly (blank page, degraded math, missing curve) with no error you'll see unless you execute the artifact. Each default below exists to convert silent failures into detectable ones — weigh deviations against that.

1. **Ship code that runs as written — no JSX, no Babel, no transpilers — unless you have a concrete reason and an execution gate to match.** The source suite removed in-browser Babel at its second tool ("Remove unused Babel dependency") and never reintroduced it; a controlled test build that used JSX anyway shipped a *blank page* — a TeX-vs-JSX brace collision that Babel rejects at parse time, so nothing ever rendered. Untranspiled JavaScript fails with console errors you can find and `node --check` can catch; transpiled code fails by not existing. This is the strongest default in the skill: if you do introduce a transform, `node --check` no longer covers you, so the deliverable must be executed in a real browser before any verification claim.

2. **Choose a stack profile, and tell the user which one applies.** Two proven configurations:
   - **Suite profile — the default when the tool should look and behave like the published suite:** React 18 UMD with `React.createElement` (never JSX — rule 1), Tailwind via CDN for the card-grid layout, MathJax for equations. This is what every shipped tool in the source suite actually uses. Its cost is honesty about offline: the file needs a network connection at runtime — state this in the handoff, and offer a portable-profile fallback copy for high-stakes sessions.
   - **Portable profile — when offline or email distribution is the requirement:** vanilla JS + hand-drawn canvas + HTML/Unicode equations (`x<sup>α</sup>`, real Greek characters). No network, nothing to rot or fail silently.
   - **In both profiles, avoid:** charting libraries (the hand-drawn canvas toolkit has covered everything these tools needed, and stays debuggable), dev builds, and dependencies you haven't watched load. MathJax's two known silent-failure modes are statically checkable before runtime; run the preflight in [references/architecture.md](references/architecture.md).

3. **Keep the math layer runnable outside the browser.** Pure functions in their own file with a CommonJS export guard (see architecture reference). The reason is practical, not stylistic: it is what lets you *execute* the verification identities under `node` even when no browser is available — the difference between verified math and claimed math. If you structure things differently, preserve that property some other way.

## Workflow

### 1. Pin down the learning goal

Before any design, establish what the student should *see, predict, or be surprised by*. Ask clarifying questions if the request leaves these open: what concept and what target misconception (this decides what gets a slider); which functional forms, including the limit cases the lesson needs; one view or two synchronized views (a conceptual plot paired with an implications plot — e.g., choice space + demand curves — is the strongest pattern); instructor-projected or student-driven; whether the tool may rely on CDN scripts (needs network at runtime) or must run fully offline (this decides the stack profile in rule 2).

### 2. Write the spec, then implement

Before code, write `spec.md` and commit it (or just save it, if git isn't available — environment.md) — the plan as an artifact you re-read when revising the tool later. Get the user's sign-off before implementing, and keep planning and implementation in separate passes — quality drops in both the suite record and the test build when they blur. Three sections; flag any departure from a skill default so it reads as a decision, not an oversight:

- **Econ** — functional forms, including the limit cases the lesson needs; the **economic identities and limit/special cases the finished tool must satisfy** (this list *is* the stage-5 verification suite — writing it now is what makes verification real); the **reachable envelope** (most extreme values attainable across the shipped slider ranges, plus margin) → fixed axis ranges, never rescaled at runtime (see [references/design.md](references/design.md)).
- **Features** — parameter schema (name, range, default, pedagogical role); stack profile (suite vs portable, rule 2); **the equation panel's three contents** (problem statement, general form, live currently-parameterized form — a suite convention in both profiles; drop only as a stated deviation).
- **Design** — ASCII layout mock; module breakdown; any deviation from the [references/design.md](references/design.md) house style, with its reason.

### 3. Scaffold the three-layer architecture

Read [references/architecture.md](references/architecture.md) and [references/design.md](references/design.md) — the second is the suite's visual house style (layout grammar, semantic colors, level-graded curve families, static axes): what the published tools look like and why. Use it as your starting point; the user's wishes and the learning goal outrank it — just note deviations in the plan. Create:

```
config.js      — what the app exposes: models, parameter specs {min,max,step,default,precision,label}, axis ranges, display settings
mathCore.js    — pure economics: solvers, curve generators; no DOM, no globals; node-runnable via export guard
canvasUtils.js — stateless drawing toolkit: transforms, axes, grids, curves, points, labels, clipping
app.html       — thin UI: state object, sliders generated from config, draw functions that repaint whole scenes
```

The discipline that matters: **UI is generated from config** (adding a model is a config change, not a UI rewrite), **the UI layer never computes economics** (it calls `mathCore` and paints results), and **every repaint redraws the whole scene** (no retained graphics state to corrupt).

If git is available (environment.md), initialize a repository immediately and commit each working increment — the only work ever lost in the source suite was the one stretch that lived outside version control; without git, keep dated working copies and note it in the handoff.

### 4. Implement incrementally

One feature per commit, executing between commits (stage 5's checks, run early and often — not saved for the end). When a bug appears, **diagnose before patching**: state the suspected mechanism in words, then change code. If two patches fail, stop patching and re-implement that subsystem against the standard textbook pattern — in the suite, a 3D rotation bug survived every patch and vanished when ad-hoc rotation was replaced wholesale with standard orbital camera controls.

Known JavaScript traps with economic consequences (full catalog: [references/pitfalls.md](references/pitfalls.md)): `value || default` silently swallows 0 — it once made the Cobb-Douglas limit (ρ = 0) unselectable; use `??`. Initialize canvases at `devicePixelRatio` scale or plots ship blurry on exactly the classroom projector.

### 5. Verify — economics AND execution, with honest reporting

Read [references/verification.md](references/verification.md) and run every pass your environment can execute ([references/environment.md](references/environment.md) says which); what cannot execute here transfers to the instructor protocol, labeled as such:

- **Pass 0 — Execute the artifact.** `node --check` every JS file; run the identity suite from stage 2 under `node` against the real `mathCore.js`; open the final HTML in a headless browser if one is available (console errors, sliders actually wired, canvases non-blank). This pass is non-negotiable because it is the one the failed test build skipped: that build had mathematically perfect formulas, a thorough protocol document, and a deliverable that rendered *nothing*.
- **Pass 1 — Identities, numerically** (substitution + income = total; duality; adding-up — whatever stage 2 listed).
- **Pass 2 — Limit and special cases**, including *reachability*: every limit case the lesson teaches must be reachable with the shipped slider ranges and step sizes.
- **Pass 3 — Smoothness sweeps and visual audit** (requires a browser; if you don't have one, this pass transfers to the instructor — see below).

**Honest-reporting rule:** never report a check you did not execute. The handoff explicitly separates *Verified here* from *Requires your browser* — claiming unexecuted checks is worse than skipping them, because it cancels the instructor's vigilance exactly where it's needed.

### 6. Package and hand off

Bundle the modules into one distributable file with [scripts/build_standalone.mjs](scripts/build_standalone.mjs) (`node scripts/build_standalone.mjs app.html -o app_standalone.html`; [scripts/build_standalone.py](scripts/build_standalone.py) is the equivalent for python-only environments, and with neither runtime, assemble manually — the bundle transformation is mechanical), then **re-run Pass 0 on the bundled file** — the deliverable is what gets verified, not its sources. Keep developing in the modular files; never edit the standalone directly.

Hand the user an **instructor verification protocol** (`handoff.md`): 5–8 falsifiable lines, each a manipulation plus what the economics says should happen, with *every number computed by running `mathCore` under node against the final config* — never by hand (a stale or hand-computed protocol number is a documented failure mode that recurred even with correct code), split into the checks you executed and the checks that need their browser and domain eye. The instructor is the last verifier by design — their trained eye catches what assertions miss.

### Optional hardening — accessibility and security

Only once the tool works and passes verification, and only if the context calls for it (wide LMS distribution, an institutional a11y requirement). Both degrade to the instructor protocol; label what you skip.

- **Accessibility** — sliders keyboard-operable with a `<label>`/`aria-label` each and visible focus; every canvas carries a text alternative (it's opaque to screen readers); meaning never in color alone (pair the [design.md](references/design.md) §2 palette with weight/shape/labels — the suite already does); honor `prefers-reduced-motion` if anything animates.
- **Security** — mainly suite-profile: Subresource Integrity (`integrity`+`crossorigin`) on every CDN tag and pinned versions (never `@latest`), or vendor the file; no `eval`/`innerHTML` on anything derived from user input (use `textContent`). The portable profile (no network, no input) is largely exempt — say so.

### Revising an existing tool

Re-enter the workflow from `spec.md`: update it first (the change, and which default it departs from), then re-implement and re-run the passes the change touches — always Pass 0, plus any identities a math change affects.

## When things go wrong

Before extended debugging, read [references/pitfalls.md](references/pitfalls.md) — the failure catalog from 200+ commits of suite history plus the controlled rebuild test, each entry symptom → mechanism → mitigation.
