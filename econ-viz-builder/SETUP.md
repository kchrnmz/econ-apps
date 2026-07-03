# Environment Setup

Run once when the skill lands on a machine. Purpose: let the **user choose** which tools the skill uses here, and record those choices in [references/environment.md](references/environment.md) so builds don't re-discover — and above all never re-download — the stack.

## Process

1. **Probe** what's present (each takes seconds):

```bash
node --version
git --version                                                  # version control for the build (stages 2–3)
python3 --version
python3 -m playwright --version                                # python flavor present?
npx playwright --version                                       # node flavor present?
playwright install --dry-run chromium                          # browsers downloaded? prints the actual cache path for this OS (no ~/.cache assumption)
```

2. **Present the findings and let the user choose.** The choices that matter: which runtime handles verification and bundling (`node` strongly recommended — it is the verification spine: Pass 0 syntax gate, the Pass 1 identity suite, every handoff EXPECT number), and whether a browser-automation tool handles the visual pass (Playwright in either Python or node flavor). Installing anything missing is the user's decision, made here — not a build-time reflex.

   If the user opts to install anything, ask whether it should go to a **reusable** location (available to other tools and future builds) or stay local to this build, and let them name the location. Default to reusable. Record the exact paths in environment.md.

3. **Record the choices** in references/environment.md — create it if absent. One entry per category, each naming the chosen tool, its version, and its install/cache path (write home paths as `~`, never absolute); date at the top. Categories: verification/bundling runtime, version control, browser/visual pass (with the cache path the dry-run reported), network at build time. Nothing else — no hostnames, no verbatim probe logs.

## At build time

Read environment.md, double-check the chosen tools with a quick probe (`node --version` and the like), and go from there. On a mismatch: tell the user and degrade honestly — unexecuted checks transfer to the instructor protocol per [references/verification.md](references/verification.md). Do not substitute tools the user didn't choose, and **never install or re-download anything** (Playwright browsers are ~300MB; a documented incident had an eval grader pip-install Playwright a second time when a working copy already existed — this file exists so that never recurs).

A capability the user left out changes *what the handoff claims*, never whether the workflow runs:

- **git chosen** → init the repo and commit each increment (stages 2–3); without it, keep dated working copies and say so in the handoff.
- **node chosen** → Pass 0/1 execute here; bundle with `node scripts/build_standalone.mjs`.
- **browser chosen** → Pass 3 and the render/console checks execute here too.
- **neither** → assemble the bundle manually (`scripts/build_standalone.py` works for python-only environments), every check transfers to the instructor protocol, and the handoff opens by saying nothing was executed — that configuration once shipped a blank page, and the labeling is what protects the user.
