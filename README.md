# Cyber & Technology Risk Quantification Platform — Design Prototype

Interactive, high-fidelity design prototype for a proprietary cyber & technology risk
quantification (CRQ) platform: FAIR-based Monte Carlo simulation, decision-first
governance, and regulator-grade defensibility (reproducible seeded runs, append-only
hash-chained challenge ledger, provenance-tiered inputs).

**All data is simulated. No institution is named. People are referenced by function only.**

## Run it

- Serve via GitHub Pages: Settings → Pages → deploy from branch → root. No build step.
- Or locally: `python3 -m http.server` in the repo root, then open http://localhost:8000.
  (Opening `index.html` directly from disk also works; fonts fall back to system fonts offline.)

## Structure

```
index.html            entry point (hero landing + app, hash-routed: #/briefing, #/results …)
assets/css/styles.css design system: tokens, components, responsive, print (board pack)
assets/js/engine.js   seeded Monte Carlo engine, pure function, also runs in Node
assets/js/data.js     simulated data, page guides, glossary — all copy lives here
assets/js/app.js      routing, state, rendering, interactions
docs/METHODOLOGY_REVIEW.md  model review vs Open FAIR, SR 11-7, Monte Carlo practice
legacy/prototype-v1.html  original Claude Design export, kept for reference
```

## Built for executives

- **Hero landing page** explaining the problem, principles, the questions it answers, and roles.
- **Executive briefing** (new): verdict, what you need to know (with "so what"), decisions due
  with recommendations, confidence in the numbers, best-value actions.
- **"About this page" guide** on every screen: what it shows, how to read it, what it helps decide.
- **Plain language first**: "1-in-20-year loss" leads, with P95 as the secondary label; a dynamic
  plain-English reading of the live simulation; hover the loss curve to read it in words.
- **Glossary** (searchable) behind every ⓘ button.
- Executive view is the default role; practitioner tools stay one click away.
- Board report prints to PDF exactly as previewed.
- **Simple / Detailed** switch (Simple by default): hides technical labels and shortens the menu to five essentials.
- **Where next?** links at the foot of every page.
- **Methodology review** page, plus the full review in `docs/` — what is model output, what is an assumption.

## What's inside

- 15 screens plus a landing page: portfolio dashboard, scenario library + detail, analysis wizard,
  simulation results (live loss exceedance curve), provenance register, decision log,
  challenge ledger, model validation, materiality (8-K) workflow, insurance & control
  ROI, board report builder, integrations, executive briefing, glossary.
- A real in-browser Monte Carlo engine (seeded Beta-PERT + Poisson, 50k iterations,
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
