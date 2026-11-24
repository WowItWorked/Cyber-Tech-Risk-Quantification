/*
 * CTRQ application: routing, state, rendering and interactions.
 * Vanilla JS, no build step. Rendering is string templates into #app;
 * interactions use event delegation via data-* attributes.
 */
(function () {
  "use strict";

  const D = window.CRQData, E = window.CRQEngine;
  const root = document.getElementById("app");

  /* ================= utilities ================= */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("ctrq." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("ctrq." + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  function fm(v) {
    if (v <= 0.005) return "$0";
    if (v >= 995) return "$" + (v / 1000).toFixed(2) + "B";
    if (v >= 99.5) return "$" + Math.round(v) + "M";
    if (v >= 9.95) return "$" + Math.round(v) + "M";
    if (v >= 0.995) return "$" + v.toFixed(1) + "M";
    return "$" + Math.round(v * 1000) + "K";
  }
  const pct = (v, d) => (v * 100).toFixed(d == null ? 0 : d) + "%";
  const oneIn = p => (p > 0 ? Math.max(1, Math.round(1 / p)) : null);

  /* ================= state ================= */
  const S = {
    route: "home", param: null,
    role: store.get("role", "exec"),
    inputs: Object.assign({}, E.DEFAULT_INPUTS),
    iters: 10000, appetite: 250,
    R: null, Rprog: null, sealed: null,
    challenges: D.challenges.slice(),
    chDraft: "", chSev: "Medium", chTarget: "Ransom payment propensity (T3)",
    board: { summary: true, appetite: true, deep: true, insurance: true, model: true, recs: true, asks: true },
    wStep: 1, wDecision: "D-2026-014", wTemplate: "ransomware", running: false, prog: 0,
    repro: "idle", info: null, infoReturn: null, navOpen: false, toast: ""
  };

  function compute() {
    const opts = { iterations: S.iters, appetite: S.appetite };
    S.R = E.run(S.inputs, opts);
    S.Rprog = E.run(Object.assign({}, S.inputs, { ctrlEff: Math.max(S.inputs.ctrlEff, D.programCtrlEff) }), opts);
  }
  S.sealed = E.run(E.DEFAULT_INPUTS, { iterations: 10000, appetite: 250 });
  compute();

  /* ================= small components ================= */
  const info = (key, label) => {
    const g = D.glossary[key];
    return `<button type="button" class="info-btn" data-info="${key}" aria-label="Explain: ${esc(label || (g ? g.t : key))}">i</button>`;
  };
  const term = (key, text) => `<button type="button" class="term" data-info="${key}">${text}</button>`;
  const go = (route, text, cls) => `<a href="#/${route}" class="${cls || ""}">${text}</a>`;

  const TONES = {
    "Validated": "ok", "Informed": "ok", "Closed": "ok", "Complete": "ok", "Connected · sim": "ok", "Funded": "ok",
    "In 2LOD challenge": "warn", "Pending analysis": "warn", "Responded": "warn", "Partial": "warn",
    "Draft": "neutral", "Phase 3": "neutral", "Deferred": "neutral", "Superseded": "neutral",
    "Scheduled": "info", "In flight": "info", "Planned · P1": "info", "Submitted": "info", "Proposed": "info",
    "Open": "danger"
  };
  const PLAIN = {
    "Validated": "Reviewed & approved", "Draft": "Draft: not yet reviewed", "In 2LOD challenge": "Under challenge",
    "Scheduled": "Not yet modeled", "Pending analysis": "Waiting on analysis", "In flight": "Analysis under way", "Informed": "Analysis delivered"
  };
  const chip = (status, plain) => `<span class="chip tone-${TONES[status] || "neutral"}">${esc(plain && PLAIN[status] ? PLAIN[status] : status)}</span>`;
  const tier = t => `<span class="tier tier-${t}" title="${t === "T1" ? "Our own records" : t === "T2" ? "Industry data" : "Expert judgment"}">${t}</span>`;

  function pageGuide(key) {
    const g = D.guides[key];
    if (!g) return "";
    const open = store.get("guide." + key, true);
    const list = a => a.map(x => `<li>${x}</li>`).join("");
    const cols = [];
    if (g.read && g.read.length) cols.push(`<div class="pg-col"><h5>How to read it</h5><ul>${list(g.read)}</ul></div>`);
    if (g.decide && g.decide.length) cols.push(`<div class="pg-col"><h5>What it helps you decide</h5><ul>${list(g.decide)}</ul></div>`);
    return `<details class="page-guide" data-guide="${key}"${open ? " open" : ""}>
      <summary><span class="pg-badge" aria-hidden="true">i</span><span class="pg-what"><b>About this page</b>${g.what}</span><span class="pg-toggle">${open ? "Hide" : "Show"} guide</span></summary>
      ${cols.length ? `<div class="pg-body">${cols.join("")}</div>` : ""}
    </details>`;
  }

  function callout(tone, icon, title, body) {
    return `<div class="callout tone-${tone}"><span class="callout-icon" aria-hidden="true">${icon}</span><div><h4>${title}</h4><p>${body}</p></div></div>`;
  }

  function meter(frac, tone) {
    return `<div class="meter" role="img" aria-label="${pct(Math.min(frac, 1))} used"><span class="fill-${tone}" style="width:${Math.min(frac * 100, 100).toFixed(1)}%"></span></div>`;
  }
  const utilTone = u => (u > 1 ? "danger" : u > 0.85 ? "warn" : "ok");
  const utilWord = u => (u > 1 ? "Over limit" : u > 0.85 ? "Near limit" : "Within limit");

  /* ================= derived figures ================= */
  function fig() {
    const R = S.R, P = S.Rprog;
    const p95 = R.pcts.p95, gap = Math.max(0, p95 - D.tower);
    const agg = D.aggregate, aggU = agg.p95 / agg.appetite;
    const scen = D.scenarios.map(s => (s.live ? Object.assign({}, s, { mean: R.mean, p95 }) : s));
    const largest = scen.filter(s => !s.live).sort((a, b) => b.p95 - a.p95)[0];
    return { R, P, p95, p90: R.pcts.p90, mean: R.mean, gap, gapHas: gap > 2, agg, aggU, scen, largest, app: S.appetite,
      progGap: Math.max(0, P.pcts.p95 - D.tower) };
  }

  /* ================= charts ================= */
  const X0 = 56, XW = 600, LOGMAX = 3.176, Y0 = 282, YH = 254, YMAX = 0.40;
  const xpx = v => X0 + Math.min(Math.log10(Math.max(v, 1)) / LOGMAX, 1) * XW;
  const ypx = p => Y0 - Math.min(p, YMAX) / YMAX * YH;

  function lecSVG(R, opt) {
    opt = opt || {};
    const app = S.appetite;
    let path = "";
    R.lec.forEach((pt, i) => { path += (i ? "L" : "M") + xpx(pt.x).toFixed(1) + " " + ypx(pt.p).toFixed(1) + " "; });
    const area = path + `L${X0 + XW} ${Y0} L${X0} ${Y0} Z`;
    const grid = [0.1, 0.2, 0.3, 0.4].map(p => `<line x1="${X0}" y1="${ypx(p)}" x2="${X0 + XW}" y2="${ypx(p)}" stroke="#EFF1F3"/>`).join("") +
      [10, 100, 1000].map(v => `<line x1="${xpx(v)}" y1="28" x2="${xpx(v)}" y2="${Y0}" stroke="#EFF1F3"/>`).join("");
    const yl = [0, 0.1, 0.2, 0.3, 0.4].map(p => `<text x="${X0 - 6}" y="${ypx(p) + 4}" font-size="11" fill="#6B747C" text-anchor="end">${p * 100}%</text>`).join("");
    const xl = [[1, "$1M"], [10, "$10M"], [100, "$100M"], [1000, "$1B"]].map(([v, l]) => `<text x="${xpx(v)}" y="${Y0 + 17}" font-size="11" fill="#6B747C" text-anchor="middle">${l}</text>`).join("");
    const p90 = R.pcts.p90, p95 = R.pcts.p95;
    const marks = opt.compact ? "" : `
      <line x1="${xpx(D.tower)}" y1="28" x2="${xpx(D.tower)}" y2="${Y0}" stroke="#4E8CA8" stroke-width="1.5" stroke-dasharray="2 4"/>
      <text x="${xpx(D.tower)}" y="20" font-size="11" fill="#2E5A78" text-anchor="middle" font-weight="700">insurance top $${D.tower}M</text>
      <line x1="${xpx(app)}" y1="28" x2="${xpx(app)}" y2="${Y0}" stroke="#0D1F2D" stroke-width="1.5" stroke-dasharray="5 4"/>
      <text x="${xpx(app)}" y="44" font-size="11" fill="#0D1F2D" text-anchor="middle" font-weight="700">ceiling $${app}M</text>
      <circle cx="${xpx(p90)}" cy="${ypx(0.10)}" r="5" fill="#fff" stroke="#B5740A" stroke-width="2.5"/>
      <text x="${xpx(p90)}" y="${ypx(0.10) - 11}" font-size="11" fill="#8A5A06" font-weight="700" text-anchor="middle">1 in 10</text>
      <circle cx="${xpx(p95)}" cy="${ypx(0.05)}" r="5" fill="#fff" stroke="#8E1B12" stroke-width="2.5"/>
      <text x="${xpx(p95)}" y="${ypx(0.05) - 11}" font-size="11" fill="#8E1B12" font-weight="700" text-anchor="middle">1 in 20</text>`;
    const axes = opt.compact ? "" : `
      <text x="${X0 + XW / 2}" y="${Y0 + 36}" font-size="11.5" fill="#4D555C" text-anchor="middle" font-family="Public Sans, sans-serif">Total ransomware loss in a year (log scale)</text>
      <text x="14" y="${Y0 - YH / 2}" font-size="11.5" fill="#4D555C" text-anchor="middle" font-family="Public Sans, sans-serif" transform="rotate(-90 14 ${Y0 - YH / 2})">Chance per year</text>`;
    const hover = opt.interactive ? `
      <g class="lec-hover" style="display:none" pointer-events="none">
        <line class="hv-l" x1="0" y1="28" x2="0" y2="${Y0}" stroke="#0E7A8A" stroke-width="1"/>
        <circle class="hv-c" r="5.5" fill="#0E7A8A" stroke="#fff" stroke-width="2"/>
      </g>
      <rect data-lec x="${X0}" y="20" width="${XW}" height="${Y0 - 20}" fill="transparent" style="cursor:crosshair"/>` : "";
    return `<svg viewBox="0 0 680 ${opt.compact ? 300 : 330}" role="img" aria-label="Loss curve: chance per year that ransomware losses reach at least a given amount. 1-in-20-year loss ${fm(p95)}.">
      <line x1="${X0}" y1="${Y0}" x2="${X0 + XW}" y2="${Y0}" stroke="#D9DEE3"/><line x1="${X0}" y1="28" x2="${X0}" y2="${Y0}" stroke="#D9DEE3"/>
      ${grid}${yl}${xl}${axes}
      <path d="${area}" fill="rgba(14,122,138,0.08)"/>
      <path d="${path}" fill="none" stroke="#0E7A8A" stroke-width="2.75" stroke-linejoin="round"/>
      ${marks}${hover}
    </svg>`;
  }

  function lecReadoutDefault(R) {
    return `Hover or tap the curve to read it. For example: there is a <b>5%</b> chance (1 year in 20) that ransomware losses reach at least <b>${fm(R.pcts.p95)}</b>.`;
  }

  /* ================= app shell ================= */
  function navAllowed(id, role) {
    for (const g of D.nav) for (const it of g.items) if (it[0] === id) return !it[4] || it[4].includes(role);
    return true;
  }

  function shell(content) {
    const role = D.roles[S.role];
    const active = S.route === "detail" ? "scenarios" : S.route;
    let hidden = 0;
    const groups = D.nav.map(g => {
      const items = g.items.filter(it => { const ok = !it[4] || it[4].includes(S.role); if (!ok) hidden++; return ok; });
      if (!items.length) return "";
      return `<div class="nav-group"><div class="nav-label">${g.label}</div>${items.map(([id, label, hint, d]) => `
        <a href="#/${id}" class="nav-item${active === id ? " active" : ""}"${active === id ? ' aria-current="page"' : ""}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>
          <span class="nl"><b>${label}</b><small>${hint}</small></span>
        </a>`).join("")}</div>`;
    }).join("");
    const hint = hidden ? `<p class="nav-hint">${hidden} practitioner tools are hidden in this view. <button type="button" data-action="role" data-role="1lod">Switch to 1st line</button> to see them.</p>` : "";
    const strip = { neutral: ["#F0F1F3", "#3D454C", "#D7DBDF"], accent: ["#E6F2F4", "#0C5560", "#BFDEE3"], warn: ["#FBF1DD", "#7A5206", "#ECD3A0"], info: ["#E8F0F6", "#2E5A78", "#C9DCE9"] }[role.tone];
    const roleBtns = ["exec", "1lod", "2lod", "mrm"].map(id => `<button type="button" data-action="role" data-role="${id}" aria-pressed="${S.role === id}" title="${esc(D.roles[id].desc)}">${D.roles[id].short}</button>`).join("");

    return `<a class="skip-link" href="#main">Skip to content</a>
    <div class="app${S.navOpen ? " nav-open" : ""}">
      <aside class="sidebar" aria-label="Main navigation">
        <a href="#/" class="brand" title="Back to the home page">
          <span class="brand-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4v16h16M6 20c2.5 0 3.5-11 6-11s3.5 11 6 11"/></svg></span>
          <span><span class="brand-name">CTRQ</span><span class="brand-sub">Cyber &amp; Technology Risk</span></span>
        </a>
        <nav class="nav">${groups}${hint}</nav>
        <div class="sidebar-foot"><span class="avatar av-${role.tone}">${role.init}</span><span class="who"><b>${role.name}</b><small>${role.desc}</small></span></div>
      </aside>
      <div class="drawer-scrim" data-action="closeNav"></div>
      <div class="main">
        <header class="topbar">
          <button type="button" class="menu-btn" data-action="toggleNav" aria-label="Open navigation" aria-expanded="${S.navOpen}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14171A" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
          <div class="page-head">
            <div class="crumb"><a href="#/">Home</a><span aria-hidden="true">/</span><span>${esc(D.titles[S.route] || "")}</span></div>
            <h1 class="page-title">${esc(D.titles[S.route] || "")}</h1>
          </div>
          <span class="sim-pill" title="This is a design prototype. All figures are simulated.">Simulated data · prototype</span>
          <div class="role-switch"><label>Viewing as ${info("lod", "Who can do what")}</label><div class="seg" role="group" aria-label="Choose a role view">${roleBtns}</div></div>
        </header>
        <div class="role-strip" style="background:${strip[0]};color:${strip[1]};border-color:${strip[2]}"><b>${role.name}</b><span>${role.strip}</span></div>
        <main id="main" class="content" tabindex="-1">${content}</main>
      </div>
    </div>`;
  }

  function restricted(route) {
    return `${pageGuide(route)}
    <div class="card" style="max-width:640px">
      <h2 class="serif" style="font-size:22px;margin-bottom:8px">This is a practitioner tool</h2>
      <p class="muted">${esc(D.titles[route])} is used by the risk teams who build, challenge and validate the model. It is hidden in the executive view to keep the focus on results and decisions.</p>
      <div class="btn-row" style="margin-top:14px">
        <button type="button" class="btn btn-primary" data-action="role" data-role="1lod">View as 1st line</button>
        <a class="btn" href="#/briefing">Back to the briefing</a>
      </div>
    </div>`;
  }

  /* ================= LANDING ================= */
  function pageHome() {
    const f = fig(), R = f.R;
    const heat = ["#E7F4EC", "#E7F4EC", "#FBF1DD", "#FBF1DD", "#FBEAE8", "#E7F4EC", "#FBF1DD", "#FBF1DD", "#FBEAE8", "#FBEAE8", "#FBF1DD", "#FBF1DD", "#FBEAE8", "#FBEAE8", "#F4B9B2"].map(c => `<span style="background:${c}"></span>`).join("");
    const qs = [
      ["Are we inside the risk limit the board set?", "One verdict, in dollars, against the appetite you ratified.", "briefing", "Read the briefing"],
      ["Do we have enough cyber insurance?", `Today a bad ransomware year leaves ${fm(f.gap)} above the policy limit.`, "insurance", "See the coverage gap"],
      ["Which security spend buys the most risk reduction?", "Controls ranked by dollars of avoided loss per dollar spent.", "insurance", "See control ROI"],
      ["What could a ransomware attack actually cost?", "A live model: how likely, how much, and what drives it.", "results", "Open the deep-dive"],
      ["If we’re hit tomorrow, must we disclose it?", "The four-day 8-K process, rehearsed with pre-agreed numbers.", "materiality", "Walk the clock"],
      ["Can we trust these numbers?", "Every figure has a source, an independent challenger and a reproducible run.", "briefing#confidence", "See how confident we are"]
    ].map(([q, p, r, cta]) => `<a class="q" href="#/${r}"><span class="qm" aria-hidden="true">?</span><span><h4>${q}</h4><p>${p}</p><span class="go">${cta} →</span></span></a>`).join("");
    const roles = ["exec", "1lod", "2lod", "mrm"].map(id => { const r = D.roles[id]; return `<div class="role-l"><span class="avatar av-${r.tone}">${r.init}</span><h4>${r.name}</h4><p>${r.desc}</p></div>`; }).join("");

    return `<div class="landing">
      <a class="skip-link" href="#hero">Skip to content</a>
      <header class="l-nav"><div class="l-nav-in">
        <a href="#/" class="brand"><span class="brand-mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4v16h16M6 20c2.5 0 3.5-11 6-11s3.5 11 6 11"/></svg></span><span><span class="brand-name">CTRQ</span><span class="brand-sub">Cyber &amp; Technology Risk</span></span></a>
        <nav class="l-links" aria-label="Page sections">
          <a href="#/" data-scroll="questions">Questions it answers</a>
          <a href="#/" data-scroll="how">How it works</a>
          <a href="#/" data-scroll="roles">Who uses it</a>
          <a href="#/briefing" class="btn btn-primary btn-sm" data-action="enterExec">Open the briefing</a>
        </nav>
      </div></header>

      <section class="hero" id="hero"><div class="hero-in">
        <div>
          <span class="eyebrow">Cyber &amp; technology risk, in dollars</span>
          <h1>Know what a bad year could cost <em>before</em> it arrives.</h1>
          <p class="lede">CTRQ turns cyber and technology risk into a dollar figure set against the limit your board agreed. Every number is tied to a real decision, traceable to its source and independently challenged, so leaders can act on it with confidence.</p>
          <div class="btn-row">
            <a href="#/briefing" class="btn btn-primary btn-lg" data-action="enterExec">Open the executive briefing →</a>
            <a href="#/" class="btn btn-lg btn-outline" data-scroll="how">How it works</a>
          </div>
          <div class="hero-trust"><span>Written for non-specialists</span><span>Every figure reproducible</span><span>Simulated data, no real institution</span></div>
        </div>
        <div class="hero-card" aria-label="Live preview of the ransomware model">
          <div class="hc-top"><span class="hc-k">Live model · Ransomware</span><span class="chip tone-ok">Reviewed &amp; approved</span></div>
          <div class="hc-stats">
            <div class="hc-stat"><b>${fm(f.p95)}</b><span>could be lost in a bad (1-in-20) year</span></div>
            <div class="hc-stat"><b>${pct(R.pAny)}</b><span>chance of a costly attack this year</span></div>
          </div>
          <div class="chart-wrap">${lecSVG(R, { compact: true })}</div>
          <div class="hc-say"><b>In plain English:</b> insurance pays up to $${D.tower}M, so a bad year would leave about <b>${fm(f.gap)}</b> for the bank to absorb.</div>
        </div>
      </div></section>

      <section class="l-section">
        <div class="l-kicker">The problem</div>
        <h2 class="l-h2">A heat map says a risk is “red”. It can’t say whether it’s worth $8M to fix.</h2>
        <p class="l-sub">Traditional risk reporting ranks risks by color. Boards are left to guess how big “high” is, whether insurance is enough, and which investment matters most. CTRQ answers in the same language as every other business decision: money, likelihood and return.</p>
        <div class="problem">
          <div class="pc old"><h3>Before</h3><p class="quote">“Ransomware risk is high and trending up.”</p><p class="muted">Is that within tolerance? Is $8M of backups worth it? Nobody can say.</p><div class="heat" aria-hidden="true">${heat}</div></div>
          <div class="pc new"><h3>With CTRQ</h3><p class="quote">“A bad ransomware year could cost ${fm(f.p95)}. That is ${pct(f.p95 / f.app)} of our limit, and ${fm(f.gap)} more than insurance pays. Backups worth $8.4M would avoid $10.9M a year.”</p><p style="color:rgba(255,255,255,0.7)">Every figure links to its source, its reviewer and the decision it informs.</p></div>
        </div>
      </section>

      <section class="l-section alt"><div class="l-inner">
        <div class="l-kicker">Why leaders rely on it</div>
        <h2 class="l-h2">Built so a number can survive the boardroom and the examiner.</h2>
        <p class="l-sub">Three principles run through every page.</p>
        <div class="pillars">
          <div class="pillar"><span class="pi"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0E7A8A" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span><h3>Dollars, not colors</h3><p>Risk is expressed as what a typical year and a bad year could cost, compared directly with the board’s dollar limit and the insurance tower.</p></div>
          <div class="pillar"><span class="pi"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0E7A8A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 9-9M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg></span><h3>Decisions, not shelfware</h3><p>No analysis can start without naming the decision it informs, so the work always points at a real choice with an owner and a date.</p></div>
          <div class="pillar"><span class="pi"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0E7A8A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span><h3>Numbers you can defend</h3><p>Every input shows its source and strength. An independent team challenges it, and any past result can be re-run to the last digit.</p></div>
        </div>
      </div></section>

      <section class="l-section" id="questions">
        <div class="l-kicker">Questions it answers</div>
        <h2 class="l-h2">Start from the question you’re being asked.</h2>
        <p class="l-sub">Each card opens the page that answers it, with a plain-English guide at the top.</p>
        <div class="qs">${qs}</div>
      </section>

      <section class="l-section alt" id="how"><div class="l-inner">
        <div class="l-kicker">How it works</div>
        <h2 class="l-h2">From a decision on the calendar to a figure in the board pack.</h2>
        <p class="l-sub">The model replays the year thousands of times using evidence-based ranges (a “Monte Carlo” simulation), then reports what typical and bad years look like.</p>
        <div class="how">
          <div class="how-step"><div class="hn">01</div><h3>Name the decision</h3><p>Insurance renewal, an investment, a go-live. Analysis exists to inform a choice with a forum and a date.</p></div>
          <div class="how-step"><div class="hn">02</div><h3>Price the risk in ranges</h3><p>How often could it happen, and what would it cost? Each answer is a range with a named source, not a guess.</p></div>
          <div class="how-step"><div class="hn">03</div><h3>Challenge &amp; validate</h3><p>An independent team challenges the inputs on a permanent record; validators confirm the model is fit to rely on.</p></div>
          <div class="how-step"><div class="hn">04</div><h3>Decide &amp; report</h3><p>Sealed, reproducible figures go to the committee: exposure vs. limit, insurance gap, and the best-value fixes.</p></div>
        </div>
      </div></section>

      <section class="l-section" id="roles">
        <div class="l-kicker">Who uses it</div>
        <h2 class="l-h2">One set of numbers, four distinct jobs.</h2>
        <p class="l-sub">The platform enforces the separation regulators expect: builders, challengers and validators are different people, and executives see results rather than levers.</p>
        <div class="roles-l">${roles}</div>
      </section>

      <section class="l-section" style="padding-top:0">
        <div class="cta-band">
          <div><h2>Start with the one-page executive briefing.</h2><p>The verdict, what you need to know, and the decisions due, in about three minutes.</p></div>
          <a href="#/briefing" class="btn btn-primary btn-lg" data-action="enterExec">Open the briefing →</a>
        </div>
      </section>

      <footer class="l-foot"><span>CTRQ · Cyber &amp; Technology Risk Quantification · design prototype</span><span>All data is simulated. No institution is named. People are referenced by function only.</span></footer>
    </div>`;
  }

  /* ================= EXECUTIVE BRIEFING ================= */
  function pageBriefing() {
    const f = fig();
    const head = f.agg.appetite - f.agg.p95;
    const tone = utilTone(f.aggU);
    const badge = { ok: ["ok", "Within limit"], warn: ["", "Near limit"], danger: ["danger", "Over limit"] }[tone];
    const core = f.largest;
    const ch = S.challenges.find(c => c.status === "Open");

    const know = [
      { tone: "warn", n: "1", title: `Headroom is thin: ${fm(head)} left of a ${fm(f.agg.appetite)} limit`,
        body: `Across all risks, a bad (1-in-20) year is modeled at ${fm(f.agg.p95)}, using ${pct(f.aggU)} of the appetite the board ratified. A single new material risk, such as growth from the acquisition, could push it over.`,
        so: "Expect appetite to be revisited in the growth-driven recalibration. Ask for the utilization trend at each committee.", link: go("dashboard", "See every risk against its limit →") },
      { tone: "danger", n: "2", title: `The largest single risk is over its ceiling, and not yet reviewed`,
        body: `${core.name} is modeled at ${fm(core.p95)} in a bad year, above the ${fm(f.app)} single-risk ceiling. It is still a draft: no independent review yet, so the figure could move either way.`,
        so: "Make a validated analysis, and a bad-year loss under the ceiling, explicit conditions of the go/no-go decision (D-2026-021, Oct 2026).", link: go("scenario/" + core.id, "Open the scenario →") },
      f.gapHas
        ? { tone: "danger", n: "3", title: `Insurance stops ${fm(f.gap)} short of a bad ransomware year`,
          body: `A 1-in-20 ransomware year is modeled at ${fm(f.p95)}. Cyber insurance pays up to $${D.tower}M, so the bank would absorb the rest.`,
          so: `The renewal (D-2026-014, Aug 2026) should choose explicitly: buy more cover, or fund controls that shrink the loss. The proposed backup + EDR program would bring the bad year to about ${fm(f.P.pcts.p95)}${f.progGap > 2 ? `, still ${fm(f.progGap)} above the tower` : ", inside the current tower"}.`, link: go("insurance", "See coverage and options →") }
        : { tone: "ok", n: "3", title: "Insurance covers a bad ransomware year", body: `A 1-in-20 ransomware year is modeled at ${fm(f.p95)}, inside the $${D.tower}M tower.`, so: "The renewal can focus on price and terms rather than limit.", link: go("insurance", "See coverage →") },
      ch ? { tone: "info", n: "4", title: "One key ransomware assumption is under independent challenge",
        body: "The 35% likelihood that the bank would pay a ransom rests on expert judgment, and it moves the bad-year figure by more than 10%. The second line has an open, high-severity challenge (" + ch.id + ").",
        so: "Until it closes, cite the ransomware figure as a range rather than a point.", link: S.role === "exec" ? go("glossary", "What is a challenge? →") : go("challenges", "Read the challenge →") } : null
    ].filter(Boolean);
    const toneIcon = { warn: "!", danger: "!", info: "i", ok: "✓" };
    const knowHTML = know.map(k => `<div class="know"><span class="know-n tone-${k.tone}">${k.n}</span><div><h4>${k.title}</h4><p>${k.body}</p><div class="so"><b>So what:</b> ${k.so}</div><div class="meta">${k.link}</div></div></div>`).join("");

    const decs = [
      { d: "D-2026-014", says: f.gapHas ? `A bad ransomware year (${fm(f.p95)}) exceeds the $${D.tower}M tower by ${fm(f.gap)}.` : `A bad ransomware year (${fm(f.p95)}) sits inside the $${D.tower}M tower.`,
        rec: f.gapHas ? `Price an extra excess layer of about ${fm(Math.ceil(f.gap / 5) * 5)} and compare it with funding immutable backup ($8.4M, 3.9× return), which also shrinks the gap. Decide explicitly rather than accept the gap by default.` : "Renew at current limit; negotiate on price and terms." },
      { d: "D-2026-025", says: "In the incident rehearsal, the estimate (typical $38M, severe $128M) straddles the proposed $92M threshold.",
        rec: "Ratify $92M, with the qualitative factors (payments criticality, customer count) written into the policy so borderline cases escalate." },
      { d: "D-2026-019", says: "The branch-estate EDR tranche returns $0.90 of avoided loss per $4.80 spent (0.6×): it does not pay back.",
        rec: "Defer, and redirect funds to immutable backup and recovery automation (3.9×)." },
      { d: "D-2026-021", says: `Core conversion is the largest risk on the book: ${fm(core.p95)} in a bad year (draft), above the ${fm(f.app)} ceiling.`,
        rec: "Make a validated analysis, with the bad-year loss under the ceiling, an explicit go criterion." }
    ].map(x => {
      const d = D.decisions.find(y => y.id === x.d);
      return `<div class="decision-card">
        <div><h4>${esc(d.title)}</h4><div class="dmeta">${d.id} · ${esc(d.forum)} · ${chip(d.status, true)}</div></div>
        <div class="due"><span class="xs muted">Due</span><b>${d.due}</b></div>
        <div class="dbody"><div class="dbox"><h5>What the analysis says</h5>${x.says}</div><div class="dbox rec"><h5>Recommended</h5>${x.rec}</div></div>
      </div>`;
    }).join("");

    const tiers = [42, 37, 21];
    const conf = `
      <div class="confidence c2">
        <div class="conf-item"><div class="ci-top">Model review ${info("validation")}</div><div class="ci-val">Approved, with conditions</div><div class="ci-note">Back-testing completes Q2 2027.</div></div>
        <div class="conf-item"><div class="ci-top">Strength of evidence ${info("tiers")}</div><div class="ci-val">${tiers[0]}% own records</div><div class="mix" style="margin:6px 0 4px"><span style="width:${tiers[0]}%"></span><span style="width:${tiers[1]}%"></span><span style="width:${tiers[2]}%"></span></div><div class="ci-note">${tiers[1]}% industry data · ${tiers[2]}% expert judgment</div></div>
        <div class="conf-item"><div class="ci-top">Freshness ${info("prov")}</div><div class="ci-val">3 inputs overdue</div><div class="ci-note">Attrition, notification cost, conversion defect rate.</div></div>
        <div class="conf-item"><div class="ci-top">Open challenges ${info("challenge")}</div><div class="ci-val">${S.challenges.filter(c => c.status === "Open").length} open</div><div class="ci-note">${ch ? "High severity, on a ransomware input." : "None outstanding."}</div></div>
      </div>
      <div class="card-foot"><b style="color:var(--text)">Overall: moderate confidence.</b> Reviewed figures are fit for decisions. Treat draft and challenged figures as ranges, and say so when citing them.</div>`;

    const recs = recsRows(f).slice(0, 4).map(r => `<div class="tl-item" style="grid-template-columns:30px 1fr"><span class="mono" style="color:var(--accent);font-weight:700">${r.n}</span><span><b>${r.title}</b><div class="mono xs" style="color:var(--accent);font-weight:600;margin:2px 0">${r.eff}</div><div class="small muted">${r.why}</div></span></div>`).join("");

    return `${pageGuide("briefing")}
      <div class="page-intro"><p>Prepared for the Technology Risk Committee. Figures are from sealed snapshot ${esc(S.R.snap)} unless marked draft.</p><span class="asof">As of ${D.asOf}</span></div>
      <section class="verdict on-dark" aria-label="Overall verdict">
        <div class="verdict-badge ${badge[0]}">${badge[1].replace(" ", "<br>")}</div>
        <div>
          <div class="verdict-kicker">The bottom line</div>
          <h2>Technology risk is within the board’s limit, but close to it, and the largest risk is not yet reviewed.</h2>
          <p>A bad year across all scenarios is modeled at <b>${fm(f.agg.p95)}</b> against a <b>${fm(f.agg.appetite)}</b> appetite. Four decisions over the next quarter can widen that margin.</p>
        </div>
        <div class="verdict-gauge"><div class="big">${pct(f.aggU)}</div><div class="lab">of the board’s limit used ${info("appetite")}</div>${meter(f.aggU, tone)}</div>
      </section>

      <div class="grid g-auto section">
        <div class="card kpi"><span class="kpi-label">A bad year could cost ${info("p95")}</span><span class="kpi-value">${fm(f.agg.p95)}</span><span class="kpi-note">1-in-20-year loss, all risks combined</span><span class="kpi-tech">Aggregate P95</span></div>
        <div class="card kpi"><span class="kpi-label">Headroom left ${info("appetite")}</span><span class="kpi-value">${fm(head)}</span><span class="kpi-note">of the ${fm(f.agg.appetite)} board appetite</span><span class="kpi-tech">${pct(f.aggU)} utilization</span></div>
        <div class="card kpi"><span class="kpi-label">Average cost per year ${info("ale")}</span><span class="kpi-value">${fm(f.agg.mean)}</span><span class="kpi-note">The budgeting figure; most years are quieter</span><span class="kpi-tech">Mean ALE</span></div>
        <div class="card kpi"><span class="kpi-label">Uninsured ransomware loss ${info("tower")}</span><span class="kpi-value" style="color:${f.gapHas ? "var(--critical)" : "var(--ok)"}">${fm(f.gap)}</span><span class="kpi-note">in a bad year, above the $${D.tower}M policy limit</span><span class="kpi-tech">P95 − tower top</span></div>
      </div>

      <h2 class="section-title">What you need to know</h2>
      <div class="know-list section">${knowHTML}</div>

      <h2 class="section-title">Decisions on your desk ${info("decisions")}</h2>
      <p class="section-lede">Each decision below is what the analysis exists to inform. Ordered by due date.</p>
      <div class="stack section">${decs}</div>

      <div class="grid g-side section">
        <div class="card" id="confidence"><div class="card-head"><span class="card-title">How confident are we in these numbers? ${info("confidence")}</span></div>${conf}</div>
        <div class="card"><div class="card-head"><span class="card-title">Best-value actions ${info("roi")}</span></div><div class="tl">${recs}</div><div class="card-foot">${go("insurance", "Full investment ranking →")}</div></div>
      </div>
      <div class="btn-row no-print"><a class="btn btn-dark" href="#/board">Open the board report</a><a class="btn" href="#/dashboard">See the risk dashboard</a><a class="btn btn-ghost" href="#/glossary">Glossary of terms</a></div>`;
  }

  function recsRows(f) {
    return [
      { n: "01", title: "Fund immutable backup & recovery automation", why: "Largest risk reduction per dollar in the portfolio; shortens ransomware outages, the biggest cost driver.", eff: "−$10.9M/yr · 3.9×" },
      { n: "02", title: f.gapHas ? "Close the insurance gap, or formally accept it" : "Renew insurance at the current limit", why: "Renewal decision D-2026-014 is due Aug 2026; the gap is priced by the live model.", eff: f.gapHas ? fm(f.gap) + " uninsured" : "covered" },
      { n: "03", title: "Gate core conversion on a validated analysis", why: `The largest risk on the book (${fm(f.largest.p95)}, draft) is above the single-risk ceiling.`, eff: "D-2026-021 · Oct" },
      { n: "04", title: "Resolve the open ransomware challenge (CH-0007)", why: "Corroborate the ransom-payment likelihood with industry data, or disclose the range.", eff: "restores full status" },
      { n: "05", title: "Refresh the three overdue inputs", why: "Attrition, notification cost and defect rate are past their refresh date ahead of Q3 runs.", eff: "keeps evidence current" }
    ];
  }

  /* ================= DASHBOARD ================= */
  function pageDashboard() {
    const f = fig(), scaleMax = 350;
    const rows = f.scen.slice().sort((a, b) => b.p95 - a.p95).map(s => {
      const over = s.p95 > f.app, reviewed = s.status === "Validated";
      const cls = over ? "fill-danger" : reviewed ? "fill-accent" : "fill-steel hatch";
      return `<a class="sbar" href="#/scenario/${s.id}">
        <div><div class="sname">${esc(s.short)}</div><div class="sstat" style="color:var(--${TONES[s.status] === "ok" ? "ok" : TONES[s.status] === "warn" ? "warn" : "text-3"})">${esc(PLAIN[s.status] || s.status)}</div></div>
        <div class="track" aria-hidden="true"><span class="fill ${cls}" style="width:${Math.min(s.p95 / scaleMax * 100, 100).toFixed(1)}%"></span><span class="tick" style="left:${(f.app / scaleMax * 100).toFixed(1)}%"></span></div>
        <div class="sval">${fm(s.p95)}${over ? ' <span class="sr-only">over ceiling</span>' : ""}</div></a>`;
    }).join("");
    const lim = [
      ["All risks combined (bad year)", f.agg.p95, f.agg.appetite, "Portfolio appetite"],
      [`Largest single risk: ${f.largest.short}`, f.largest.p95, f.app, "Single-risk ceiling · draft figure"],
      ["Ransomware (live model)", f.p95, f.app, "Single-risk ceiling"]
    ].map(([l, u, c, n]) => { const r = u / c; return `<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:8px;font-size:14px;margin-bottom:5px"><span><b>${l}</b><br><span class="xs muted">${n}</span></span><span style="text-align:right"><span class="mono">${fm(u)} / ${fm(c)}</span><br>${`<span class="chip tone-${utilTone(r)} plain" style="font-size:11px">${utilWord(r)}</span>`}</span></div>${meter(r, utilTone(r))}</div>`; }).join("");

    const act = D.activity.map(a => `<div class="tl-item"><span class="mono xs muted">${a.t}</span><span class="chip tone-${a.tone} plain" style="font-size:11px">${a.tag}</span><span>${a.txt}</span></div>`).join("");
    const nValid = D.scenarios.filter(s => s.status === "Validated").length;

    return `${pageGuide("dashboard")}
      <div class="page-intro"><p>What a severe year could cost, in dollars, against the limits the board ratified.</p><span class="asof">As of ${D.asOf} · snapshot ${esc(S.R.snap)}</span></div>
      <div class="grid g-auto section" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
        <div class="card card-dark kpi on-dark"><span class="kpi-label">All risks, bad year ${info("p95")}</span><span class="kpi-value">${fm(f.agg.p95)}</span><span class="kpi-note">vs ${fm(f.agg.appetite)} appetite · <b style="color:#F0C060">${pct(f.aggU)} used</b></span><div style="margin-top:8px">${meter(f.aggU, utilTone(f.aggU))}</div></div>
        <div class="card kpi"><span class="kpi-label">Average cost per year ${info("ale")}</span><span class="kpi-value">${fm(f.agg.mean)}</span><span class="kpi-note">long-run average, reviewed runs</span></div>
        <div class="card kpi"><span class="kpi-label">Risks fully reviewed ${info("validation")}</span><span class="kpi-value">${nValid} <small>of ${D.scenarios.length}</small></span><span class="kpi-note">the rest are draft or not yet modeled</span></div>
        <div class="card kpi"><span class="kpi-label">Open challenges ${info("challenge")}</span><span class="kpi-value" style="color:var(--warn)">${S.challenges.filter(c => c.status === "Open").length}</span><span class="kpi-note">CH-0007 · high severity</span></div>
        <div class="card kpi"><span class="kpi-label">Inputs overdue ${info("prov")}</span><span class="kpi-value" style="color:var(--danger)">3</span><span class="kpi-note">past their refresh date</span></div>
      </div>
      <div class="grid g-side section">
        <div class="card">
          <div class="card-head"><span class="card-title">Each risk: bad-year loss vs ceiling ${info("ceiling")}</span><span class="xs muted">scale $0–350M</span></div>
          <div class="legend" style="margin-bottom:10px"><span><i style="background:var(--accent)"></i>Reviewed</span><span><i style="background:var(--steel)"></i>Not yet reviewed</span><span><i style="background:var(--danger)"></i>Over ceiling</span><span><i style="background:var(--ink);width:3px"></i>${fm(f.app)} single-risk ceiling</span></div>
          ${rows}
          <div class="card-foot">Ransomware comes from the live model. The portfolio total is not a simple sum, because bad years rarely all land at once ${info("agg")}. Select a risk for its detail.</div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-head"><span class="card-title">Limits ${info("appetite")}</span></div>${lim}<div class="xs muted">Appetite restated in dollars and ratified by the board risk committee, Q1 2026.</div></div>
          <div class="card"><div class="card-head"><span class="card-title">Where inputs come from ${info("tiers")}</span></div>
            <div class="mix" style="height:14px;margin-bottom:10px"><span style="width:42%"></span><span style="width:37%"></span><span style="width:21%"></span></div>
            <div class="legend"><span><i style="background:var(--ink)"></i>Own records 42%</span><span><i style="background:var(--steel)"></i>Industry data 37%</span><span><i style="background:var(--t3)"></i>Expert judgment 21%</span></div>
            ${callout("warn", "!", "One judgment-based input drives a key figure", "The ransom-payment likelihood moves the ransomware bad-year figure by over 10%. It is under open challenge.")}
          </div>
        </div>
      </div>
      <div class="grid g-3 section">
        <div class="card"><div class="card-head"><span class="card-title">Recent governance activity</span></div><div class="tl">${act}</div></div>
        <div class="card"><div class="card-head"><span class="card-title">Model governance ${info("validation")}</span></div>
          <div class="kv"><span>Model risk tier</span><span class="mono">Tier 2</span></div>
          <div class="kv"><span>Validation status</span><span>${chip("Validated", false).replace("Validated", "Conditional approval")}</span></div>
          <div class="kv"><span>Next independent review</span><span class="mono">Oct 2026</span></div>
          <div class="kv"><span>Back-test cycle</span><span class="mono">Annual · from Q2 2027</span></div>
          <div class="kv"><span>Challenges (12 months)</span><span class="mono">7 filed · 6 closed</span></div>
          <div class="card-foot">No number leaves this platform without a linked decision, a source trail and a standing right of independent challenge.</div>
        </div>
        <div class="card"><div class="card-head"><span class="card-title">Recommended actions ${info("roi")}</span></div>
          <div class="tl">${recsRows(f).map(r => `<div class="tl-item" style="grid-template-columns:28px 1fr"><span class="mono xs" style="color:var(--accent);font-weight:700">${r.n}</span><span><b class="small">${r.title}</b><div class="mono xs muted">${r.eff}</div></span></div>`).join("")}</div>
          <div class="card-foot">${go("board", "Full detail in the board report →")}</div>
        </div>
      </div>`;
  }

  /* ================= SCENARIOS ================= */
  function pageScenarios() {
    const f = fig();
    const rows = f.scen.map(s => `<tr class="clickable" data-href="#/scenario/${s.id}" tabindex="0">
      <td><div class="t-main"><a href="#/scenario/${s.id}">${esc(s.name)}</a></div><div class="t-sub">${esc(s.plain)}</div></td>
      <td class="small muted nowrap">${esc(s.cat)}</td>
      <td>${chip(s.status, true)}</td>
      <td class="num">${fm(s.mean)}</td>
      <td class="num"><b>${fm(s.p95)}</b>${s.p95 > f.app ? '<div class="xs" style="color:var(--danger);font-family:var(--font-ui)">over ceiling</div>' : ""}</td>
      <td><div class="mix" title="Own records ${s.t[0]}% · industry ${s.t[1]}% · judgment ${s.t[2]}%"><span style="width:${s.t[0]}%"></span><span style="width:${s.t[1]}%"></span><span style="width:${s.t[2]}%"></span></div></td>
      <td class="mono small nowrap">${esc(s.last)}</td></tr>`).join("");
    return `${pageGuide("scenarios")}
      <div class="page-intro"><p>Nine scenarios passed the three-test filter: plausible, material and tied to a decision ${info("decisions")}.</p>${S.role === "1lod" ? '<a class="btn btn-primary" href="#/wizard">+ New analysis</a>' : ""}</div>
      <div class="card"><div class="table-wrap"><table class="tbl">
        <thead><tr><th>Risk scenario</th><th>Type</th><th>Status</th><th class="num">Average / yr ${info("ale")}</th><th class="num">Bad year ${info("p95")}</th><th>Evidence ${info("tiers")}</th><th>Last run</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
        <div class="card-foot">Non-malicious failures are first-class here: the core conversion and processor outage scenarios have no attacker at all. <span class="legend" style="display:inline-flex;margin-left:6px"><span><i style="background:var(--ink)"></i>own records</span><span><i style="background:var(--steel)"></i>industry</span><span><i style="background:var(--t3)"></i>judgment</span></span></div>
      </div>`;
  }

  function pageDetail() {
    const f = fig();
    const d = f.scen.find(x => x.id === S.param) || f.scen[0];
    const links = D.decisions.filter(x => (d.id === "ransomware" && x.links.includes("RANSOM")) || (d.id === "thirdparty" && x.id === "D-2026-008") || (d.id === "coreconv" && x.id === "D-2026-021"));
    const runs = d.id === "ransomware" ? [["#0042", "Jul 8, 2026", "Validated"], ["#0041", "Jun 30, 2026", "Submitted"], ["#0040", "Jun 12, 2026", "Superseded"]] : [];
    const over = d.p95 > f.app;
    return `<a href="#/scenarios" class="small">← All risk scenarios</a>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:10px 0 4px"><h2 class="serif" style="font-size:28px">${esc(d.name)}</h2>${chip(d.status, true)}</div>
      <div class="small muted" style="margin-bottom:18px">${esc(d.cat)} · owner: Technology Risk (1st line) · <span class="mono">${d.code}</span></div>
      ${pageGuide("detail")}
      <div class="grid g-side">
        <div class="stack">
          <div class="card"><div class="card-head"><span class="card-title">In plain English</span></div><p style="font-size:16.5px">${esc(d.plain)}</p>
            <div class="grid g-3" style="margin-top:14px">
              <div class="kpi"><span class="kpi-label">Average / year ${info("ale")}</span><span class="kpi-value" style="font-size:24px">${fm(d.mean)}</span></div>
              <div class="kpi"><span class="kpi-label">Bad year (1 in 20) ${info("p95")}</span><span class="kpi-value" style="font-size:24px;color:${over ? "var(--critical)" : "inherit"}">${fm(d.p95)}</span></div>
              <div class="kpi"><span class="kpi-label">vs ${fm(f.app)} ceiling</span><span class="kpi-value" style="font-size:24px">${pct(d.p95 / f.app)}</span></div>
            </div>
            ${over ? `<div style="margin-top:14px">${callout("danger", "!", "Above the single-risk ceiling", d.status === "Validated" ? "This reviewed figure exceeds the board ceiling and needs a decision." : "This figure has not been independently reviewed yet. Treat it as an early warning, not a settled number.")}</div>` : ""}
          </div>
          <div class="card"><div class="card-head"><span class="card-title">Scope (full definition)</span></div><p class="muted">${esc(d.narrative)}</p></div>
          ${d.live ? `<div class="card"><div class="card-head"><span class="card-title">How it is priced ${info("fair")}</span></div>
            <div class="grid g-2">
              <div class="conf-item"><div class="ci-top">How often</div><div class="mono small">PERT(0.08, ${S.inputs.lefMl.toFixed(2)}, 0.55) /yr</div><div class="ci-note">Industry base rate for the financial sector, adjusted for our controls${S.inputs.ctrlEff ? ` (−${S.inputs.ctrlEff}%)` : ""}.</div></div>
              <div class="conf-item"><div class="ci-top">How much each time</div><div class="mono small">7 cost categories × severity</div><div class="ci-note">Outage, lost customers, legal, ransom, restoration, response, notification. Each tied to the general ledger.</div></div>
            </div><div class="card-foot">${go("results", "Open the live deep-dive →")}</div></div>`
            : `<div class="card">${callout("info", "i", "Not yet fully modeled", "The structure was agreed at intake; full pricing and simulation follow in the phased rollout. Figures shown are early workshop estimates.")}</div>`}
        </div>
        <div class="stack">
          <div class="card"><div class="card-head"><span class="card-title">Decisions it informs ${info("decisions")}</span></div>
            ${links.length ? `<div class="rows">${links.map(x => `<div><b>${esc(x.title)}</b><div class="xs muted">${x.id} · ${esc(x.forum)} · due ${x.due}</div></div>`).join("")}</div>` : `<p class="muted small">No decision linked yet. One is required before the first run.</p>`}
          </div>
          <div class="card"><div class="card-head"><span class="card-title">Run history ${info("snapshot")}</span></div>
            ${runs.length ? runs.map(r => `<div class="kv"><span class="mono">${r[0]} <span class="muted">${r[1]}</span></span><span>${chip(r[2])}</span></div>`).join("") : '<p class="muted small">No runs yet.</p>'}
          </div>
          ${S.role !== "exec" ? `<div class="btn-row"><button type="button" class="btn btn-primary${S.role === "1lod" ? "" : " is-locked"}" data-action="rerun">Re-run analysis</button><a class="btn" href="#/challenges">${S.role === "2lod" ? "File a challenge" : "View challenges"}</a></div>` : ""}
        </div>
      </div>`;
  }

  /* ================= WIZARD ================= */
  function pageWizard() {
    const canRun = S.role === "1lod";
    const steps = ["Link decision", "Scenario", "Inputs & sources", "Review & run"].map((l, i) => `<div class="step ${S.wStep === i + 1 ? "on" : S.wStep > i + 1 ? "done" : ""}"><span class="sn">${S.wStep > i + 1 ? "✓" : i + 1}</span>${l}</div>`).join("");
    let body = "";
    if (S.wStep === 1) {
      body = `<h3 style="font-size:19px;margin-bottom:6px">Which decision will this analysis inform? ${info("decisions")}</h3>
        <p class="muted">Required. An analysis cannot exist without a named decision, forum and date. This is what separates decision support from shelfware.</p>
        ${D.decisions.slice(0, 4).map(x => `<button type="button" class="pick" data-action="wDecision" data-id="${x.id}" aria-pressed="${S.wDecision === x.id}"><span class="dot"></span><span style="flex:1"><b>${esc(x.title)}</b><div class="xs muted">${esc(x.forum)} · due ${x.due}</div></span><span class="mono xs muted">${x.id}</span></button>`).join("")}
        <button type="button" class="btn btn-ghost" data-action="toast" data-msg="Decision registration opens the decision log intake. Forum, date and owner function are mandatory.">+ Register a new decision</button>`;
    } else if (S.wStep === 2) {
      body = `<h3 style="font-size:19px;margin-bottom:6px">Choose the scenario template</h3>
        <p class="muted">Templates carry the pricing structure, cost categories and default sources. This prototype runs the ransomware template end to end.</p>
        <div class="tpl-grid">${D.scenarios.map(s => `<button type="button" class="pick" data-action="wTemplate" data-id="${s.id}" aria-pressed="${S.wTemplate === s.id}"><b>${esc(s.short)}</b><div class="xs muted">${esc(s.cat)}</div><div class="xs" style="margin-top:4px;color:${s.live ? "var(--accent)" : "var(--text-4)"};font-weight:600">${s.live ? "Full model available" : "Structure only this phase"}</div></button>`).join("")}</div>`;
    } else if (S.wStep === 3) {
      const ins = [
        ["lefMl", "How often an attack succeeds (most likely, per year)", "0.08", "0.55", S.inputs.lefMl, 0.01, "T2", "Loss consortium, financial sector"],
        ["biDaysMl", "Outage length (most likely, days)", "2", "45", S.inputs.biDaysMl, 0.5, "T1", "Resilience tests + BIA RTOs"],
        ["ransomMl", "Ransom, if paid (most likely, $M)", "4", "60", S.inputs.ransomMl, 0.5, "T3", "Calibrated workshop W-12"],
        [null, "Daily outage cost, $M (fixed)", "—", "—", 2.2, 0.1, "T1", "Finance GL actuals, reconciled"],
        ["ctrlEff", "Planned controls: cut in successful attacks (%)", "0", "60", S.inputs.ctrlEff, 5, "T3", "Control effectiveness workshop"]
      ];
      body = `<h3 style="font-size:19px;margin-bottom:6px">Set the inputs. Every value carries a source ${info("ranges")}</h3>
        <p class="muted">Evidence tiers: T1 own records → T2 industry data → T3 expert judgment ${info("tiers")}. Judgment inputs that drive key results are flagged automatically.</p>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Input</th><th>Low / most likely / high</th><th>Tier</th><th>Source</th></tr></thead><tbody>
        ${ins.map(i => `<tr><td class="t-main">${i[1]}</td><td class="nowrap"><span class="mono small muted">${i[2]} /</span> <input class="input-num" type="number" step="${i[5]}" value="${i[4]}" ${i[0] && canRun ? `data-winput="${i[0]}"` : "disabled"} aria-label="${esc(i[1])}"> <span class="mono small muted">/ ${i[3]}</span></td><td>${tier(i[6])}</td><td class="small muted">${i[7]}</td></tr>`).join("")}
        </tbody></table></div>
        <div style="margin-top:12px">${callout("warn", "!", "Flag: judgment drives a key result", "Ransom-payment likelihood is Tier 3 and materially moves the bad-year figure. Second-line challenge CH-0007 remains open against it.")}</div>`;
    } else {
      const tpl = D.scenarios.find(x => x.id === S.wTemplate) || D.scenarios[0];
      body = `<h3 style="font-size:19px;margin-bottom:6px">Review &amp; run</h3>
        <p class="muted">The run pins a seed, freezes the inputs and writes the audit record before the first iteration.</p>
        <div style="max-width:560px">
          <div class="kv"><span>Decision</span><span class="mono">${S.wDecision}</span></div>
          <div class="kv"><span>Template</span><span>${esc(tpl.short)}</span></div>
          <div class="kv"><span>Seed (pinned) ${info("seed")}</span><span class="mono">${E.DEFAULT_SEED}</span></div>
          <div class="kv"><span>Simulated years</span><span><select class="sel" style="width:auto;padding:5px 8px" data-field="iters" ${canRun ? "" : "disabled"}>${[5000, 10000, 25000, 50000].map(n => `<option value="${n}"${S.iters === n ? " selected" : ""}>${n.toLocaleString()}</option>`).join("")}</select></span></div>
          <div class="kv"><span>Engine</span><span class="mono">${E.ENGINE_VERSION} · Beta-PERT + Poisson</span></div>
          <div class="kv"><span>Input fingerprint</span><span class="mono">${S.R.hash}</span></div>
        </div>
        ${S.running ? `<div class="progress"><span style="width:${S.prog.toFixed(0)}%"></span></div><div class="mono xs muted">sampling… ${Math.round(S.prog / 100 * S.iters).toLocaleString()} / ${S.iters.toLocaleString()} simulated years</div>` : ""}
        <div class="btn-row" style="margin-top:16px"><button type="button" class="btn btn-primary${canRun ? "" : " is-locked"}" data-action="wRun">Run simulation</button><span class="small muted">${canRun ? "Writes the audit record, pins the seed, then runs." : "Only the 1st line can run the model. Switch role to try it."}</span></div>`;
    }
    return `${pageGuide("wizard")}<div class="steps">${steps}</div><div class="card">${body}
      <div class="btn-row" style="justify-content:space-between;margin-top:20px;padding-top:16px;border-top:1px solid var(--line-soft)">
        <button type="button" class="btn" data-action="wBack" ${S.wStep > 1 ? "" : 'style="visibility:hidden"'}>← Back</button>
        <button type="button" class="btn btn-dark" data-action="wNext" ${S.wStep < 4 ? "" : 'style="visibility:hidden"'}>Next →</button>
      </div></div>`;
  }

  /* ================= RESULTS ================= */
  function liveTop() {
    const R = S.R, f = fig();
    const p95 = R.pcts.p95, nA = oneIn(R.pAny), nO = oneIn(R.pOver);
    const driver = R.tornado[0];
    const drvPlain = { "How often an attack succeeds": "how often an attack succeeds", "Customer attrition & revenue": "how many customers leave afterwards", "Business interruption": "how long systems stay down", "Legal, regulatory & fines": "legal and regulatory costs", "Ransom payment": "the size of any ransom paid" }[driver.name] || driver.name.toLowerCase();
    const cards = [
      ["Average year", "mean", R.mean, ""], ["Typical year", "P50 (median)", R.pcts.p50, ""], ["1 in 4 years", "P75", R.pcts.p75, ""],
      ["1 in 10 years", "P90", R.pcts.p90, "mid"], ["1 in 20 years", "P95", p95, "hi"], ["1 in 100 years", "P99", R.pcts.p99, ""]
    ].map(c => `<div class="pct ${c[3]}"><div class="pl">${c[0]}</div><div class="pt">${c[1]}</div><div class="pv">${fm(c[2])}</div></div>`).join("");
    return `<div class="grid g-side section">
      <div class="card">
        <div class="card-head"><span class="card-title">Loss curve: chance of losing at least $X in a year ${info("lec")}</span></div>
        <div class="chart-wrap" data-chart="lec">${lecSVG(R, { interactive: true })}</div>
        <div class="lec-readout" aria-live="polite" data-readout>${lecReadoutDefault(R)}</div>
      </div>
      <div class="stack">
        <div class="reading"><h4>Plain-English reading</h4><ul>
          <li>In any year there is a <b>${pct(R.pAny)}</b> chance (about 1 year in ${nA}) of a ransomware attack that causes loss.</li>
          <li>Most years nothing happens: the typical year costs <b>${fm(R.pcts.p50)}</b>. Averaged over many years it costs about <b>${fm(R.mean)}</b> a year.</li>
          <li>A bad year (1 in 20) costs <b>${fm(p95)}</b>: ${pct(p95 / f.app)} of the ${fm(f.app)} single-risk ceiling.</li>
          <li>${f.gapHas ? `Insurance pays up to $${D.tower}M, so a bad year leaves <b>${fm(f.gap)}</b> uninsured.` : `A bad year stays inside the $${D.tower}M insurance tower.`}</li>
          <li>Chance of breaching the ceiling in a year: <b>${pct(R.pOver, 1)}</b>${nO ? ` (about 1 year in ${nO})` : ""}.</li>
          <li>The answer depends most on <b style="font-family:var(--font-ui)">${drvPlain}</b>; see “what moves the answer” below.</li>
        </ul></div>
        <div class="card"><div class="card-head"><span class="card-title">Good years to bad years ${info("p95")}</span></div><div class="pct-grid">${cards}</div></div>
      </div>
    </div>`;
  }
  function liveMods() {
    const R = S.R, mx = Math.max(...R.modRows.map(m => m.mean), 0.001);
    return `<div class="card-head"><span class="card-title">Where the money goes (average / yr) ${info("fair")}</span></div>
      ${R.modRows.map(m => `<div class="hbar"><span>${m.name}</span><span class="htrack"><span class="fill-accent" style="width:${(m.mean / mx * 100).toFixed(1)}%"></span></span><span class="hval">${fm(m.mean)}</span></div>`).join("")}
      <div class="card-foot">Business interruption (time systems are down) is the largest single cost, which is why recovery speed matters so much.</div>`;
  }
  function liveSens() {
    const R = S.R, mx = Math.max(...R.tornado.map(t => t.swing), 0.001);
    return `<div class="card-head"><span class="card-title">What moves the answer most ${info("sens")}</span></div>
      <p class="small muted" style="margin-top:-6px">Each assumption swung from low to high while the others hold still. Longer bar = more influence.</p>
      ${R.tornado.map(t => `<div class="hbar"><span>${t.name}</span><span class="htrack"><span class="fill-warn" style="width:${(t.swing / mx * 100).toFixed(1)}%"></span></span><span class="hval">±${fm(t.swing / 2)}</span></div>`).join("")}
      <div class="card-foot">Scrutiny, data-gathering and challenge should concentrate at the top of this list.</div>`;
  }
  function pageResults() {
    const canRun = S.role === "1lod", R = S.R;
    const sl = (k, label, tech, min, max, step, val, fmtv, note) => `<div class="slider"><div class="slider-top"><label for="sl-${k}">${label}</label><b data-slval="${k}">${fmtv(val)}</b></div>
      <input id="sl-${k}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-slider="${k}" ${canRun ? "" : "disabled"}><div class="sl-note">${tech}${note ? " · " + note : ""}</div></div>`;
    return `${pageGuide("results")}
      <div class="card section" style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:center">
        <div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="mono xs muted">RANSOM-001</span><b style="font-size:16px">Ransomware: destructive encryption, payments disruption</b>${chip("Validated", false).replace("Validated", "Approved with conditions")}</div>
          <div class="mono xs muted" style="margin-top:4px" data-live="meta">${simMeta()} ${info("mc")}</div></div>
        ${S.role !== "exec" ? `<div class="btn-row"><button type="button" class="btn btn-sm${canRun ? "" : " is-locked"}" data-action="seal">Seal snapshot</button><button type="button" class="btn btn-sm" data-action="toast" data-msg="Sent to the Operational Risk (2LOD) review queue with the sealed snapshot reference.">Send to 2nd line</button><button type="button" class="btn btn-sm btn-dark" data-action="addBoard">Add to board pack</button></div>` : `<a class="btn btn-sm btn-dark" href="#/board">See it in the board report</a>`}
      </div>
      <div data-live="top">${liveTop()}</div>
      <div class="grid g-3 section">
        <div class="card"><div class="card-head"><span class="card-title">Try “what if” ${info("ranges")}</span><span class="live-badge ${canRun ? "on" : "off"}">${canRun ? "LIVE" : "READ-ONLY"}</span></div>
          <p class="small muted" style="margin-top:-6px">${canRun ? `Moving a slider re-runs ${S.iters.toLocaleString()} simulated years instantly. In production, changes need a source and notify the 2nd line.` : "Only the 1st line can change assumptions, which keeps sealed figures stable. Switch role to 1st line to experiment."}</p>
          ${sl("lefMl", "How often an attack succeeds", "most likely per year", 0.08, 0.45, 0.01, S.inputs.lefMl, v => (+v).toFixed(2) + "/yr")}
          ${sl("biDaysMl", "How long systems stay down", "most likely days", 3, 20, 0.5, S.inputs.biDaysMl, v => (+v).toFixed(1) + " days")}
          ${sl("ransomMl", "Ransom size, if paid", "most likely $M", 4, 30, 0.5, S.inputs.ransomMl, v => "$" + (+v).toFixed(1) + "M")}
          ${sl("ctrlEff", "Planned controls: attacks prevented", "reduction in successful attacks", 0, 60, 5, S.inputs.ctrlEff, v => v + "%", "40% ≈ the proposed backup + EDR program")}
          ${canRun ? '<button type="button" class="btn btn-sm" data-action="resetInputs">Reset to sealed values</button>' : ""}
        </div>
        <div class="card" data-live="mods">${liveMods()}</div>
        <div class="card" data-live="sens">${liveSens()}</div>
      </div>
      <div class="small muted" data-live="foot">Reproducibility: re-running with the pinned seed reproduces every figure exactly ${info("seed")} · input fingerprint <span class="mono">${R.hash}</span></div>`;
  }
  const simMeta = () => `seed ${E.DEFAULT_SEED} · ${S.R.iterations.toLocaleString()} simulated years · engine ${E.ENGINE_VERSION} · snapshot ${S.R.snap}`;

  function updateLive() {
    const map = { top: liveTop, mods: liveMods, sens: liveSens, meta: () => simMeta() + " " + info("mc"),
      foot: () => `Reproducibility: re-running with the pinned seed reproduces every figure exactly ${info("seed")} · input fingerprint <span class="mono">${S.R.hash}</span>` };
    document.querySelectorAll("[data-live]").forEach(el => { const fn = map[el.getAttribute("data-live")]; if (fn) el.innerHTML = fn(); });
  }

  /* ================= PROVENANCE ================= */
  function pageProvenance() {
    const flag = f => f === "OK" ? '<span class="chip tone-ok">Current</span>' : f === "STALE" ? '<span class="chip tone-danger">Overdue</span>' : '<span class="chip tone-warn">Judgment drives result</span>';
    const cnt = t => D.provenance.filter(p => p.tier === t).length;
    return `${pageGuide("provenance")}
      <div class="grid g-auto section">
        <div class="card kpi"><span class="kpi-label">${tier("T1")} Own records</span><span class="kpi-value">${cnt("T1")}</span><span class="kpi-note">strongest evidence</span></div>
        <div class="card kpi"><span class="kpi-label">${tier("T2")} Industry data</span><span class="kpi-value">${cnt("T2")}</span><span class="kpi-note">external consortium & studies</span></div>
        <div class="card kpi"><span class="kpi-label">${tier("T3")} Expert judgment</span><span class="kpi-value">${cnt("T3")}</span><span class="kpi-note">weakest; flagged when material</span></div>
        <div class="card kpi"><span class="kpi-label">Needs attention</span><span class="kpi-value" style="color:var(--danger)">${D.provenance.filter(p => p.flag !== "OK").length}</span><span class="kpi-note">overdue or judgment-driven</span></div>
      </div>
      <div class="card"><div class="table-wrap"><table class="tbl">
        <thead><tr><th>Input</th><th>Scenario</th><th>Value / range</th><th>Tier ${info("tiers")}</th><th>Source</th><th>Owner</th><th>As of</th><th>Status</th></tr></thead>
        <tbody>${D.provenance.map(p => `<tr><td class="t-main">${esc(p.name)}</td><td class="small">${esc(p.scen)}</td><td class="mono small nowrap">${esc(p.dist)}</td><td>${tier(p.tier)}</td><td class="small">${esc(p.src)}</td><td class="small">${esc(p.owner)}</td><td class="mono small">${p.asOf}</td><td>${flag(p.flag)}</td></tr>`).join("")}</tbody>
      </table></div>
      <div class="card-foot">Flags are automatic, never hand-set: <b>Overdue</b> when past the refresh date; <b>Judgment drives result</b> when a Tier 3 input moves a key figure by over 10%. Every value records its lineage ${info("lineage")}.</div></div>`;
  }

  /* ================= DECISIONS ================= */
  function pageDecisions() {
    return `${pageGuide("decisions")}
      <div class="card"><div class="table-wrap"><table class="tbl">
        <thead><tr><th>Decision</th><th>Forum</th><th>Due</th><th>Informed by</th><th>Status</th></tr></thead>
        <tbody>${D.decisions.map(d => `<tr><td><div class="t-main">${esc(d.title)}</div><div class="t-sub">${esc(d.plain)} <span class="mono">${d.id}</span></div></td><td class="small">${esc(d.forum)}</td><td class="mono small nowrap">${d.due}</td><td class="mono small">${esc(d.links)}</td><td>${chip(d.status, true)}</td></tr>`).join("")}</tbody>
      </table></div>
      <div class="card-foot">Outcomes are written back after each forum. Once a year, an accuracy report compares what the model said with what actually happened.</div></div>
      <div style="margin-top:16px">${callout("accent", "i", "Why this matters", "Analysis that is not tied to a decision tends to go unread. Requiring a decision first keeps the platform focused on choices the bank actually faces.")}</div>`;
  }

  /* ================= CHALLENGES ================= */
  function pageChallenges() {
    const can = S.role === "2lod";
    const composer = can ? `<div class="card section"><div class="card-head"><span class="card-title">File a challenge (2nd line)</span></div>
      <div class="grid g-2" style="margin-bottom:10px">
        <label class="small">Which input or scope?<select class="sel" data-field="chTarget">${["Ransom payment propensity (T3)", "Loss event frequency basis", "Business interruption daily rate", "Severity shock calibration", "Scenario scope: ransomware"].map(o => `<option${S.chTarget === o ? " selected" : ""}>${o}</option>`).join("")}</select></label>
        <label class="small">Severity<select class="sel" data-field="chSev">${["Medium", "High", "Low"].map(o => `<option${S.chSev === o ? " selected" : ""}>${o}</option>`).join("")}</select></label>
      </div>
      <textarea class="ta" data-field="chDraft" placeholder="State the challenge: which input, what evidence contradicts it, and what re-analysis you require.">${esc(S.chDraft)}</textarea>
      <div class="btn-row" style="margin-top:10px;justify-content:flex-end"><button type="button" class="btn btn-primary" data-action="fileChallenge">Add to ledger (permanent)</button></div></div>`
      : `<div class="section">${callout("info", "i", "Only the 2nd line can file challenges", "The 1st line can respond but never edit or delete. Switch role to “2nd line” to try filing one.")}</div>`;
    const sevTone = { High: "danger", Medium: "warn", Low: "neutral" };
    return `${pageGuide("challenges")}${composer}
      ${S.challenges.map(c => `<article class="ledger-entry ${c.status.toLowerCase()}">
        <div class="ledger-head"><span class="mono" style="font-weight:700">${c.id}</span><span class="chip tone-${sevTone[c.sev]} plain">${c.sev}</span><span class="small">against <b>${esc(c.target)}</b></span><span style="flex:1"></span>${chip(c.status)}</div>
        <div>${esc(c.text)}</div>
        ${c.resp ? `<div class="ledger-resp"><b>1st line response:</b> ${esc(c.resp)}</div>` : ""}
        <div class="ledger-meta">#${c.seq} · ${esc(c.ts)} · ${esc(c.author)} · fingerprint ${c.hash} · chained to ${c.prev}</div>
      </article>`).join("")}`;
  }

  /* ================= VALIDATION ================= */
  function pageValidation() {
    const can = S.role === "mrm";
    let repro = "";
    if (S.repro === "done") {
      const a = S.sealed, b = S.reproRun, same = a.pcts.p50 === b.pcts.p50 && a.pcts.p95 === b.pcts.p95 && a.mean === b.mean;
      repro = `<div style="margin-top:12px">${callout(same ? "ok" : "danger", same ? "✓" : "!", same ? "Reproduced exactly" : "Mismatch detected", `Sealed: average ${fm(a.mean)}, bad year ${fm(a.pcts.p95)}. Re-run: average ${fm(b.mean)}, bad year ${fm(b.pcts.p95)}. Seed ${E.DEFAULT_SEED} · 10,000 years · engine ${E.ENGINE_VERSION}.`)}</div>`;
    }
    return `${pageGuide("validation")}
      <div class="grid g-side">
        <div class="stack">
          <div class="card"><div class="card-head"><span class="card-title">Validation package ${info("validation")}</span>${chip("Validated", false).replace("Validated", "Conditional approval")}</div>
            ${D.valSecs.map(v => `<div class="kv"><span><b style="color:var(--text)">${v.name}</b><br><span class="xs">${v.note}</span></span><span>${chip(v.state)}</span></div>`).join("")}
          </div>
          <div class="card"><div class="card-head"><span class="card-title">Disclosed limitations</span></div>
            <p class="small muted" style="margin-top:-6px">What the model does not yet do. These travel with every number, including into the board pack.</p>
            <div class="rows">${D.limitations.map(l => `<div><b>${l[0]}</b><div class="small muted">${l[1]}</div></div>`).join("")}</div>
          </div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-head"><span class="card-title">Sealed snapshots ${info("snapshot")}</span></div>
            ${D.snapshots.map(s => `<div class="kv"><span class="mono">${s.id} <span class="muted">${s.date}</span></span><span>${chip(s.st)}</span></div>`).join("")}
          </div>
          <div class="card"><div class="card-head"><span class="card-title">Reproducibility check ${info("seed")}</span></div>
            <p class="small muted" style="margin-top:-6px">Actually re-runs snapshot #0042 with its pinned seed in your browser, then compares every figure with the sealed record.</p>
            <button type="button" class="btn ${can ? "btn-primary" : "is-locked"}" data-action="repro">${S.repro === "running" ? "Re-running…" : S.repro === "done" ? "Run again" : "Re-run sealed snapshot"}</button>
            ${repro}
            ${can ? "" : '<p class="xs muted" style="margin-top:8px">Validator tooling. Switch role to “Validator” to run it.</p>'}
          </div>
          <div class="card small muted">Stability: the bad-year figure varies by under 3% across five different seeds at 10,000 years; 50,000 are used for board-cited figures. Independence: validators only ever see sealed snapshots, never the live workbench.</div>
        </div>
      </div>`;
  }

  /* ================= MATERIALITY ================= */
  function pageMateriality() {
    const lo = 38, hi = 128, th = 92, max = 205;
    return `${pageGuide("materiality")}
      <div class="section">${callout("warn", "!", "Rehearsal: simulated incident", "Ransomware has been detected in payments infrastructure. The four-business-day disclosure clock is running. This is a tabletop exercise, not a live event.")}</div>
      <div class="clock" role="list">${D.matClock.map(m => `<div class="clock-step ${m.state}" role="listitem"><div class="cd">${m.day}${m.state === "active" ? " · now" : m.state === "done" ? " ✓" : ""}</div><div class="cl">${m.label}</div><div class="cs">${m.sub}</div></div>`).join("")}</div>
      <div class="grid g-side">
        <div class="card"><div class="card-head"><span class="card-title">Loss estimate: 10 pre-agreed cost categories ${info("materiality")}</span></div>
          <div class="table-wrap"><table class="tbl"><thead><tr><th>Cost category</th><th>Included</th><th class="num">Likely</th><th class="num">Severe</th></tr></thead>
          <tbody>${D.matRows.map(m => `<tr><td>${m.name}</td><td><span class="chip plain tone-${m.incl === "Yes" ? "ok" : m.incl === "Watch" ? "warn" : "neutral"}">${m.incl}</span></td><td class="num">${m.p50}</td><td class="num">${m.p90}</td></tr>`).join("")}
          <tr><td><b>Total estimate</b></td><td></td><td class="num"><b>$${lo}M</b></td><td class="num"><b>$${hi}M</b></td></tr></tbody></table></div>
          <div class="card-foot">“Likely” is the median (P50); “severe” is the 1-in-10 outcome (P90). Every figure traces to the same cost library as the board pack.</div>
        </div>
        <div class="stack">
          <div class="card"><div class="card-head"><span class="card-title">Determination</span></div>
            <div class="thresh" role="img" aria-label="Estimate range $${lo}M to $${hi}M crosses the $${th}M threshold"><span class="range" style="left:${lo / max * 100}%;width:${(hi - lo) / max * 100}%"></span><span class="line" style="left:${th / max * 100}%"></span></div>
            <div class="mono xs muted" style="display:flex;justify-content:space-between"><span>$0</span><span style="color:var(--critical);font-weight:700">threshold $${th}M</span><span>$${max}M</span></div>
            <p class="small" style="margin-top:12px">The estimated range <b>crosses</b> the ratified threshold. Qualitative factors (payments criticality, customer count) weigh toward disclosure.</p>
            <span class="chip tone-danger" style="font-size:13px">Escalate: convene the disclosure committee</span>
          </div>
          <div class="card"><div class="card-head"><span class="card-title">The committee’s choice</span></div>
            <div class="rows small">
              <div><b>Material: file an 8-K</b> by Day 4, from the same sealed estimate.</div>
              <div><b>Not material:</b> document the rationale; keep monitoring as facts develop.</div>
              <div><b>Not yet determinable:</b> record why, and set the next review point.</div>
            </div>
          </div>
          <div class="card"><div class="card-head"><span class="card-title">Sign-off chain</span></div>
            <div class="kv"><span>Technology Risk: estimate assembled</span><span style="color:var(--ok)">✓ Day 1</span></div>
            <div class="kv"><span>Finance: cost mapping reconciled</span><span style="color:var(--ok)">✓ Day 2</span></div>
            <div class="kv"><span>Disclosure committee: determination</span><span style="color:var(--accent)">in session</span></div>
            <div class="kv"><span>Legal: 8-K draft & filing</span><span class="muted">pending</span></div>
          </div>
        </div>
      </div>`;
  }

  /* ================= INSURANCE ================= */
  function pageInsurance() {
    const f = fig(), R = f.R;
    const scaleH = Math.max(200, Math.ceil(Math.max(f.p95 * 1.25, 160) / 50) * 50);
    const pc = v => Math.min(v / scaleH * 100, 100);
    const segs = [["Retention $20M", 0, 20, "#9AA4AC"], ["Primary $40M", 20, 60, "#0E7A8A"], ["Excess $60M", 60, 120, "#4E8CA8"]];
    const marks = [["average", R.mean, "#6B747C"], ["1 in 10", f.p90, "#8A5A06"], ["1 in 20", f.p95, "#8E1B12"]].filter(m => m[1] > 1);
    let prev = -100;
    const markHTML = marks.map(m => { const p = pc(m[1]); const up = p - prev < 12; prev = p; return `<span class="tower-mark" style="left:${p}%;background:${m[2]}"></span><span class="tower-mlabel" style="left:${Math.min(Math.max(p, 6), 94)}%;color:${m[2]};top:${up ? "-16px" : "0"}">${m[0]} ${fm(m[1])}</span>`; }).join("");
    const ticks = []; const step = scaleH > 320 ? 100 : 50; for (let v = 0; v <= scaleH; v += step) ticks.push(`<span style="left:${pc(v)}%">${v ? "$" + v + "M" : "$0"}</span>`);
    const mx = Math.max(...D.roi.map(r => r.roi));
    return `${pageGuide("insurance")}
      <div class="card section">
        <div class="card-head"><span class="card-title">Does insurance cover a bad ransomware year? ${info("tower")}</span></div>
        <div class="gap-hero ${f.gapHas ? "" : "ok"}"><div><div class="gl">${f.gapHas ? "Uninsured in a bad year" : "Covered"}</div><div class="gv">${fm(f.gap)}</div></div>
          <div class="small">${f.gapHas ? `Insurance pays up to <b>$${D.tower}M</b>; a 1-in-20 ransomware year is modeled at <b>${fm(f.p95)}</b>. The bank would absorb the difference. This gap is what renewal decision <span class="mono">D-2026-014</span> (Aug 2026) must settle.` : `A 1-in-20 year (${fm(f.p95)}) sits inside the $${D.tower}M tower.`}</div></div>
        <div class="tower" style="margin-top:24px">${markHTML}
          <div class="tower-bar">${segs.map(s => `<div class="tower-seg" style="left:${pc(s[1])}%;width:${pc(s[2]) - pc(s[1])}%;background:${s[3]}">${s[0]}</div>`).join("")}${f.gapHas ? `<div class="tower-gap" style="left:${pc(D.tower)}%;width:${pc(f.p95) - pc(D.tower)}%"></div>` : ""}</div>
        </div>
        <div class="tower-axis">${ticks.join("")}</div>
        <div class="legend" style="margin-top:8px"><span><i style="background:#9AA4AC"></i>Bank pays first (retention)</span><span><i style="background:#0E7A8A"></i>Primary insurance</span><span><i style="background:#4E8CA8"></i>Excess insurance</span>${f.gapHas ? '<span><i style="background:repeating-linear-gradient(45deg,rgba(192,57,43,.5) 0 3px,rgba(192,57,43,.15) 3px 6px);border:1px solid var(--danger)"></i>Uninsured</span>' : ""}</div>
        <div class="grid g-3" style="margin-top:18px">
          <div class="conf-item"><div class="ci-top">Option A</div><div class="ci-val">Buy more cover</div><div class="ci-note">Add an excess layer of about ${fm(Math.ceil(f.gap / 5) * 5)} to reach the bad-year loss.</div></div>
          <div class="conf-item"><div class="ci-top">Option B</div><div class="ci-val">Shrink the loss</div><div class="ci-note">Fund backup + EDR: bad year falls to about ${fm(f.P.pcts.p95)}${f.progGap > 2 ? ` (gap ${fm(f.progGap)})` : ", inside the tower"}.</div></div>
          <div class="conf-item"><div class="ci-top">Option C</div><div class="ci-val">Accept the gap</div><div class="ci-note">Hold ${fm(f.gap)} knowingly, recorded as a board decision, not by default.</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Which controls buy the most risk reduction? ${info("roi")}</span></div>
        <p class="small muted" style="margin-top:-6px">Avoided loss per year from side-by-side model runs (with vs. without the control), against cost. Above 1.0× the control pays for itself.</p>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Initiative</th><th class="num">Cost</th><th class="num">Avoided loss / yr</th><th>Return</th><th class="num">Payback</th><th>Status</th></tr></thead>
          <tbody>${D.roi.map(r => `<tr><td><div class="t-main">${r.name}</div><div class="t-sub">${r.why}</div></td><td class="num">$${r.cost.toFixed(1)}M</td><td class="num" style="color:var(--ok)">−$${r.dale.toFixed(1)}M</td><td><span class="roi-bar"><span class="b${r.roi < 1 ? " low" : ""}" style="width:${(r.roi / mx * 90).toFixed(0)}px"></span><b class="mono">${r.roi.toFixed(1)}×</b></span></td><td class="num">${r.pay}</td><td>${chip(r.st)}</td></tr>`).join("")}</tbody></table></div>
        <div style="margin-top:14px">${callout("accent", "→", "Reading this table", "Immutable backup returns about $3.90 of avoided loss per dollar because it shortens outages, and business interruption is the largest ransomware cost. Fund it before the branch EDR tranche, which does not pay back (0.6×).")}</div>
      </div>`;
  }

  /* ================= BOARD REPORT ================= */
  function pageBoard() {
    const f = fig(), b = S.board;
    const toggles = [["summary", "Bottom line & summary"], ["appetite", "Exposure vs appetite"], ["deep", "Ransomware deep-dive"], ["insurance", "Insurance adequacy"], ["model", "Model governance"], ["recs", "Recommendations"], ["asks", "Asks of the committee"]]
      .map(([k, l]) => `<label class="toggle-row"><input type="checkbox" data-board="${k}"${b[k] ? " checked" : ""}> ${l}</label>`).join("");
    const rowsA = [
      ["All risks combined (bad year)", fm(f.agg.p95), fm(f.agg.appetite), f.aggU],
      [`Largest single risk: ${f.largest.short} (draft)`, fm(f.largest.p95), fm(f.app), f.largest.p95 / f.app],
      ["Ransomware (live model)", fm(f.p95), fm(f.app), f.p95 / f.app],
      ["Average annual loss (portfolio)", fm(f.agg.mean), fm(f.agg.meanCap), f.agg.mean / f.agg.meanCap]
    ].map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td><span class="chip tone-${utilTone(r[3])}">${utilWord(r[3])}</span></td></tr>`).join("");
    return `${pageGuide("board")}
      <div class="board-layout">
        <div class="stack board-controls">
          <div class="card"><div class="card-head"><span class="card-title">Sections</span></div>${toggles}</div>
          <div class="card"><div class="card-head"><span class="card-title">Deliver ${info("snapshot")}</span></div>
            <div class="stack" style="gap:8px"><button type="button" class="btn btn-primary" data-action="print">Print / save as PDF</button><button type="button" class="btn" data-action="toast" data-msg="PowerPoint export is planned for Phase 1. Use Print / save as PDF for now.">Export PowerPoint (Phase 1)</button></div>
            <p class="xs muted" style="margin-top:10px">Everything here renders from sealed snapshot ${esc(S.R.snap)}, the same one the committee minutes will cite.</p></div>
        </div>
        <article class="paper">
          <div class="paper-kicker">Board technology committee · Q2 2026</div>
          <h2>Quarterly cyber &amp; technology risk report</h2>
          <div class="byline">Prepared by Technology Risk (1st line) · challenged by Operational Risk (2nd line) · model status: conditional approval · simulated data</div>
          ${b.summary ? `<section><h3>Bottom line</h3><div class="bottom-line">We are within the board’s risk appetite, but at ${pct(f.aggU)} utilization the margin is thin. The largest single risk (core conversion) is above its ceiling and not yet reviewed, and insurance falls ${fm(f.gap)} short of a bad ransomware year.</div>
            <ul><li>A bad (1-in-20) year across all risks is modeled at <b>${fm(f.agg.p95)}</b> against a ${fm(f.agg.appetite)} appetite.</li>
            <li>A bad ransomware year (<b>${fm(f.p95)}</b>) exceeds the $${D.tower}M insurance tower${f.gapHas ? ` by <b>${fm(f.gap)}</b>; this prices the renewal decision` : ""}.</li>
            <li>One high-severity independent challenge remains open on a judgment-based ransomware input.</li>
            <li>Recommended now: fund immutable backup &amp; recovery automation ($8.4M, 3.9× return) and settle the insurance renewal explicitly.</li></ul></section>` : ""}
          ${b.appetite ? `<section><h3>Exposure vs appetite</h3><table class="tbl"><thead><tr><th>Measure</th><th class="num">Modeled</th><th class="num">Limit</th><th>Status</th></tr></thead><tbody>${rowsA}</tbody></table></section>` : ""}
          ${b.deep ? `<section><h3>Ransomware: chance of losing at least $X in a year</h3><div class="chart-wrap">${lecSVG(f.R, {})}</div><p class="xs muted">Snapshot ${esc(S.R.snap)} · seed ${E.DEFAULT_SEED} · ${S.R.iterations.toLocaleString()} simulated years · reproducible on demand. A ${pct(f.R.pAny)} chance of a loss-causing attack in any year; average cost ${fm(f.R.mean)} a year.</p></section>` : ""}
          ${b.insurance ? `<section><h3>Insurance adequacy</h3><p>The current tower pays up to <b>$${D.tower}M</b>. A bad ransomware year of <b>${fm(f.p95)}</b> leaves <b>${fm(f.gap)}</b> uninsured. Options for renewal D-2026-014: buy roughly ${fm(Math.ceil(f.gap / 5) * 5)} of additional cover, fund controls that reduce the loss to about ${fm(f.P.pcts.p95)}, or accept the gap by explicit decision.</p></section>` : ""}
          ${b.model ? `<section><h3>Can we rely on these numbers?</h3><p>Tier 2 model, conditionally approved by independent Model Risk Management. Seven challenges filed in twelve months, six closed. First annual back-test completes Q2 2027. Limitations are disclosed in the validation package with compensating controls. 21% of inputs rest on expert judgment; three inputs are overdue for refresh.</p></section>` : ""}
          ${b.recs ? `<section><h3>Recommended actions</h3><table class="tbl"><tbody>${recsRows(f).map(r => `<tr><td class="mono" style="color:var(--accent);font-weight:700;width:36px">${r.n}</td><td><b>${r.title}</b><div class="small muted">${r.why}</div></td><td class="num small">${r.eff}</td></tr>`).join("")}</tbody></table></section>` : ""}
          ${b.asks ? `<section><h3>Asks of the committee</h3><ol><li><b>Approve</b> immutable backup &amp; recovery automation: $8.4M, the best risk-reduction return in the portfolio (3.9×).</li><li><b>Decide</b> the insurance renewal limit explicitly (D-2026-014), choosing between more cover, loss reduction, or accepting the ${fm(f.gap)} gap.</li><li><b>Require</b> a validated analysis before the core conversion go/no-go (D-2026-021).</li><li><b>Note</b> the open challenge on the ransom-payment assumption and its resolution path.</li></ol></section>` : ""}
          ${Object.values(b).some(Boolean) ? "" : '<p class="muted">All sections are switched off. Tick a section on the left to include it.</p>'}
        </article>
      </div>`;
  }

  /* ================= INTEGRATIONS ================= */
  function pageIntegrations() {
    return `${pageGuide("integrations")}
      <div class="grid g-3 section">${D.integrations.map(g => `<div class="card integ"><div class="ih"><b>${g.name}</b>${chip(g.st)}</div><div class="small muted">${g.role}</div><div class="im"><span>${g.dir}</span><span>refresh ${g.freq}</span><span>${g.recs}</span></div></div>`).join("")}</div>
      ${callout("info", "i", "Honest labeling", "This prototype runs entirely on simulated data. Connections are specified, stubbed and labeled as such. Production adapters are pluggable, so the order of integration can change without re-architecture.")}`;
  }

  /* ================= GUIDE ================= */
  function pageGuideRoles() {
    return `${pageGuide("guide")}
      <div class="card section">
        <h3 class="serif" style="font-size:22px;margin-bottom:8px">What this platform is for</h3>
        <p style="font-size:16px">It answers one question in dollars: <b>how much could technology risk cost us in a bad year, and is that inside what the board agreed to tolerate?</b> Instead of color-coded heat maps it runs a transparent simulation, and every number traces to a named source, a named decision and a sealed run that can be reproduced exactly, years later.</p>
        <p class="muted">Use the <b>About this page</b> panel at the top of every screen, the small ${info("p95", "Example")} buttons next to terms, or the ${go("glossary", "Glossary")} for plain-English explanations. The <b>Viewing as</b> switcher at the top changes what you can do to match your role.</p>
        <div class="flow" style="margin-top:14px">${D.guideFlow.map((l, i) => `<div class="flow-step"><span>0${i + 1}</span><span>${l}</span></div>`).join("")}</div>
      </div>
      <h2 class="section-title">Guidance by role ${info("lod")}</h2>
      <div class="grid g-2">${D.guideRoles.map(g => { const r = D.roles[g.id], cur = S.role === g.id; return `<div class="card role-card">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px"><span class="avatar av-${r.tone}">${r.init}</span><div><h4>${r.name}</h4><div class="small muted">${g.tag}</div></div></div>
        <h5 class="card-title" style="margin:6px 0">What you get</h5><ul class="checks">${g.gets.map(x => `<li>${x}</li>`).join("")}</ul>
        <h5 class="card-title" style="margin:14px 0 4px">Step by step</h5><ol class="steps-list">${g.steps.map(x => `<li>${x}</li>`).join("")}</ol>
        <button type="button" class="btn btn-sm ${cur ? "" : "btn-dark"}" style="margin-top:12px" data-action="role" data-role="${g.id}" ${cur ? "disabled" : ""}>${cur ? "✓ Your current view" : "Switch to this view"}</button>
      </div>`; }).join("")}</div>`;
  }

  /* ================= GLOSSARY ================= */
  function pageGlossary() {
    const items = Object.entries(D.glossary).sort((a, b) => a[1].t.localeCompare(b[1].t));
    return `${pageGuide("glossary")}
      <label class="sr-only" for="gloss-q">Search the glossary</label>
      <input id="gloss-q" class="gloss-search" type="search" placeholder="Search terms, e.g. insurance, P95, challenge" data-gloss-search autocomplete="off">
      <div class="grid g-2" data-gloss-list>${items.map(([k, g]) => `<div class="card gloss-item" id="term-${k}" data-gloss-text="${esc((g.t + " " + g.w + " " + g.y).toLowerCase())}"><h4>${g.t}</h4><div class="gw">${g.w}</div><div class="gy"><b>Why it matters:</b> ${g.y}</div></div>`).join("")}</div>
      <p class="muted" data-gloss-empty style="display:none">No terms match. Try a simpler word.</p>`;
  }

  /* ================= overlays ================= */
  function overlays() {
    let h = "";
    if (S.info) {
      const g = D.glossary[S.info];
      h += `<div class="scrim" data-action="closeInfo"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t" data-stop>
        <button type="button" class="close-x" data-action="closeInfo" aria-label="Close">×</button>
        <div class="dk">Plain-English guide</div><h3 id="dlg-t">${g.t}</h3><div class="dw">${g.w}</div>
        <div class="dy"><b>Why it matters</b>${g.y}</div>
        <div class="dfoot"><a href="#/glossary" data-action="closeInfo" class="small">Browse all terms</a><button type="button" class="btn btn-primary btn-sm" data-action="closeInfo">Got it</button></div>
      </div></div>`;
    }
    if (S.toast) h += `<div class="toast" role="status">${esc(S.toast)}</div>`;
    return h;
  }

  /* ================= render ================= */
  const PAGES = { briefing: pageBriefing, dashboard: pageDashboard, scenarios: pageScenarios, detail: pageDetail, wizard: pageWizard, results: pageResults,
    provenance: pageProvenance, decisions: pageDecisions, challenges: pageChallenges, validation: pageValidation, materiality: pageMateriality,
    insurance: pageInsurance, board: pageBoard, integrations: pageIntegrations, guide: pageGuideRoles, glossary: pageGlossary };

  function render(opts) {
    opts = opts || {};
    const y = window.scrollY;
    let html;
    if (S.route === "home") html = pageHome();
    else {
      const routeForAuth = S.route === "detail" ? "scenarios" : S.route;
      const page = navAllowed(routeForAuth, S.role) ? PAGES[S.route]() : restricted(S.route);
      html = shell(page);
    }
    root.innerHTML = html + `<div id="overlays">${overlays()}</div>`;
    document.title = (S.route === "home" ? "CTRQ: Cyber & Technology Risk Quantification" : (D.titles[S.route] || "CTRQ") + " · CTRQ");
    if (opts.keepScroll) window.scrollTo(0, y);
  }
  function renderOverlays() { const o = document.getElementById("overlays"); if (o) o.innerHTML = overlays(); }

  function toast(msg) {
    S.toast = msg; renderOverlays();
    clearTimeout(toast._t); toast._t = setTimeout(() => { S.toast = ""; renderOverlays(); }, 4200);
  }

  /* ================= routing ================= */
  function parseHash() {
    const h = (location.hash || "").replace(/^#\/?/, "");
    const [path, anchor] = h.split("#");
    const parts = path.split("/").filter(Boolean);
    if (!parts.length) return { route: "home", anchor };
    if (parts[0] === "scenario") return { route: "detail", param: parts[1], anchor };
    return { route: PAGES[parts[0]] ? parts[0] : "home", anchor };
  }
  function onRoute() {
    const r = parseHash();
    S.route = r.route; S.param = r.param || null; S.navOpen = false; S.info = null;
    render();
    if (r.anchor) { const el = document.getElementById(r.anchor); if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; } }
    window.scrollTo(0, 0);
    const m = document.getElementById("main"); if (m && S.route !== "home") m.focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", onRoute);

  /* ================= actions ================= */
  function setRole(id) {
    if (!D.roles[id] || id === S.role) return;
    S.role = id; store.set("role", id); S.navOpen = false;
    render({ keepScroll: true });
    toast("Now viewing as " + D.roles[id].name + ". " + D.roles[id].desc);
  }

  const actions = {
    role: el => setRole(el.dataset.role),
    enterExec: () => { if (S.role !== "exec") { S.role = "exec"; store.set("role", "exec"); } },
    toggleNav: () => { S.navOpen = !S.navOpen; render({ keepScroll: true }); },
    closeNav: () => { S.navOpen = false; render({ keepScroll: true }); },
    closeInfo: () => { S.info = null; renderOverlays(); if (S.infoReturn && document.body.contains(S.infoReturn)) S.infoReturn.focus(); },
    toast: el => toast(el.dataset.msg),
    print: () => window.print(),
    seal: () => S.role === "1lod" ? toast("Snapshot sealed: inputs, seed, engine version and results written permanently. Validators can reproduce it at any time.") : toast("Only the 1st line can seal snapshots. Switch role to try it."),
    addBoard: () => toast("Added to the Q2 board pack from snapshot " + S.R.snap + ". The pack cites sealed runs only."),
    rerun: () => { if (S.role !== "1lod") return toast("Only the 1st line can run the model. Switch role to try it."); S.wStep = 4; location.hash = "#/wizard"; },
    resetInputs: () => { S.inputs = Object.assign({}, E.DEFAULT_INPUTS); compute(); render({ keepScroll: true }); toast("Assumptions reset to the sealed values of snapshot #0042."); },
    wDecision: el => { S.wDecision = el.dataset.id; render({ keepScroll: true }); },
    wTemplate: el => { S.wTemplate = el.dataset.id; render({ keepScroll: true }); },
    wNext: () => { S.wStep = Math.min(4, S.wStep + 1); render({ keepScroll: true }); },
    wBack: () => { S.wStep = Math.max(1, S.wStep - 1); render({ keepScroll: true }); },
    wRun: () => {
      if (S.role !== "1lod") return toast("Only the 1st line can run the model. Switch role to try it.");
      if (S.running) return;
      S.running = true; S.prog = 0; render({ keepScroll: true });
      const iv = setInterval(() => {
        S.prog += 14 + Math.random() * 10;
        if (S.prog >= 100) {
          clearInterval(iv); compute(); S.running = false; S.prog = 100;
          location.hash = "#/results";
          toast("Run complete. Snapshot sealed with seed " + E.DEFAULT_SEED + "; results opened.");
        } else render({ keepScroll: true });
      }, 110);
    },
    fileChallenge: () => {
      if (S.role !== "2lod") return;
      const text = S.chDraft.trim();
      if (!text) return toast("Write the challenge before adding it. An empty entry is not evidence.");
      const prev = S.challenges[0], seq = prev.seq + 1;
      const entry = { seq, id: "CH-" + String(seq).padStart(4, "0"), ts: "2026-07-10 · just now", author: "Operational Risk (2LOD)", target: S.chTarget, sev: S.chSev, status: "Open", text, resp: "", prev: prev.hash, hash: E.fnv(prev.hash + text + seq) };
      S.challenges = [entry].concat(S.challenges); S.chDraft = "";
      render({ keepScroll: true });
      toast(entry.id + " added to the ledger and chained to " + prev.hash + ". The 1st line has been notified.");
    },
    repro: () => {
      if (S.role !== "mrm") return toast("Reproducibility checks are validator tooling. Switch role to “Validator”.");
      if (S.repro === "running") return;
      S.repro = "running"; render({ keepScroll: true });
      setTimeout(() => { S.reproRun = E.run(E.DEFAULT_INPUTS, { iterations: 10000, appetite: 250 }); S.repro = "done"; render({ keepScroll: true }); }, 350);
    }
  };

  /* ================= event delegation ================= */
  document.addEventListener("click", e => {
    const t = e.target;
    const infoBtn = t.closest("[data-info]");
    if (infoBtn) { e.preventDefault(); S.infoReturn = infoBtn; S.info = infoBtn.dataset.info; renderOverlays(); const c = document.querySelector(".dialog .close-x"); if (c) c.focus(); return; }
    const scroll = t.closest("[data-scroll]");
    if (scroll) { e.preventDefault(); const el = document.getElementById(scroll.dataset.scroll); if (el) el.scrollIntoView({ behavior: "smooth" }); return; }
    const act = t.closest("[data-action]");
    if (act) {
      // clicks inside the dialog body should not close it via the scrim
      if (act.classList.contains("scrim") && t.closest("[data-stop]")) return;
      const fn = actions[act.dataset.action];
      if (fn) { if (act.tagName !== "A") e.preventDefault(); fn(act); }
      return;
    }
    const row = t.closest("tr[data-href]");
    if (row && !t.closest("a,button")) location.hash = row.dataset.href;
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { if (S.info) actions.closeInfo(); else if (S.navOpen) actions.closeNav(); }
    if (e.key === "Enter" && e.target.matches("tr[data-href]")) location.hash = e.target.dataset.href;
    if (e.key === "Tab" && S.info) { // keep focus inside the dialog
      const f = document.querySelectorAll(".dialog button, .dialog a"); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  let simTimer;
  const SL_FMT = { lefMl: v => (+v).toFixed(2) + "/yr", biDaysMl: v => (+v).toFixed(1) + " days", ransomMl: v => "$" + (+v).toFixed(1) + "M", ctrlEff: v => v + "%" };
  document.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset.slider) {
      const k = t.dataset.slider; S.inputs[k] = +t.value;
      const lab = document.querySelector(`[data-slval="${k}"]`); if (lab) lab.textContent = SL_FMT[k](t.value);
      clearTimeout(simTimer); simTimer = setTimeout(() => { compute(); updateLive(); }, 140);
    } else if (t.dataset.field === "chDraft") {
      S.chDraft = t.value;
    } else if (t.hasAttribute("data-gloss-search")) {
      const q = t.value.trim().toLowerCase(); let n = 0;
      document.querySelectorAll("[data-gloss-text]").forEach(el => { const show = !q || el.dataset.glossText.includes(q); el.style.display = show ? "" : "none"; if (show) n++; });
      const em = document.querySelector("[data-gloss-empty]"); if (em) em.style.display = n ? "none" : "";
    }
  });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.board) { S.board[t.dataset.board] = t.checked; render({ keepScroll: true }); }
    else if (t.dataset.winput) {
      const lim = { lefMl: [0.08, 0.45], biDaysMl: [3, 20], ransomMl: [4, 30], ctrlEff: [0, 60] }[t.dataset.winput];
      const v = Math.min(lim[1], Math.max(lim[0], +t.value || E.DEFAULT_INPUTS[t.dataset.winput]));
      S.inputs[t.dataset.winput] = v; compute(); render({ keepScroll: true });
    }
    else if (t.dataset.field === "iters") { S.iters = +t.value; compute(); render({ keepScroll: true }); }
    else if (t.dataset.field === "chTarget") S.chTarget = t.value;
    else if (t.dataset.field === "chSev") S.chSev = t.value;
  });
  document.addEventListener("toggle", e => {
    const d = e.target;
    if (d.dataset && d.dataset.guide) { store.set("guide." + d.dataset.guide, d.open); const tg = d.querySelector(".pg-toggle"); if (tg) tg.textContent = (d.open ? "Hide" : "Show") + " guide"; }
  }, true);

  // loss-curve hover / touch readout
  function lecPointer(e) {
    const rect = e.target.closest("[data-lec]");
    if (!rect) return;
    const svg = rect.ownerSVGElement, pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const x = Math.min(Math.max(p.x, X0), X0 + XW);
    const v = Math.pow(10, (x - X0) / XW * LOGMAX), pr = S.R.exceed(v);
    const g = svg.querySelector(".lec-hover");
    g.style.display = "";
    g.querySelector(".hv-l").setAttribute("x1", x); g.querySelector(".hv-l").setAttribute("x2", x);
    g.querySelector(".hv-c").setAttribute("cx", x); g.querySelector(".hv-c").setAttribute("cy", ypx(pr));
    const n = oneIn(pr);
    const out = svg.closest(".card").querySelector("[data-readout]");
    if (out) out.innerHTML = pr > 0
      ? `There is a <b>${pct(pr, 1)}</b> chance${n ? ` (about 1 year in ${n})` : ""} that ransomware losses in a year reach at least <b>${fm(v)}</b>.${v > D.tower ? " That is beyond what insurance pays." : ""}`
      : `Losses of <b>${fm(v)}</b> or more did not occur in any of the ${S.R.iterations.toLocaleString()} simulated years.`;
  }
  document.addEventListener("pointermove", lecPointer);
  document.addEventListener("pointerdown", lecPointer);

  onRoute();
})();
