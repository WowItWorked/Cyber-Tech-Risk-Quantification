/*
 * CTRQ simulation engine — FAIR-style Monte Carlo for the ransomware scenario.
 * Pure and deterministic: run(inputs, {seed, iterations, appetite}) -> outputs.
 * Same inputs + same seed => identical outputs (the reproducibility guarantee).
 * Ported unchanged in behaviour from the original prototype engine (v0.9.2).
 */
(function (root) {
  "use strict";

  const ENGINE_VERSION = "v0.9.2";
  const DEFAULT_SEED = 20260710;
  const DEFAULT_INPUTS = { lefMl: 0.22, ctrlEff: 0, ransomMl: 9.5, biDaysMl: 8 };

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
  function modules(S) {
    return [
      ["Business interruption", r => pert(2, S.biDaysMl, 45, r) * 2.2],
      ["Customer attrition & revenue", r => pert(1, 7, 120, r)],
      ["Legal, regulatory & fines", r => pert(0.5, 6, 80, r)],
      ["Ransom payment", r => (r() < 0.35 ? pert(4, S.ransomMl, 60, r) : 0)],
      ["Restoration & remediation", r => pert(1, 4.5, 18, r)],
      ["Response & forensics", r => pert(1.5, 4, 12, r)],
      ["Notification & monitoring", r => pert(0.4, 2.5, 9, r)]
    ];
  }

  function run(inputs, opts) {
    const S = Object.assign({}, DEFAULT_INPUTS, inputs || {});
    const o = opts || {};
    const seed = o.seed || DEFAULT_SEED, iters = o.iterations || 10000, app = o.appetite || 250;
    const r = mulberry32(seed);
    const eff = 1 - S.ctrlEff / 100;
    const mods = modules(S);
    const losses = new Float64Array(iters);
    const modSum = mods.map(() => 0);
    let sum = 0, nonZero = 0, evTot = 0;
    for (let i = 0; i < iters; i++) {
      const lam = pert(0.08, S.lefMl, 0.55, r) * eff;
      const n = lam > 0 ? poisson(lam, r) : 0;
      evTot += n;
      let L = 0;
      for (let e = 0; e < n; e++) {
        const sev = pert(0.7, 1, 2.2, r);
        for (let j = 0; j < mods.length; j++) { const v = sev * mods[j][1](r); L += v; modSum[j] += v; }
      }
      losses[i] = L; sum += L; if (L > 0) nonZero++;
    }
    losses.sort();
    const q = p => { const idx = p * (iters - 1), lo = Math.floor(idx), hi = Math.ceil(idx); return losses[lo] + (losses[hi] - losses[lo]) * (idx - lo); };
    const pcts = { p10: q(0.10), p50: q(0.50), p75: q(0.75), p90: q(0.90), p95: q(0.95), p99: q(0.99) };
    const exceed = x => { let lo = 0, hi = iters; while (lo < hi) { const mid = (lo + hi) >> 1; if (losses[mid] < x) lo = mid + 1; else hi = mid; } return (iters - lo) / iters; };

    // Loss exceedance curve: 65 points, log-x from $1M to ~$1.5B
    const lec = [];
    for (let k = 0; k <= 64; k++) { const lg = (k / 64) * 3.176, x = Math.pow(10, lg); lec.push({ x, p: exceed(x) }); }

    const modRows = mods.map((m, j) => ({ name: m[0], mean: modSum[j] / iters })).sort((a, b) => b.mean - a.mean);

    // Sensitivity: P10->P90 swing per input, others held
    const meanLam = ((0.08 + 4 * S.lefMl + 0.55) / 6) * eff;
    const meanEvent = evTot > 0 ? modSum.reduce((a, b) => a + b, 0) / evTot : 0;
    const tr = mulberry32(777);
    const tornado = mods.map(m => {
      const vals = []; for (let i = 0; i < 1200; i++) vals.push(m[1](tr));
      vals.sort((a, b) => a - b);
      return { name: m[0], swing: meanLam * 1.07 * (vals[1080] - vals[120]) };
    });
    const fVals = []; for (let i = 0; i < 1200; i++) fVals.push(pert(0.08, S.lefMl, 0.55, tr) * eff);
    fVals.sort((a, b) => a - b);
    tornado.push({ name: "How often an attack succeeds", swing: (fVals[1080] - fVals[120]) * meanEvent });
    tornado.sort((a, b) => b.swing - a.swing);

    const isDefault = S.lefMl === 0.22 && S.ctrlEff === 0 && S.ransomMl === 9.5 && S.biDaysMl === 8 && iters === 10000;
    return {
      inputs: S, seed, iterations: iters, engine: ENGINE_VERSION,
      mean: sum / iters, pcts, pAny: nonZero / iters, pOver: exceed(app), exceed,
      lec, modRows, tornado: tornado.slice(0, 6),
      hash: fnv(JSON.stringify([S.lefMl, S.ctrlEff, S.ransomMl, S.biDaysMl, iters, app])),
      snap: isDefault ? "#0042" : "#0043 (draft)"
    };
  }

  const api = { run, fnv, ENGINE_VERSION, DEFAULT_SEED, DEFAULT_INPUTS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CRQEngine = api;
})(typeof window !== "undefined" ? window : this);
