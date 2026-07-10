# Cyber & Technology Risk Quantification Platform — Design Prototype

Interactive, high-fidelity design prototype for a proprietary cyber & technology risk
quantification (CRQ) platform: FAIR-based Monte Carlo simulation, decision-first
governance, and regulator-grade defensibility (reproducible seeded runs, append-only
hash-chained challenge ledger, provenance-tiered inputs).

**All data is simulated. No institution is named. People are referenced by function only.**

## Run it

- Open `index.html` in any modern browser — fully self-contained, works offline.
- Or serve via GitHub Pages: Settings → Pages → deploy from branch → root. The prototype
  is a single static file.

## What's inside

- 13 designed modules: portfolio dashboard, scenario library + detail, analysis wizard,
  simulation results (live loss exceedance curve), provenance register, decision log,
  challenge ledger, model validation, materiality (8-K) workflow, insurance & control
  ROI, board report builder, integrations.
- A real in-browser Monte Carlo engine (seeded Beta-PERT + Poisson, 10k iterations,
  deterministic reproduction) — edit assumptions and watch the curve redraw.
- A role switcher demonstrating the access model: 1LOD (write/run), 2LOD (read-only +
  independent challenge), MRM (audit + reproducibility tooling), Executive (read-out).
- Responsive layout — works on phones and tablets as well as desktop (drawer navigation,
  stacked layouts, horizontally scrolling registers).

## Companion dashboards

Two standalone executive dashboards from the same strategy work (hosted in the
CRQ-Platform-Demo repo):

- [`zero-day-defense-dashboard.html`](https://wowitworked.github.io/CRQ-Platform-Demo/zero-day-defense-dashboard.html) — Zero-Day Defense Strategy executive dashboard.
- [`exploit-window-dashboard.html`](https://wowitworked.github.io/CRQ-Platform-Demo/exploit-window-dashboard.html) — Exploit Window vs. Patch Cycle executive risk framework.

## Build from this

`HANDOFF.md` is the engineering handoff: module map, role/permission matrix, data model,
engine spec, non-negotiable architecture requirements, design tokens, MVP repo sketch,
and phasing. Point Claude Code at it and this prototype.
