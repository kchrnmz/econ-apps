# econ-viz-builder — a skill for building interactive teaching visualizations

This folder is a **skill**: a set of plain-text instructions an AI coding agent can follow to build an interactive visualization for teaching economics as a single portable HTML file. It describes the workflow used to build the seven tools in this repository ([live versions](https://kchrnmz.github.io/econ-apps/)): the architecture, the visual conventions, and the verification steps.

## Requirements

- **An AI coding agent** that can read files and run commands — e.g., Claude Code, Codex, or similar.
- Optionally, on the machine where the agent runs: **Node.js** (the agent uses it to execute its math checks and to bundle the HTML file; Python can substitute for the bundling step), **git** (keeps a history of the build), and **Playwright** (lets the agent check the page in a browser). SETUP.md detects which of these are present and offers to install missing ones. The workflow still runs without those tools, but each missing one limits which checks the agent can run (it reports what it could not execute).

## Getting started

1. **Get the files.** Download or clone this folder to the machine where the agent runs (GitHub: Code → Download ZIP, or give the agent this folder's URL and ask it to fetch a copy).
2. **One-time setup.** Tell the agent: *"Read SETUP.md in this folder and run the setup."* It will check which tools are present, ask about a couple of choices, and record them. (The folder can also be installed as a native skill — e.g., into Claude Code's `skills` directory — so it is available in every session.)
3. **Ask for a tool.** Describe the concept, the audience, and the intended use. For example:

   > *Using the econ-viz-builder skill in this folder, build an interactive visualization of monopoly pricing for my principles class: demand, marginal revenue, marginal cost with adjustable parameters, showing the profit-maximizing point with consumer surplus, profit, and deadweight loss shaded. I'll project it in lecture. Single HTML file.*

## What to expect during a build

- **Questions first.** The skill instructs the agent to pin down the learning goal before writing anything: what students should see or predict, which parameters get sliders, whether the file must work fully offline (no internet in the classroom) or may load libraries from the web.
- **A short spec for sign-off.** Before coding, the agent writes a plan (the economics, the parameters, the layout) and asks for approval. This is a good point to review the plan and request changes.
- **Narrated progress.** The agent explains each step in plain language as it goes and can be interrupted and redirected at any point.
- After the spec is approved, a typical build takes the agent several minutes of autonomous work.

## What a build produces

- **Standalone HTML file** (e.g., `app_standalone.html`) — suitable for projecting in class, posting to an LMS, or emailing. The default build loads its libraries from the web, so it needs internet when opened — ask for a fully offline file if preferred.
- **A verification handoff** (`handoff.md`) — a short list of checks, split into what the agent verified itself (the code runs, key numerical identities hold, the page renders) and what remains for the instructor, each stating what to do in the tool and what should happen if the economics is right.
- **A working folder** — the approved plan (`spec.md`) and the source modules the file was built from. Those can be used as a starting point for revisions and extensions.

## Final verification

Double-check the tool by going through the verification handoff document. If a check fails, report it to the agent and ask it to diagnose the cause before fixing anything.

## What's in this folder

| File | What it is |
|---|---|
| `SKILL.md` | The main instructions the agent follows |
| `SETUP.md` | One-time environment setup (run first) |
| `references/` | Architecture, visual style, verification procedure, and a catalog of known failure modes |
| `scripts/` | The bundler that packs the built modules into the single HTML deliverable (Node and Python variants) |

Everything is plain text and can be read or edited.