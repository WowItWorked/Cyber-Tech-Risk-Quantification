# Methodology review: CTRQ ransomware simulation engine

**Scope:** `assets/js/engine.js` (reviewed at v0.9.2; corrected to v0.10.0), and how the site presents its outputs.
**Date:** July 2026 (prototype timeline). **All data is simulated.**
**Audience:** model validators (MRM), second-line risk, and engineers porting the engine to production.

## 1. Verdict

The engine's mathematics is correct: the distributions, sampling algorithms and percentile estimation follow
standard methods, and runs reproduce exactly. The review found **six defects**. Five were in how outputs were
produced or presented, not in the sampling itself, and one was the run size. All six are fixed in v0.10.0.
**Four methodological limitations** against accepted standards remain open and are disclosed in the site.

| Area | Result |
|---|---|
| Sampling maths | Sound |
| Reproducibility | Sound |
| Run size / convergence | **Fixed**: 10,000 iterations failed the model's own 3% stability gate |
| Sensitivity analysis | **Fixed**: measured the wrong quantity with an unexplained constant |
| Ransom-propensity materiality claim | **Fixed**: claim was false (±2.5%, not >10%) |
| Control ROI | **Fixed**: figures were hard-coded and one was implausible under the model |
| Backup + EDR "program" statement | **Fixed**: backup was modeled as frequency reduction |
| Portfolio aggregate ($612M) | **Disclosed**: input, not model output |
| Bounded tails (Beta-PERT) | **Open** |
| Secondary losses (Open FAIR) | **Open** |
| Expert-judgment calibration | **Open** |

The ransomware outputs are fit to inform decisions **as ranges**. The portfolio total should be cited as an
illustrative estimate until cross-scenario aggregation is built.

## 2. Model under review

Annual loss, simulated per iteration:

- Frequency: λ ~ Beta-PERT(0.08, 0.22, 0.55) × (1 − preventive control effect); events N ~ Poisson(λ).
- Per event: a common severity shock s ~ Beta-PERT(0.7, 1.0, s_max = 2.2) multiplies seven loss modules
  (business interruption, customer attrition, legal and regulatory, ransom, restoration, response, notification). Each
  module is Beta-PERT, and the ransom is Bernoulli-gated (p = 0.35).
- Outputs: mean (ALE), P10–P99 percentiles, P(≥1 event), P(loss ≥ appetite), the loss exceedance curve, module means,
  and sensitivity.
- Implementation: Beta via two Gamma draws (Marsaglia–Tsang, with the k<1 boost), Poisson via Knuth, mulberry32
  PRNG with a pinned seed, and linearly interpolated empirical quantiles.

## 3. Benchmarks used

- **Open FAIR** (The Open Group risk taxonomy and analysis standards): loss event frequency × loss magnitude, with
  primary and secondary loss, and secondary loss conditioned on a secondary loss event frequency.
- **US model risk guidance (SR 11-7 / OCC 2011-12):** conceptual soundness, outcomes analysis, sensitivity analysis,
  and disclosed limitations.
- **Monte Carlo practice:** convergence of the reported statistic, quantile standard error, and common random numbers
  for paired comparisons.
- **Operational-risk loss modeling practice** (e.g. the loss distribution approach): heavy-tailed severity
  (lognormal, Pareto, GPD) for tail quantiles.

Note: earlier project documents cite "SR 26-2". This review could not verify that reference and does not rely on it.

## 4. Tests performed (v0.10.0, seed 20260710 unless stated)

All tests can be re-run in Node (§8).

| # | Test | Result |
|---|---|---|
| T1 | P(≥1 event) vs closed form 1 − E[e^−λ] (numerical quadrature over the PERT) | Simulated 22.1% vs analytic 21.97% ✔ |
| T2 | Re-seed stability of P95, 5 seeds, 10,000 iterations | Spread 3.7%: **fails** the <3% gate (v0.9.2: 4.4%) |
| T3 | Same, 50,000 iterations | Spread 1.9% ✔ |
| T4 | Reproducibility: identical inputs + seed | Bit-identical ✔ |
| T5 | Ransom propensity 0.20 → 0.50, P95 (paired runs) | $147.7M → $155.3M, **±2.5%** |
| T6 | Upper bound on any recovery control: remove all interruption, restoration and ransom cost | Max ΔALE ≈ $11.9M/yr (v0.9.2 claimed $10.9M for backup alone) |
| T7 | Backup modeled as 50% shorter outage and restoration | ΔALE $5.1M/yr, ΔP95 −$28.2M, ROI 1.83× |
| T8 | Largest possible single-event loss | ≈ $876M (bounded by the PERT maxima × shock maximum) |

Baseline (v0.10.0, 50,000 iterations): mean $26.6M · P50 $0 · P90 $112.5M · **P95 $151.7M** · P99 $244.3M ·
P(≥1 event) 22.1% · P(≥ $250M ceiling) 0.9%.

## 5. Findings

### F1. Run size failed the model's own stability gate (fixed)
The specification requires P95 to vary by under 3% across five re-seeds before a run can be sealed. At the default of
10,000 iterations it varied by 3.7–4.4%. **Fix:** the default is now 50,000 iterations (1.9%). The validation page
computes the gate live.

### F2. Sensitivity analysis measured the wrong quantity (fixed)
"What moves the answer" was presented beside P95, but it computed a swing in *average* annual loss: λ̄ × 1.07 × (P90 −
P10 of each module per event). The constant 1.07 has no stated basis; the severity shock's mean is 1.15. It also could
not measure inputs that only act through the tail. **Fix:** one-at-a-time sensitivity on P95. Each input is set to a
plausible low and high and the model is re-run using common random numbers (paired seeds), at 20,000 iterations per
run.

| Input | Tier | Low → high | P95 | ± |
|---|---|---|---|---|
| Loss event frequency (most likely) | T2 | 0.12 → 0.35 /yr | $135M → $171M | 12.0% |
| Severity shock maximum | T3 | 1.6 → 2.8 | $134M → $167M | **10.6%** |
| Outage duration (most likely) | T1 | 4 → 16 days | $142M → $168M | 8.6% |
| Daily outage cost | T1 | $1.8M → $2.6M | $143M → $160M | 5.9% |
| Ransom propensity | T3 | 20% → 50% | $148M → $155M | 2.5% |
| Ransom size (most likely) | T2 | $6M → $20M | $150M → $156M | 1.9% |

The low/high bounds are reviewer-chosen plausible ranges. They should be replaced by each input's documented
uncertainty when it is calibrated.

### F3. The ransom-propensity materiality claim was false (fixed)
Challenge CH-0007, the provenance flag and the briefing stated that the 35% ransom propensity moves P95 by more than
10%. Under the model it moves P95 by ±2.5% (T5). The flag was hand-set rather than computed. **Fix:** the
"judgment drives result" flag is now computed (a Tier 3 input with ±>10% on P95). It now correctly lands on the
severity shock maximum. CH-0007 carries a first-line response with the evidence. Under the ledger's append-only rule,
the entry itself was not edited.

### F4. Control ROI figures were hard-coded, and one was implausible (fixed)
The ΔALE and ROI values for all five controls were typed in. Backup's claimed $10.9M/yr is 92% of the theoretical
maximum for *any* recovery control (T6). It would require eliminating nearly all outage, restoration and ransom cost.
**Fix:** ΔALE and ΔP95 are computed by paired runs. Each control's effect is an explicit, labeled Tier 3 assumption.

| Control (assumed effect) | 3-yr cost | ΔALE /yr | ΔP95 | ROI | Payback |
|---|---|---|---|---|---|
| Immutable backup (outage & restoration −50%) | $8.4M | $5.1M | −$28.2M | 1.8× | 1.6 yr |
| EDR, acquired estate (frequency −20%) | $6.2M | $5.4M | −$14.8M | 2.6× | 1.2 yr |
| Privileged access (frequency −8%) | $3.1M | $1.9M | −$5.3M | 1.8× | 1.6 yr |
| EDR, branch tranche (frequency −3%) | $4.8M | $0.4M | ~$0 | 0.2× | 13.5 yr |

ROI = ΔALE ÷ (3-year cost ÷ 3). The substantive change for decision-makers: EDR has the best return on the average
year, while backup has by far the largest effect on the bad year. The insurance-limit decision turns on the bad year.

### F5. Backup was modeled as preventing attacks (fixed)
The briefing combined backup and EDR into a single 40% frequency reduction. Backup does not prevent attacks; it
shortens recovery. **Fix:** a new `outageCut` input scales business interruption and restoration. Modeled correctly
(EDR −20% frequency, backup −50% outage), the program brings P95 to $111.8M, inside the $120M tower.

### F6. Portfolio aggregate is not model output (disclosed)
The $612M aggregate P95, the 94% appetite utilization and all eight non-ransomware scenario figures are static inputs.
No aggregation is implemented, although the documentation describes a copula. The sum of the nine scenario P95s is
$1,164M, so $612M implies about 47% diversification with no stated basis. **Status:** labeled as illustrative
throughout the site. Building it requires frequency and magnitude models for the other scenarios and an explicit
dependence structure.

### F7. Bounded severity tails (open)
Every Beta-PERT has a hard maximum, so the largest possible single-event loss is about $876M (T8). Cyber and
operational loss data are typically heavy-tailed, and loss-distribution practice uses lognormal, Pareto or GPD tails
for high quantiles. P95 is moderately affected; P99 and beyond are likely understated. **Recommendation:** fit
lognormal (or spliced lognormal/GPD) severities to each module's 90% interval, and compare P95/P99 with the PERT
version as a model-risk sensitivity.

### F8. Secondary losses are unconditional (open)
Open FAIR distinguishes primary loss (response, restoration, interruption) from secondary loss (attrition, legal and
regulatory, notification). Secondary loss is incurred only with a secondary loss event frequency, i.e. when external
stakeholders react. The model applies secondary modules to every event, which overstates the mean and the tail.
**Recommendation:** add a Bernoulli SLEF gate on the secondary modules, calibrated from internal incident history or
consortium data.

### F9. Expert-judgment inputs are uncalibrated (open)
The severity shock and every control effect are Tier 3 workshop values with no record of the experts' calibration.
**Recommendation:** use calibrated-estimator practice, scoring past interval estimates for coverage. Record a
calibration score with each Tier 3 input, and prioritize the severity shock first: it is the only Tier 3 input above
the 10% materiality test.

### F10. Minor implementation notes
- **PRNG:** mulberry32 has 32-bit state, adequate for a prototype. Production should use PCG64 or Philox, as
  `HANDOFF.md` specifies.
- **Quantiles:** reported without confidence intervals. Report a bootstrap or order-statistic interval for P95.
- **Severity dependence:** a single common shock is the only dependence between modules. Disclosed.
- **Back-testing:** no outcomes analysis yet. The first annual cycle is planned for Q2 2027.

## 6. Prioritized recommendations

1. **Build cross-scenario aggregation (F6),** or stop presenting an aggregate.
2. **Calibrate the severity shock maximum (F9).**
3. **Heavy-tailed severities, with PERT kept as a comparison (F7).**
4. **Secondary-loss gating per Open FAIR (F8).**
5. **Confidence intervals on reported percentiles; production PRNG (F10).**

## 7. Changes made in v0.10.0

- Default 50,000 iterations; `convergence()` implements the re-seed gate.
- `sensitivity()`: one-at-a-time on P95 with paired runs. The 1.07 constant is removed.
- New explicit inputs: `outageCut`, `ransomProp`, `sevMax`, `dailyCost`. The ransom module always consumes its draws,
  so paired runs stay aligned.
- Control ΔALE, ΔP95, ROI and payback computed live from paired runs.
- Computed "judgment drives result" flag. CH-0007 answered.
- Portfolio aggregate labeled illustrative in every view. A methodology page was added to the site.

## 8. Reproducing these results

```bash
node -e "const E=require('./assets/js/engine.js');
const b=E.run({}); console.log(b.mean, b.pcts, b.pAny);
console.log(E.convergence({}, {iterations:10000}), E.convergence({}, {iterations:50000}));
console.log(E.sensitivity({}));
console.log(b.mean - E.run({outageCut:50}).mean, b.pcts.p95 - E.run({outageCut:50}).pcts.p95);"
```
