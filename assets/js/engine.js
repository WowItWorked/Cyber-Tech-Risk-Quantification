/*
 * CTRQ simulation engine — FAIR-style Monte Carlo for the ransomware scenario.
 * Pure and deterministic: run(inputs, {seed, iterations, appetite}) -> outputs.
 * Same inputs + same seed => identical outputs (the reproducibility guarantee).
 *
 * v0.10.0 (methodology review, see docs/METHODOLOGY_REVIEW.md):
 *  - default 50,000 iterations (10,000 failed the <3% re-seed stability gate)
 *  - sensitivity is now one-at-a-time on P95 via paired runs (was an ALE
 *    approximation with an unexplained 1.07 constant)
 *  - ransom propensity, severity-shock maximum, daily outage cost and an
 *    outage-reduction lever are explicit inputs, so controls that shorten
 *    recovery (e.g. immutable backup) are modeled on magnitude, not frequency
 *  - convergence() reports the re-seed spread used by the sealing gate
 */
(function (root) {
  "use strict";

  const ENGINE_VERSION = "v0.10.0";
  const DEFAULT_SEED = 20260710;
  const DEFAULT_ITERS = 50000;
  const DEFAULT_INPUTS = {
    lefMl: 0.22,      // loss events / yr, most likely (PERT 0.08..0.55)
    ctrlEff: 0,       // % reduction in loss-event frequency from preventive controls
    ransomMl: 9.5,    // ransom size if paid, $M most likely (PERT 4..60)
    biDaysMl: 8,      // outage days, most likely (PERT 2..45)
    outageCut: 0,     // % reduction in outage duration & restoration effort (recovery controls)
    ransomProp: 0.35, // probability a ransom is paid, given an event
    sevMax: 2.2,      // severity common-shock maximum (PERT 0.7..1.0..max)
    dailyCost: 2.2    // $M business-interruption cost per outage day
  };

  /* ---------- RNG + distributions ---------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normal(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function gamma(k, r) {
    if (k < 1) return gamma(1 + k, r) * Math.pow(r(), 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = normal(r); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = r();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function beta(a, b, r) { const x = gamma(a, r); return x / (x + gamma(b, r)); }
  function pert(min, ml, max, r) {
    if (max <= min) return min;
    const a = 1 + 4 * (ml - min) / (max - min), b = 1 + 4 * (max - ml) / (max - min);
    return min + (max - min) * beta(a, b, r);
  }
  function poisson(lam, r) { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
  function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); }

  /* ---------- loss modules ($M per event) ---------- */
  // Every module draws the same number of random values regardless of inputs,
  // so paired runs (same seed) stay aligned: common random numbers.
  function modules(S) {
    const rec = 1 - S.outageCut / 100;
    return [
      ["Business interruption", r => pert(2, S.biDaysMl, 45, r) * rec * S.dailyCost],
      ["Customer attrition & revenue", r => pert(1, 7, 120, r)],
      ["Legal, regulatory & fines", r => pert(0.5, 6, 80, r)],
      ["Ransom payment", r => { const paid = r() < S.ransomProp; const amt = pert(4, S.ransomMl, 60, r); return paid ? amt : 0; }],
      ["Restoration & remediation", r => pert(1, 4.5, 18, r) * rec],
      ["Response & forensics", r => pert(1.5, 4, 12, r)],
      ["Notification & monitoring", r => pert(0.4, 2.5, 9, r)]
    ];
  }

  function simulate(S, seed, iters) {
    const r = mulberry32(seed);
    const eff = 1 - S.ctrlEff / 100;
    const mods = modules(S);
    const losses = new Float64Array(iters);
    const modSum = mods.map(() => 0);
    let sum = 0, nonZero = 0;
    for (let i = 0; i < iters; i++) {
      const lam = pert(0.08, S.lefMl, 0.55, r) * eff;
      const n = lam > 0 ? poisson(lam, r) : 0;
      let L = 0;
      for (let e = 0; e < n; e++) {
        const sev = pert(0.7, 1, S.sevMax, r);
        for (let j = 0; j < mods.length; j++) { const v = sev * mods[j][1](r); L += v; modSum[j] += v; }
      }
      losses[i] = L; sum += L; if (L > 0) nonZero++;
    }
    losses.sort();
    return { losses, sum, nonZero, modSum, mods };
  }

  function quantile(losses, p) {
    const n = losses.length, idx = p * (n - 1), lo = Math.floor(idx), hi = Math.ceil(idx);
    return losses[lo] + (losses[hi] - losses[lo]) * (idx - lo);
  }

  function run(inputs, opts) {
    const S = Object.assign({}, DEFAULT_INPUTS, inputs || {});
    const o = opts || {};
    const seed = o.seed || DEFAULT_SEED, iters = o.iterations || DEFAULT_ITERS, app = o.appetite || 250;
    const { losses, sum, nonZero, modSum, mods } = simulate(S, seed, iters);
    const q = p => quantile(losses, p);
    const pcts = { p10: q(0.10), p50: q(0.50), p75: q(0.75), p90: q(0.90), p95: q(0.95), p99: q(0.99) };
    const exceed = x => { let lo = 0, hi = iters; while (lo < hi) { const mid = (lo + hi) >> 1; if (losses[mid] < x) lo = mid + 1; else hi = mid; } return (iters - lo) / iters; };
    const lec = [];
    for (let k = 0; k <= 64; k++) { const x = Math.pow(10, (k / 64) * 3.176); lec.push({ x, p: exceed(x) }); }
    const modRows = mods.map((m, j) => ({ name: m[0], mean: modSum[j] / iters })).sort((a, b) => b.mean - a.mean);
    const isDefault = Object.keys(DEFAULT_INPUTS).every(k => S[k] === DEFAULT_INPUTS[k]) && iters === DEFAULT_ITERS && seed === DEFAULT_SEED;
    return {
      inputs: S, seed, iterations: iters, engine: ENGINE_VERSION,
      mean: sum / iters, pcts, pAny: nonZero / iters, pOver: exceed(app), exceed, lec, modRows,
      hash: fnv(JSON.stringify([Object.keys(DEFAULT_INPUTS).map(k => S[k]), iters, seed, app])),
      snap: isDefault ? "#0044" : "#0045 (draft)"
    };
  }

  /* ---------- sensitivity: one-at-a-time swings on P95 (paired runs) ---------- */
  const SENS_SPEC = [
    { key: "lefMl", name: "How often an attack succeeds", tier: "T2", lo: 0.12, hi: 0.35, fmt: v => v.toFixed(2) + "/yr" },
    { key: "sevMax", name: "Worst-case severity multiplier", tier: "T3", lo: 1.6, hi: 2.8, fmt: v => v.toFixed(1) + "×" },
    { key: "biDaysMl", name: "How long systems stay down", tier: "T1", lo: 4, hi: 16, fmt: v => v + " days" },
    { key: "dailyCost", name: "Cost per day of outage", tier: "T1", lo: 1.8, hi: 2.6, fmt: v => "$" + v.toFixed(1) + "M" },
    { key: "ransomMl", name: "Ransom size, if paid", tier: "T2", lo: 6, hi: 20, fmt: v => "$" + v + "M" },
    { key: "ransomProp", name: "Likelihood a ransom is paid", tier: "T3", lo: 0.20, hi: 0.50, fmt: v => Math.round(v * 100) + "%" }
  ];
  function sensitivity(inputs, opts) {
    const o = Object.assign({ iterations: 20000 }, opts || {});
    const base = run(inputs, o).pcts.p95;
    return SENS_SPEC.map(s => {
      const lo = run(Object.assign({}, inputs, { [s.key]: s.lo }), o).pcts.p95;
      const hi = run(Object.assign({}, inputs, { [s.key]: s.hi }), o).pcts.p95;
      const swing = Math.abs(hi - lo);
      return { key: s.key, name: s.name, tier: s.tier, loV: s.fmt(s.lo), hiV: s.fmt(s.hi), lo, hi, base, swing, relHalf: swing / 2 / base };
    }).sort((a, b) => b.swing - a.swing);
  }

  /* ---------- convergence gate: P95 spread across re-seeds ---------- */
  function convergence(inputs, opts) {
    const o = Object.assign({ iterations: DEFAULT_ITERS, seeds: 5 }, opts || {});
    const v = [];
    for (let i = 0; i < o.seeds; i++) v.push(run(inputs, { iterations: o.iterations, seed: DEFAULT_SEED + (i + 1) * 7919 }).pcts.p95);
    const mn = Math.min.apply(null, v), mx = Math.max.apply(null, v);
    return { values: v, spread: (mx - mn) / mn, pass: (mx - mn) / mn < 0.03, iterations: o.iterations };
  }

  const api = { run, sensitivity, convergence, fnv, SENS_SPEC, ENGINE_VERSION, DEFAULT_SEED, DEFAULT_ITERS, DEFAULT_INPUTS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CRQEngine = api;
})(typeof window !== "undefined" ? window : this);
