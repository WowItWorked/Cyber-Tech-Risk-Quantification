# Cyber & Technology Risk Quantification Platform — Build Handoff

Handoff package for engineering (Claude Code). The interactive design prototype is
`index.html` with source in `assets/` (vanilla JS, no build) — open it via GitHub Pages or any static server. Every screen, role, and behavior described
below is demonstrated there with a working in-browser Monte Carlo engine and simulated data.

**Context.** Proprietary, full-stack CRQ platform for a large US-based bank (~$600B assets,
scaling toward $1T; US/UK/EU regulatory footprint). FAIR-based quantification with Monte
Carlo simulation, decision-first governance, and defensibility (model risk validation,
reproducibility, immutable challenge) as first-class architecture — not features.
No commercial CRQ vendor dependency. MVP runs in GitHub (Pages/Actions/Codespaces) on a
fully simulated dataset; production is hybrid (on-prem compute/data, cloud reporting).

**Naming rule: no bank name, no confidentiality markings, no individual names/titles
anywhere in code, seed data, or exports. People are always referenced by function
(e.g. "Technology Risk (1LOD)", "Operational Risk (2LOD)").**

---

## 1. Module map

| # | Module | Prototype screen | Purpose |
|---|--------|------------------|---------|
| 1 | Portfolio dashboard | Dashboard | Aggregate P95 vs dollar appetite, per-scenario exposure, provenance mix, governance activity |
| 2 | Scenario library | Scenario library | 8–12 scenarios past the three-test filter (plausible, material, decision-linked); status lifecycle |
| 3 | Scenario detail | Scenario detail | Narrative scope, FAIR decomposition, linked decisions, run history |
| 4 | Analysis wizard | New analysis | 4 steps: link decision (hard gate) → template → inputs w/ provenance → review & run |
| 5 | Simulation engine + results | Simulation results | Seeded Monte Carlo, LEC, percentile table, live assumption sliders, module breakdown, sensitivity |
| 6 | Provenance register | Provenance register | Every input: tier (T1/T2/T3), source, owner function, as-of, refresh, automated flags |
| 7 | Decision log | Decision log | Named decision + forum + date; "no decision, no analysis" enforcement; outcome write-back |
| 8 | Challenge ledger | Challenge ledger | Append-only, hash-chained 2LOD challenges; 1LOD respond-only; SR 11-7/26-2 effective-challenge evidence |
| 9 | Validation package | Model validation | Continuously assembled MRM package; frozen snapshots; reproducibility re-execution |
| 10 | Materiality workflow | Materiality (8-K) | 4-business-day clock, 10-module loss decomposition, threshold determination, sign-off chain |
| 11 | Insurance & control ROI | Insurance & ROI | Coverage tower vs modeled percentiles, uninsured tail, ΔALE per control investment |
| 12 | Board report builder | Board report | Section toggles, sealed-snapshot-sourced preview, PDF/PPTX export |
| 13 | Integration bus | Integrations | GRC (Archer) as system of record; pluggable connectors; BCBS 239 lineage |
| 15 | Executive briefing | Executive briefing | One-page verdict, key findings with "so what", decisions due with recommendations, confidence in the numbers |
| 16 | Glossary | Glossary | Searchable plain-English definitions; powers every ⓘ popover |
| 14 | User guide | User guide | In-app introduction (purpose & use), lifecycle overview, and role-based step-by-step guidance for 1LOD / 2LOD / MRM / EXEC |

## 2. Role & permission matrix (hard requirement)

| Capability | 1LOD Technology Risk | 2LOD Operational Risk | MRM | Executive |
|---|---|---|---|---|
| Create/edit scenarios & inputs | ✔ write | ✖ read | ✖ read (frozen) | ✖ |
| Run simulations / freeze snapshots | ✔ | ✖ | ✖ | ✖ |
| File challenges | ✖ (respond only) | ✔ append-only | ✖ | ✖ |
| Edit/delete challenge entries | ✖ never | ✖ never | ✖ | ✖ |
| Re-execute frozen snapshots (repro check) | ✖ | ✖ | ✔ | ✖ |
| View board pack / dashboards | ✔ | ✔ | ✔ | ✔ (trimmed nav) |

Enforce at API layer, not UI. The prototype's role switcher demonstrates expected UX per
role (disabled controls with explanatory copy, trimmed exec nav, 2LOD-only composer).

## 3. Data model (core entities)

- **Scenario** `{id, name, category(malicious-external|internal|non-malicious|emerging), narrative, status(Draft|Scheduled|InChallenge|Validated), tierMix, ownerFunction}`
- **Decision** `{id, title, forum, dueDate, status(PendingAnalysis|InFlight|Informed|Superseded), outcomeNote, linkedAnalyses[]}` — an Analysis cannot exist without a Decision FK.
- **InputAssumption** `{id, scenarioId, name, distribution{type:PERT|Bernoulli|point, min, ml, max, p}, tier(1|2|3), source, ownerFunction, asOfDate, refreshDue, flags[STALE, T3_DRIVES_MATERIAL]}` — flags are computed, never hand-set. `T3_DRIVES_MATERIAL` = tier-3 input moves P95 by >10% (paired-run test).
- **AnalysisRun / Snapshot** `{id, scenarioId, decisionId, seed, iterations, engineVersion, inputHash(sha256 of canonical input JSON), outputs{mean, p10..p99, pAny, lecPoints[]}, status(Draft|Sealed|Submitted|Validated|Superseded), sealedAt}` — Sealed snapshots are immutable; re-execution must reproduce outputs bit-identically.
- **Challenge** `{seq, id, ts, authorFunction, targetRef(inputId|scenarioId), severity, text, status(Open|Responded|Closed), responseText, prevHash, hash}` — hash chain: `hash = H(prevHash ‖ text ‖ seq ‖ ts)`. Append-only table; no UPDATE/DELETE grants exist.
- **ValidationPackage** `{modelTier, sections[{name, state, artifactRef}], limitations[], snapshotRefs[]}` — assembled from live data, exported to MRM template.
- **MaterialityAssessment** `{incidentRef, clockStart, modules[10]{name, included, p50, p90}, threshold, determination(NotMaterial|Escalate|Material), signoffs[{function, day}]}`
- **ControlInitiative** `{id, name, cost3yr, deltaALE(from paired runs), roi, payback, status(Proposed|Funded|Deferred)}`
- **Connector** `{name, systemRole, direction, refresh, status(ConnectedSim|PlannedP1|Phase3), lineage{source, transform, timestamp, ownerFunction}}`

Provenance tier hierarchy is enforced: T1 internal actuals > T2 external consortium > T3
calibrated judgment; a T3 value may not stand in silently where T1 exists.

## 4. Simulation engine spec (reference implementation in the prototype's logic)

- Frequency: λ ~ Beta-PERT(min, ml, max), events/yr ~ Poisson(λ × (1 − controlEffect)).
- Magnitude per event: common severity shock s ~ PERT(0.7, 1.0, 2.2) × Σ of 7 GL-mapped
  loss modules, each Beta-PERT (Bernoulli-gated where applicable, e.g. ransom propensity 0.35).
- Beta-PERT: α = 1 + 4(ml−min)/(max−min), β = 1 + 4(max−ml)/(max−min); Beta via two Gamma
  draws (Marsaglia–Tsang); Poisson via Knuth (small λ).
- Seeded, deterministic RNG (prototype: mulberry32; production: PCG64 or equivalent, seed
  persisted per run). 10,000 iterations default; 50,000 for board-cited figures.
- Outputs: mean ALE, P10/50/75/90/95/99, P(≥1 event), P(loss > appetite), loss exceedance
  curve (log-x $1M–$1.5B), module contribution means, P10→P90 sensitivity swings.
- Convergence gate: P95 varies <3% across 5 re-seeds, else block sealing.
- Report P50 = $0 honestly when the median year has no event — do not smooth it away.
- Production port: Python (numpy) per the requirements doc; keep engine pure/stateless:
  `f(inputSnapshot, seed, iterations) → outputs` so reproducibility is structural.

## 5. Non-negotiable architectural requirements

1. **Reproducibility** — any historical analysis re-executes bit-identically from its
   snapshot (inputs + seed + engine version pinned). This is the SR 11-7/26-2 anchor.
2. **Immutability** — challenge ledger and sealed snapshots are append-only (event-sourced
   or WORM storage); hash-chain verifiable.
3. **Decision gate** — analysis creation API requires a decision reference; no orphan runs.
4. **Provenance on every input** — tier, source, owner function, dates; automated STALE and
   T3-materiality flags; BCBS 239-style lineage on every ingested value.
5. **Honest labeling** — simulated feeds and stubbed exports are labeled as such in the UI
   (see "Simulated data · MVP build" chip and connector statuses).
6. **Role separation at the API layer** per §2.

## 6. Design system (as implemented in the prototype)

- Type: Public Sans (UI), Source Serif 4 (page titles, board report display), IBM Plex Mono
  (all numerals, hashes, seeds — tabular-nums).
- Palette: ink `#0D1F2D` (chrome/primary dark), petrol accent `#0E7A8A` (hover `#0C6875`,
  tint `#E6F2F4`), steel `#4E8CA8`/`#2E5A78` (T2/info), canvas `#F2F4F5`, card `#FFFFFF`,
  lines `#D9DEE3`/`#BCC2C8`, text `#14171A`/`#4D555C`/`#6B747C`.
- Status: success `#1B7F4B`/`#E7F4EC`, warning `#B5740A`/`#FBF1DD`, danger `#C0392B`/`#FBEAE8`,
  critical `#8E1B12`. Tier badges: T1 solid ink, T2 steel outline, T3 amber outline.
- Radii: cards 10px, controls 6px, pills 999. Shadows low and cool-gray. Motion 120–260ms,
  no bounce. No emoji, sentence case, short declarative copy with a dry edge.
- Component inventory: sidebar nav (grouped, glyph icons), role switcher + capability strip,
  KPI cards, chip/badge set (status, tier, severity, flag), data tables (CSS grid), LEC chart
  (SVG, log-x), bar charts (divs), stepper wizard, append-only ledger cards, page-preview
  cards (board pack), connector cards, toast.
- Responsive: desktop-first console, fully usable on mobile. Below 1000px the board
  builder collapses to one column; below 860px the sidebar becomes an off-canvas drawer
  (hamburger + scrim), header/strip wrap, two-column layouts stack (single column below
  620px), and dense registers scroll horizontally inside their cards. Form controls hold
  16px font on mobile to prevent iOS focus zoom.

## 7. MVP repo sketch (GitHub proof-of-concept)

```
crq-platform/
  engine/            # monte_carlo.py, distributions.py, convergence.py (port of prototype engine)
  data/              # simulated_ransomware.json (PERT params), loss_library.json, provenance.json
  api/               # FastAPI: scenarios, runs, snapshots, challenges, decisions (SQLite for MVP)
  web/               # this UI (React) — screens per §1
  validation/        # package assembler, repro-check CLI
  .github/workflows/ # CI: engine determinism test (same seed ⇒ same percentiles), lint
```

## 8. Phasing

- **MVP (GitHub)** — everything in the prototype: ransomware vertical slice end-to-end,
  simulated data, all governance surfaces, stubbed exports/connectors.
- **Phase 1 — Foundation** — production IAM + data classification, Archer GRC connector
  (REST, bidirectional), Finance GL + BIA feeds, real PDF/PPTX export, PostgreSQL + WORM audit store.
- **Phase 2 — Operationalize** — remaining scenario templates, cross-scenario aggregation
  (calibrated copula), back-testing pipeline, SIEM/vuln/TPRM feeds, materiality automation.
- **Phase 3 — Scale** — threat-intel triggers, continuous recalibration, multi-jurisdiction
  report packs (US/UK/EU), GSIB-readiness review.

Out of scope by design: real-time cyber-score dashboards, dollar values on every register
item, per-vulnerability price tags, capital-model integration (Phase 2+ discussion only),
AI-generated scenarios (human-initiated only).
