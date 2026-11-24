/*
 * CTRQ content and simulated data.
 * All data is simulated. No institution is named. People are referenced by function only.
 * Dollar values are in $ millions unless stated otherwise.
 */
(function (root) {
  "use strict";

  const D = {};

  D.asOf = "Jul 10, 2026";
  D.tower = 120;            // insurance tower top, $M
  D.aggregate = { p95: 612, appetite: 650, mean: 68, meanCap: 90 };
  D.program = { ctrlEff: 20, outageCut: 50 }; // backup + EDR program: EDR cuts successful attacks 20%, backup halves outage (both T3 assumptions)
  D.portfolioIllustrative = true; // aggregate P95 is an input, not model output (no cross-scenario aggregation yet)
  D.reviewUrl = "https://github.com/WowItWorked/Cyber-Tech-Risk-Quantification/blob/main/docs/METHODOLOGY_REVIEW.md";

  /* ---------- roles ---------- */
  D.roles = {
    exec: {
      short: "Executive", name: "Executive & board", init: "EX", tone: "neutral",
      desc: "Read-only. Results, decisions and the board pack.",
      strip: "Executive view: results in dollars, the decisions they inform, and the board pack. Model internals stay with the practitioners."
    },
    "1lod": {
      short: "1st line", name: "First line: Technology Risk", init: "1L", tone: "accent",
      desc: "Builds scenarios, edits inputs, runs the model.",
      strip: "First-line workbench: you can build scenarios, edit inputs, run simulations and seal snapshots. Challenge and validation stay independent of you."
    },
    "2lod": {
      short: "2nd line", name: "Second line: Operational Risk", init: "2L", tone: "warn",
      desc: "Read-only. Files independent challenges.",
      strip: "Independent challenge view: models and inputs are read-only. Challenges you file are permanent. The first line can respond, never edit."
    },
    mrm: {
      short: "Validator", name: "Model Risk Management", init: "MR", tone: "info",
      desc: "Audits sealed runs and re-runs them to prove they reproduce.",
      strip: "Validator view: sealed snapshots, the full input register and reproducibility tooling. Live edits are disabled by design."
    }
  };

  /* ---------- navigation ---------- */
  // [id, label, plain-language hint, icon path, roles allowed (null = all)]
  const EXEC_OK = null;
  D.nav = [
    { label: "Start here", items: [
      ["briefing", "Executive briefing", "The one-page answer", "M4 4h16v16H4zM8 9h8M8 13h8M8 17h5", EXEC_OK]
    ]},
    { label: "Oversight", items: [
      ["dashboard", "Risk dashboard", "All risks vs. limits", "M3 3h8v8H3zM13 3h8v5h-8zM13 12h8v9h-8zM3 15h8v6H3z", EXEC_OK],
      ["board", "Board report", "Build and print the pack", "M3 3h18M5 3v11h14V3M12 14v4M8.5 21l3.5-3 3.5 3", EXEC_OK],
      ["decisions", "Decisions", "What the numbers are for", "M9 11l3 3 9-9M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9", EXEC_OK]
    ]},
    { label: "Decide & disclose", items: [
      ["insurance", "Insurance & investments", "Coverage gaps and control ROI", "M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9zM12 12v6a2 2 0 0 0 4 0", EXEC_OK],
      ["materiality", "Incident disclosure (8-K)", "The four-day clock", "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 11v4M12 18h.01", EXEC_OK]
    ]},
    { label: "Analyze", items: [
      ["scenarios", "Risk scenarios", "The risks we price", "M12 2 2 7l10 5 10-5zM2 12l10 5 10-5M2 17l10 5 10-5", EXEC_OK],
      ["results", "Ransomware deep-dive", "Live simulation results", "M3 3v18h18M7 16c5 0 5-9 11-10", EXEC_OK],
      ["wizard", "New analysis", "Set up and run a model", "M12 8v8M8 12h8M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z", ["1lod", "2lod", "mrm"]]
    ]},
    { label: "Assurance", items: [
      ["provenance", "Data sources", "Where every input comes from", "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3", ["1lod", "2lod", "mrm"]],
      ["challenges", "Challenge ledger", "Independent disagreement, on record", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v5M12 16.5h.01", ["1lod", "2lod", "mrm"]],
      ["validation", "Model validation", "Is the model fit to rely on?", "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM8.5 12l2.5 2.5L16 9.5", ["1lod", "2lod", "mrm"]],
      ["integrations", "Data connections", "Systems feeding the model", "M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v3", ["1lod", "2lod", "mrm"]]
    ]},
    { label: "Help", items: [
      ["guide", "How to use this", "Guide by role", "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z", EXEC_OK],
      ["methodology", "Methodology review", "Can the maths be trusted?", "M9 3h6M10 3v6L4 19a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7 15h10", EXEC_OK],
      ["glossary", "Glossary", "Every term in plain English", "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5", EXEC_OK]
    ]}
  ];

  D.titles = {
    briefing: "Executive briefing", dashboard: "Risk dashboard", scenarios: "Risk scenarios", detail: "Scenario detail",
    wizard: "New analysis", results: "Ransomware deep-dive", provenance: "Data sources", decisions: "Decisions",
    challenges: "Challenge ledger", validation: "Model validation", materiality: "Incident disclosure (8-K)",
    insurance: "Insurance & investments", board: "Board report", integrations: "Data connections",
    guide: "How to use this platform", glossary: "Glossary", methodology: "Methodology review"
  };

  /* ---------- page guides: what it shows / how to read it / what to decide ---------- */
  D.guides = {
    briefing: {
      what: "The one-page answer to two questions: is our technology risk inside the limit the board agreed, and which decisions need you now?",
      read: ["Start with the verdict at the top. It is the whole briefing in one sentence.", "“1-in-20-year loss” means a severe but realistic bad year. Most years are far quieter.", "Every figure links to the page that explains it in full."],
      decide: ["Whether the remaining headroom is enough, or appetite needs revisiting.", "The decisions listed below, each with a recommended option and a due date."]
    },
    dashboard: {
      what: "Each risk scenario we have priced, showing what a severe year could cost, set against the board’s dollar limits. Also shows how solid the underlying data is.",
      read: ["Each bar is one risk’s 1-in-20-year loss. The dark tick is the single-risk ceiling; red bars are over it.", "The appetite gauges show how much of each agreed limit today’s risk uses up.", "“Draft” or “in challenge” means a number is not yet fully reviewed. Weigh it accordingly."],
      decide: ["Which risks need a decision, more money, or more scrutiny now.", "Whether to act on draft numbers or wait for validation."]
    },
    scenarios: {
      what: "The list of technology risks the bank prices in dollars. Each passed three tests: it is plausible, it is material, and it is tied to a real decision.",
      read: ["“Average / year” is the long-run cost; “bad year” is the 1-in-20-year loss.", "The data-mix bar shows how much rests on our own records (dark), industry data (blue) or expert judgment (amber).", "Select a row to see what the scenario covers and which decisions it informs."],
      decide: ["Whether the list covers the risks you worry about. New scenarios enter through a decision, not a hunch."]
    },
    detail: {
      what: "One risk scenario in depth: what event it covers, how it is priced, which decisions it informs and its run history.",
      read: ["The narrative states what is in and out of scope, so nobody is surprised later.", "Pricing splits into “how often” and “how much each time”, each from named sources."],
      decide: ["Whether the scope matches the risk you actually face."]
    },
    wizard: {
      what: "Where the first line sets up and runs a new analysis. It cannot start without naming the decision it informs.",
      read: ["Four steps: link a decision, pick a scenario, set input ranges with sources, then run.", "Every input is a range (low / most likely / high) with a named source, never a single guess."],
      decide: ["Executives do not use this page. It exists so every number you see has a decision and a source behind it."]
    },
    results: {
      what: "The live ransomware model: how likely an attack is, what it could cost, where insurance and appetite run out, and which assumptions drive the answer.",
      read: ["The “plain-English reading” box turns the numbers into sentences. Start there.", "On the curve, hover anywhere to read “the chance a year costs at least $X”.", "The sensitivity bars rank which assumptions move the answer most: that is where to spend scrutiny."],
      decide: ["How much insurance to buy, and which controls to fund.", "First-line users can move the sliders to test “what if”; other roles see the sealed figures."]
    },
    provenance: {
      what: "Every input behind the numbers: its source, owner, date and how strong the evidence is.",
      read: ["Tier 1 is our own records (strongest), Tier 2 is industry data, Tier 3 is expert judgment (weakest).", "Flags are automatic: STALE means overdue for refresh; “Judgment drives result” means a Tier 3 input moves a key figure by over 10%."],
      decide: ["Whether a figure is solid enough to act on. Flagged inputs deserve a question before the vote."]
    },
    decisions: {
      what: "The business decisions this platform exists to inform, with forum, due date and status.",
      read: ["Every analysis must link to one of these, so the work stays pointed at real choices.", "“Informed” means analysis has been delivered; “pending” means the decision is still waiting on numbers."],
      decide: ["Whether a decision is about to be taken without its analysis. That is the gap to close."]
    },
    challenges: {
      what: "A permanent record of independent challenge: where the second line disagreed with the first line’s numbers, and how it was resolved.",
      read: ["Entries can be answered but never edited or deleted. Each is digitally chained to the last, so tampering would show.", "Open, high-severity challenges mean a figure is still contested."],
      decide: ["Whether contested figures should be cited to the board yet, or cited with a caveat."]
    },
    validation: {
      what: "The independent review that decides whether the model can be relied on, plus proof that past results can be reproduced exactly.",
      read: ["“Conditional approval” means usable now, with named follow-ups and dates.", "Disclosed limitations are things the model does not yet do. They travel with every number."],
      decide: ["How much weight to give model outputs in a decision, given its stated limits."]
    },
    materiality: {
      what: "A rehearsal of the four-business-day process for deciding whether a cyber incident must be publicly disclosed to investors (SEC Form 8-K).",
      read: ["The clock shows where the process stands, day by day.", "The estimate builds from ten pre-agreed cost categories against a threshold the board already ratified."],
      decide: ["Whether the incident is material: disclose, escalate, or not material. The page frames that call; people make it."]
    },
    insurance: {
      what: "Two money questions: does our cyber insurance cover a bad year, and which security investments buy the most risk reduction per dollar?",
      read: ["The coverage bar shows insurance layers stacked against modeled losses. The striped red zone is the loss insurance would not pay.", "ROI is avoided loss per year divided by annual cost. Above 1.0× the control pays for itself."],
      decide: ["The insurance renewal limit (decision D-2026-014, due Aug 2026).", "Which controls to fund first."]
    },
    board: {
      what: "Builds the quarterly board pack from sealed, reviewed numbers, so the board never sees a moving target.",
      read: ["Tick sections on or off; the preview updates instantly.", "“Print / save as PDF” produces the pack exactly as previewed."],
      decide: ["What goes in front of the committee, and the asks you put to it."]
    },
    integrations: {
      what: "The internal and external systems that feed the model, and the status of each connection.",
      read: ["“Connected · sim” works today on simulated data. “Planned” connections are designed but not yet built."],
      decide: ["Sequencing of data investments. Better data narrows the ranges and firms up the numbers."]
    },
    methodology: {
      what: "What the model does well, where it falls short of accepted standards, and what has been fixed. Read this before relying on a figure for a material decision.",
      read: ["Each finding has a status: fixed, disclosed (a known limit), or open (needs work or data).", "The full technical review, with the tests behind every number, is linked at the bottom."],
      decide: ["How much weight each figure can bear, and which limitations to note when citing it."]
    },
    guide: {
      what: "How each role uses the platform, step by step.",
      read: ["Pick your role below. Use “Switch to this view” to see the platform the way that role does."],
      decide: []
    },
    glossary: {
      what: "Every technical term on the platform, explained in plain English with why it matters.",
      read: ["Search, or browse alphabetically. The small ⓘ buttons throughout the site open these same entries."],
      decide: []
    }
  };

  /* ---------- glossary (also powers the ⓘ popovers) ---------- */
  D.glossary = {
    p95: { t: "1-in-20-year loss (P95)", w: "Picture 10,000 simulated years lined up from best to worst. The P95 is the loss that only the worst one-in-twenty years exceed. P50 is the middle year; P99 is close to worst case.", y: "Boards set limits against severe years, not averages. Comparing P95 to the dollar appetite answers one question: would a realistically bad year stay inside what the board agreed to absorb?" },
    appetite: { t: "Risk appetite (in dollars)", w: "The most technology-risk loss the board has agreed the bank should be exposed to, stated in dollars and re-ratified each year by the board risk committee. “Utilization” is how much of that limit today’s risk uses.", y: "A dollar limit turns “are we comfortable?” into arithmetic: headroom, near the line, or over it. No color-coded opinion needed." },
    ceiling: { t: "Single-scenario ceiling", w: "A limit on any one risk scenario’s 1-in-20-year loss (currently $250M), alongside the limit for the whole portfolio.", y: "It stops one large risk from quietly eating most of the portfolio appetite." },
    ale: { t: "Average annual loss (ALE)", w: "The average loss per simulated year, counting the many quiet years where little or nothing happens. It is much smaller than the bad-year figure, because most years are fine and a few are not.", y: "The average is the right number for budgeting and comparing investments. It is the wrong number for setting limits; that is what the 1-in-20-year loss is for." },
    mc: { t: "Monte Carlo simulation", w: "The model replays the year thousands of times, varying how often events happen and what they cost within evidence-based ranges. A fixed “seed” pins the random draws, so any run can be replayed exactly.", y: "Ranges show honest uncertainty instead of false precision, and exact replay means any figure the board sees can be audited years later." },
    seed: { t: "Seed", w: "A number that fixes the sequence of random draws in a simulation. Same inputs plus same seed always gives the same result.", y: "It is what makes every figure reproducible. Auditors and regulators can re-run the exact calculation behind a decision." },
    lec: { t: "Loss curve (loss exceedance curve)", w: "Pick any dollar amount on the horizontal axis; the curve gives the chance that a year’s losses reach at least that much. Dashed lines mark the board appetite and the top of the insurance tower.", y: "One picture holds the whole story: routine years, severe years, and exactly where insurance and tolerance run out." },
    fair: { t: "FAIR (how a risk is priced)", w: "FAIR is the industry-standard method. Each risk splits into two questions: how often could it happen, and what would it cost each time. Costs build from concrete categories such as downtime, legal and lost customers, each tied to the general ledger.", y: "Two smaller, checkable questions replace one big guess, and each part can be traced, challenged and improved on its own." },
    ranges: { t: "Ranges, not single numbers", w: "Every input is entered as low / most-likely / high from a named source, never a single figure. The simulation samples inside those ranges thousands of times.", y: "A single number fakes certainty. Ranges keep uncertainty visible and show how much it actually matters." },
    tiers: { t: "Evidence tiers (T1 / T2 / T3)", w: "Tier 1: the bank’s own records (strongest). Tier 2: external industry and consortium data. Tier 3: structured expert judgment (weakest, sometimes unavoidable). Judgment may not quietly stand in where real data exists.", y: "The tier tells you how much weight a number deserves. Judgment-based inputs that materially move a result are flagged automatically and drawn into challenge." },
    lod: { t: "Lines of defense (who can do what)", w: "The first line (Technology Risk) builds and runs the model. The second line (Operational Risk) reviews independently and files challenges. Model validators audit sealed copies. Executives see results, not levers.", y: "Regulators expect this separation. Here the platform enforces it, so no one grades their own homework." },
    challenge: { t: "Challenge ledger", w: "A permanent, add-only record of independent disagreement. Second-line challenges can be answered by the first line but never edited or deleted. Each entry is chained to the one before, so tampering would be evident.", y: "Supervisors ask for proof of “effective challenge”. This ledger is that proof, produced as a side effect of normal work." },
    snapshot: { t: "Sealed snapshot", w: "A locked copy of every input, setting and result at a point in time. Sealed runs cannot change, and re-running one must reproduce the same numbers to the last digit.", y: "Committees decide on sealed numbers, not moving targets. Anyone can replay the exact run behind any decision." },
    validation: { t: "Independent validation (MRM)", w: "Model Risk Management, a team independent of the builders, tests the model’s logic, data and limits before its outputs are relied on. Approval can be conditional, with named follow-ups.", y: "US supervisory guidance (SR 11-7) requires it for models that inform decisions. “Validated, with conditions” is an honest, usable status, and it travels with the numbers." },
    materiality: { t: "Four-day disclosure clock (8-K)", w: "After a significant cyber incident, SEC rules give four business days, from the point it is judged material, to disclose it on Form 8-K. The loss estimate builds from ten pre-agreed cost categories against a threshold the board already ratified.", y: "The determination becomes a checklist run under a clock, not a debate started from scratch mid-crisis." },
    tower: { t: "Insurance tower and uninsured tail", w: "Cyber insurance stacks in layers: the bank’s own retention first, then primary and excess layers, up to a top (today $120M). Loss beyond the top in a severe year is the uninsured tail.", y: "The tail is the renewal decision in one number: buy more cover, restructure the layers, or knowingly hold the risk." },
    roi: { t: "Control ROI (ΔALE)", w: "The model runs side-by-side simulations with and without a proposed control. The drop in average annual loss is the control’s risk return, set against its annual cost.", y: "Security spending gets ranked like any other investment: reduction per dollar and payback in years, not adjectives." },
    sens: { t: "Sensitivity (what moves the answer)", w: "Each assumption is swung from a plausible low to a plausible high while the others hold still, and the model is re-run each time. The bar shows how far the 1-in-20-year loss moves. Over \u00b110% from an expert-judgment input is flagged as material.", y: "Attention, data-gathering and challenge concentrate on the few assumptions that matter." },
    prov: { t: "Provenance", w: "Where a number came from: its source, owner, as-of date and evidence tier. Overdue values flag as stale automatically.", y: "“Where did this number come from?” is the first question from any board member or examiner. This is the standing answer." },
    decisions: { t: "No decision, no analysis", w: "Every analysis must name the decision it informs (forum, owner and date) before it can be created. Outcomes are recorded after each forum meets.", y: "It keeps the work pointed at real choices. Analysis nobody acts on is a well-known failure of risk quantification programs." },
    agg: { t: "Adding risks together", w: "A severe year for the whole portfolio is not the sum of every scenario’s worst case, because bad years do not all land at once. The aggregate models how risks move together.", y: "Simple addition would overstate the total and hide headroom that really exists." },
    convergence: { t: "Convergence (is the run big enough?)", w: "The same model is re-run with five different random seeds. If the 1-in-20-year loss moves by less than 3% between them, the run is big enough to trust. Smaller runs are noisier.", y: "It separates real changes in risk from random noise in the simulation. Runs that fail this test cannot be sealed." },
    review: { t: "Methodology review", w: "An evaluation of the model\u2019s mathematics and assumptions against accepted standards (Open FAIR, model risk guidance, actuarial practice), with findings and fixes.", y: "It tells you which figures are model output you can lean on, and which are still assumptions or illustrative inputs." },
    lineage: { t: "Data lineage (BCBS 239)", w: "Every value pulled from another system carries its source, transformation and timestamp, following the banking data standard BCBS 239.", y: "A number is only as defensible as its pipeline. Lineage makes the pipeline inspectable." },
    lod1: { t: "1LOD / 2LOD", w: "Shorthand for first line of defense (the business and technology teams who own and manage risk) and second line of defense (the independent risk function that oversees and challenges them).", y: "It tells you who produced a number and who checked it." },
    confidence: { t: "Confidence in the numbers", w: "A plain read of how much weight the figures can bear, based on validation status, evidence tiers, stale inputs and open challenges.", y: "A precise-looking number on weak evidence is more dangerous than a rough one on strong evidence. Confidence tells you which you are looking at." }
  };

  /* ---------- scenarios ---------- */
  D.scenarios = [
    { id: "ransomware", code: "RANSOM-001", name: "Ransomware: destructive encryption", short: "Ransomware", cat: "Malicious · external", status: "Validated", live: true, mean: 0, p95: 0, t: [38, 42, 20], last: "Jul 8 · #0042", dec: 2,
      plain: "Criminals lock our payment and customer systems and demand a ransom, causing a multi-day outage.",
      narrative: "An affiliate-operated ransomware intrusion achieves domain privilege, encrypts payment-processing and customer-facing infrastructure, and triggers a multi-day service outage with extortion. In scope: retail payments, digital channels, and the acquired estate mid-conversion. Out of scope: nation-state destructive attack (separate scenario intake)." },
    { id: "coreconv", code: "CORE-004", name: "Core conversion failure", short: "Core conversion", cat: "Non-malicious · change", status: "Draft", mean: 31, p95: 320, t: [48, 22, 30], last: "Draft v0.3", dec: 1,
      plain: "The switch-over to the acquired bank’s core system fails, corrupting account data and forcing a long period of running both systems.",
      narrative: "The post-acquisition core banking conversion fails at cutover, corrupting position data and forcing extended dual-run. The single largest technology risk on the book, and it has no threat actor." },
    { id: "exfil", code: "EXFIL-003", name: "Data theft: customer personal data", short: "Customer data theft", cat: "Malicious · external", status: "In 2LOD challenge", mean: 22.5, p95: 210, t: [30, 45, 25], last: "Jun 30 · #0040", dec: 1,
      plain: "Attackers quietly copy customer records through a compromised account, leading to notification costs, lawsuits and lost customers.",
      narrative: "Staged exfiltration of customer records via a compromised service account. Cost is dominated by notification, litigation and attrition rather than response cost." },
    { id: "cloud", code: "CLOUD-008", name: "Cloud concentration: region loss", short: "Cloud region loss", cat: "Non-malicious · third party", status: "Scheduled", mean: 12.8, p95: 154, t: [25, 45, 30], last: "Q3 intake", dec: 1,
      plain: "A major cloud provider region goes down for a day or more, taking out many services that were assumed to fail independently.",
      narrative: "Loss of a primary cloud region for 24+ hours; concentration risk across workloads that assumed independent failure." },
    { id: "thirdparty", code: "TPO-002", name: "Third-party processor outage", short: "Processor outage", cat: "Non-malicious · third party", status: "Validated", mean: 9.8, p95: 96, t: [55, 30, 15], last: "Jun 24 · #0038", dec: 1,
      plain: "A critical card-processing supplier has a long technology failure. No attacker involved, and their contract pays out slower than our losses mount.",
      narrative: "A critical card-processing provider suffers an extended technology failure with no cyber cause. Recovery depends on the provider’s own resilience; contractual remedies lag actual loss." },
    { id: "aimodel", code: "AI-009", name: "AI model abuse: fraud models", short: "AI model abuse", cat: "Malicious · emerging", status: "Scheduled", mean: 9.0, p95: 88, t: [15, 40, 45], last: "Q4 intake", dec: 0,
      plain: "Fraudsters trick our fraud-detection AI into staying quiet during a coordinated fraud campaign.",
      narrative: "Adversarial manipulation of fraud-detection models to suppress alerts during a coordinated fraud campaign. Tier-3 heavy by necessity; flagged accordingly." },
    { id: "insider", code: "INSIDE-006", name: "Insider misuse: privileged access", short: "Insider misuse", cat: "Malicious · internal", status: "Draft", mean: 7.4, p95: 71, t: [35, 35, 30], last: "Draft v0.1", dec: 0,
      plain: "A trusted administrator misuses their access over months. Rare, but slow to detect.",
      narrative: "A privileged administrator exfiltrates or manipulates data over months. Frequency is low; detection lag is the driver." },
    { id: "bec", code: "BEC-005", name: "Payment fraud: business email compromise", short: "Email payment fraud", cat: "Malicious · external", status: "Validated", mean: 6.1, p95: 44, t: [62, 28, 10], last: "Jun 12 · #0035", dec: 1,
      plain: "Criminals impersonate executives or suppliers by email to redirect payments.",
      narrative: "Executive impersonation and vendor-invoice manipulation leading to fraudulent wires. Strong internal actuals exist; frequency is tier-1 calibrated." },
    { id: "ddos", code: "DDOS-007", name: "DDoS: digital channels", short: "DDoS attack", cat: "Malicious · external", status: "Scheduled", mean: 3.2, p95: 28, t: [40, 40, 20], last: "Q3 intake", dec: 0,
      plain: "Attackers flood online and mobile banking with traffic during a busy period, knocking them offline.",
      narrative: "Sustained volumetric and application-layer attack against digital banking during a peak window." }
  ];

  /* ---------- decisions ---------- */
  D.decisions = [
    { id: "D-2026-014", title: "Cyber insurance renewal: tower limit selection", forum: "Technology Risk Committee", due: "Aug 2026", links: "RANSOM-001", status: "Informed",
      plain: "How much cyber insurance to buy at renewal." },
    { id: "D-2026-025", title: "Materiality threshold ratification", forum: "Disclosure committee", due: "Aug 2026", links: "Materiality baseline", status: "Pending analysis",
      plain: "Confirm the $92M loss threshold used to decide if an incident must be disclosed." },
    { id: "D-2026-019", title: "EDR expansion: tranche 3 (branch estate)", forum: "Investment gate: Technology", due: "Sep 2026", links: "RANSOM-001", status: "Pending analysis",
      plain: "Whether to fund the third phase of endpoint protection, covering the branch estate." },
    { id: "D-2026-021", title: "Core conversion go/no-go readiness criteria", forum: "Conversion steering", due: "Oct 2026", links: "CORE-004 (draft)", status: "In flight",
      plain: "What must be true before switching to the new core banking system." },
    { id: "D-2026-008", title: "Payments resilience investment tranche", forum: "Technology Risk Committee", due: "Jul 2026", links: "TPO-002", status: "Informed",
      plain: "Approved Jun 30, informed by the processor-outage analysis." }
  ];

  /* ---------- challenges ---------- */
  D.challenges = [
    { seq: 7, id: "CH-0007", ts: "2026-07-06 14:22 UTC", author: "Operational Risk (2LOD)", target: "Ransom payment propensity (T3)", sev: "High", status: "Responded",
      text: "The 35% payment propensity rests on a single external survey and a calibration workshop. It moves P95 by more than 10%. Require: corroborating consortium evidence or a sensitivity-bounded disclosure in the board pack.", resp: "Re-tested with paired engine runs on P95 (engine v0.10.0): moving propensity from 20% to 50% shifts P95 by about \u00b12.5%, below the 10% materiality test. The original \u2018>10%\u2019 figure came from a sensitivity method that measured the average year, not P95; that method has been replaced. Range disclosed in the board pack. Propose closure; the severity multiplier (T3, \u00b110.6%) is now the flagged input.", hash: "9c41d7aa", prev: "e2b80f13" },
    { seq: 6, id: "CH-0006", ts: "2026-06-18 09:05 UTC", author: "Operational Risk (2LOD)", target: "Business interruption daily rate", sev: "Medium", status: "Responded",
      text: "Daily outage cost of $2.2M cites FY25 GL actuals but excludes interchange make-whole payments booked under a different cost center.", resp: "Accepted. Rate rebuilt from the reconciled GL mapping; interchange included. Delta +$0.3M/day, snapshot #0041 supersedes #0040.", hash: "e2b80f13", prev: "51c9aa02" },
    { seq: 5, id: "CH-0005", ts: "2026-05-29 16:40 UTC", author: "Operational Risk (2LOD)", target: "Loss event frequency basis", sev: "Medium", status: "Closed",
      text: "Frequency blends two consortium datasets with different sector definitions. Require a single stated basis with the blend rationale in the assumption register.", resp: "Basis restated to financial-sector-only consortium data; blend removed. Register updated with rationale and refresh date.", hash: "51c9aa02", prev: "genesis0" }
  ];

  /* ---------- provenance ---------- */
  D.provenance = [
    { name: "Loss event frequency: sector base rate", scen: "Ransomware", dist: "PERT(0.08, 0.22, 0.55)", tier: "T2", src: "Loss consortium, financial sector", owner: "Technology Risk", asOf: "2026-05", flag: "OK" },
    { name: "Daily outage cost: payments", scen: "Ransomware", dist: "$2.2M /day", tier: "T1", src: "Finance GL actuals FY25, reconciled", owner: "Finance", asOf: "2026-06", flag: "OK" },
    { name: "Ransom payment propensity", key: "ransomProp", scen: "Ransomware", dist: "Bernoulli(0.35)", tier: "T3", src: "Calibrated workshop W-12 + survey", owner: "Technology Risk", asOf: "2026-04", flag: "OK" },
    { name: "Ransom demand size", scen: "Ransomware", dist: "PERT(4, 9.5, 60)", tier: "T2", src: "External ransom payment dataset", owner: "Technology Risk", asOf: "2026-05", flag: "OK" },
    { name: "Recovery duration", scen: "Ransomware", dist: "PERT(2, 8, 45) days", tier: "T1", src: "Resilience tests + BIA RTOs", owner: "Resilience", asOf: "2026-06", flag: "OK" },
    { name: "Customer attrition post-incident", scen: "Ransomware", dist: "PERT(1, 7, 120)", tier: "T2", src: "Industry attrition studies", owner: "Retail Banking", asOf: "2025-11", flag: "STALE" },
    { name: "Legal & regulatory range", scen: "Ransomware", dist: "PERT(0.5, 6, 80)", tier: "T2", src: "Enforcement action database", owner: "Legal", asOf: "2026-03", flag: "OK" },
    { name: "Severity common shock", key: "sevMax", scen: "All scenarios", dist: "PERT(0.7, 1.0, 2.2)", tier: "T3", src: "Calibrated workshop W-14", owner: "Technology Risk", asOf: "2026-04", flag: "OK" },
    { name: "Processor dependency map", scen: "Processor outage", dist: "Asset graph", tier: "T1", src: "TPRM inventory + BIA", owner: "Third-Party Risk", asOf: "2026-06", flag: "OK" },
    { name: "Records at risk: customer PII", scen: "Customer data theft", dist: "62M records", tier: "T1", src: "Data inventory, system of record", owner: "Data Office", asOf: "2026-05", flag: "OK" },
    { name: "Per-record notification cost", scen: "Customer data theft", dist: "PERT($1.4, $2.1, $4.8)", tier: "T2", src: "External breach cost studies", owner: "Technology Risk", asOf: "2025-10", flag: "STALE" },
    { name: "Conversion defect escape rate", scen: "Core conversion", dist: "PERT(0.2%, 0.9%, 3.1%)", tier: "T3", src: "Program QA judgment", owner: "Conversion Program", asOf: "2025-12", flag: "STALE" }
  ];

  /* ---------- integrations ---------- */
  D.integrations = [
    { name: "GRC platform (Archer)", role: "System of record for risks, controls and incidents. Primary data bus.", st: "Connected · sim", dir: "bidirectional", freq: "hourly", recs: "1,842 control records" },
    { name: "Finance general ledger", role: "Actual loss costs mapped to the loss library; materiality evidence chain.", st: "Connected · sim", dir: "inbound", freq: "monthly", recs: "26 mapped cost categories" },
    { name: "BIA / resilience platform", role: "Recovery time objectives, dependency maps and recovery test results.", st: "Connected · sim", dir: "inbound", freq: "monthly", recs: "312 critical services" },
    { name: "SIEM (security monitoring)", role: "Evidence of how often attacks are attempted and nearly succeed.", st: "Planned · P1", dir: "inbound", freq: "daily", recs: "spec drafted" },
    { name: "Vulnerability management", role: "Exposure and control-state evidence for susceptibility.", st: "Planned · P1", dir: "inbound", freq: "weekly", recs: "spec drafted" },
    { name: "Third-party risk platform", role: "Vendor criticality and concentration for third-party scenarios.", st: "Planned · P1", dir: "inbound", freq: "weekly", recs: "spec drafted" },
    { name: "External loss consortium", role: "Tier-2 industry data on how often losses happen and how big they get.", st: "Planned · P1", dir: "inbound", freq: "quarterly", recs: "license pending" },
    { name: "Threat intelligence", role: "Triggers to refresh scenarios when the threat picture changes.", st: "Phase 3", dir: "inbound", freq: "continuous", recs: "deferred by design" }
  ];

  /* ---------- control investments ---------- */
  /* Control effects are T3 assumptions fed to the engine; avoided loss and ROI are computed live (paired runs). */
  D.roi = [
    { name: "Immutable backup + recovery automation", short: "immutable backup & recovery automation", cost: 8.4, effect: { outageCut: 50 }, effectTxt: "halves outage & restoration", st: "Proposed", why: "Shortens recovery. Biggest cut to the bad-year loss, which drives the insurance decision." },
    { name: "EDR expansion: acquired estate", short: "the EDR expansion to the acquired estate", cost: 6.2, effect: { ctrlEff: 20 }, effectTxt: "20% fewer successful attacks", st: "Funded", why: "Stops more attacks before they spread." },
    { name: "Privileged access hardening", short: "privileged access hardening", cost: 3.1, effect: { ctrlEff: 8 }, effectTxt: "8% fewer successful attacks", st: "Funded", why: "Limits what a stolen admin account can do." },
    { name: "Third EDR tranche: branch estate", short: "the branch EDR tranche", cost: 4.8, effect: { ctrlEff: 3 }, effectTxt: "3% fewer successful attacks", st: "Proposed", why: "Little residual exposure in branches." },
    { name: "Payment fraud analytics uplift", short: "payment fraud analytics", cost: 2.4, staticDale: 1.1, effectTxt: "email-fraud scenario, not live", st: "Proposed", why: "Catches fraudulent payments earlier. Estimated in the email-fraud scenario intake; not in the live model." }
  ];

  /* ---------- materiality tabletop ---------- */
  D.matClock = [
    { day: "Day 0", label: "Detect & declare", sub: "incident confirmed", state: "done" },
    { day: "Day 1", label: "Scope", sub: "systems, records, duration", state: "done" },
    { day: "Day 2", label: "Estimate the loss", sub: "10-category estimate", state: "active" },
    { day: "Day 3", label: "Decide", sub: "disclosure committee", state: "todo" },
    { day: "Day 4", label: "File 8-K", sub: "if material", state: "todo" }
  ];
  D.matRows = [
    { name: "Business interruption", incl: "Yes", p50: "$14M", p90: "$52M" },
    { name: "Incident response & forensics", incl: "Yes", p50: "$3.5M", p90: "$9M" },
    { name: "Ransom / extortion", incl: "Yes", p50: "$8M", p90: "$24M" },
    { name: "Data restoration", incl: "Yes", p50: "$4M", p90: "$12M" },
    { name: "Notification & credit monitoring", incl: "Yes", p50: "$2.5M", p90: "$7M" },
    { name: "Legal & regulatory", incl: "Yes", p50: "$4M", p90: "$16M" },
    { name: "Customer attrition", incl: "Yes", p50: "$2M", p90: "$8M" },
    { name: "Litigation (class action)", incl: "Watch", p50: "—", p90: "$18M" },
    { name: "Third-party liability", incl: "No", p50: "—", p90: "—" },
    { name: "Proprietary data loss", incl: "No", p50: "—", p90: "—" }
  ];

  /* ---------- validation ---------- */
  D.valSecs = [
    { name: "Methodology & model theory", state: "Complete", note: "FAIR decomposition, distribution rationale" },
    { name: "Assumption & provenance register", state: "Complete", note: "generated from the live register" },
    { name: "Sensitivity & convergence analysis", state: "Complete", note: "rebuilt in review: P95 paired runs; 50k-year runs pass re-seed gate" },
    { name: "Back-testing framework", state: "Partial", note: "first annual cycle completes Q2 2027" },
    { name: "Limitations & compensating controls", state: "Complete", note: "disclosed below, visible to the board" },
    { name: "Change & version log", state: "Complete", note: "every run sealed with seed + hash" }
  ];
  D.limitations = [
    ["Portfolio total is an illustrative input, not model output.", "Only ransomware is simulated. The $612M aggregate awaits Phase 2 cross-scenario aggregation."],
    ["Loss ranges have hard upper limits (Beta-PERT).", "Real cyber losses are heavy-tailed; the 1-in-100-year figure is likely understated. A lognormal / Pareto tail is proposed."],
    ["Secondary losses apply to every event.", "Open FAIR conditions attrition, legal and notification costs on a secondary-loss probability; omitting it overstates those costs."],
    ["Control effects are expert judgment (Tier 3).", "Avoided-loss and ROI figures are computed by the model but inherit these assumptions; shown with each control."],
    ["Severity uses a single common shock across cost categories.", "Its maximum is the most influential judgment input (\u00b110.6% on the bad-year loss) and is flagged for calibration."],
    ["Outputs inform decisions; they do not set regulatory capital.", "Basel operational-risk reconciliation is out of scope this phase."]
  ];
  D.snapshots = [
    { id: "#0044", date: "Jul 10, 2026", hash: "963fcc01", st: "Submitted" },
    { id: "#0042", date: "Jul 8, 2026", hash: "7f3a91c2", st: "Superseded" },
    { id: "#0041", date: "Jun 30, 2026", hash: "b04ce1d9", st: "Submitted" },
    { id: "#0040", date: "Jun 12, 2026", hash: "e77a02f4", st: "Superseded" }
  ];

  D.activity = [
    { t: "Jul 10", tag: "Review", tone: "info", txt: "Methodology review: sensitivity re-run on the bad-year figure, 50,000-year runs adopted, control returns now computed by the model." },
    { t: "Jul 10", tag: "Challenge", tone: "warn", txt: "CH-0007 answered: ransom-payment likelihood moves the bad-year figure by only \u00b12.5%. The severity multiplier (\u00b110.6%) is now flagged instead." },
    { t: "Jul 10", tag: "Sealed", tone: "info", txt: "Snapshot #0044 sealed on engine v0.10.0, superseding #0042. Seed and inputs pinned so it can be reproduced exactly." },
    { t: "Jul 05", tag: "Validation", tone: "info", txt: "Validation package v0.9 accepted with conditions; back-testing still partial." },
    { t: "Jul 02", tag: "Data", tone: "danger", txt: "Three inputs passed their refresh date: customer attrition, notification cost, conversion defect rate." },
    { t: "Jun 30", tag: "Decision", tone: "ok", txt: "D-2026-008 payments resilience tranche approved, informed by the processor-outage analysis." }
  ];

  D.guideFlow = ["Name the decision", "Build the scenario", "Set ranges, with sources", "Run & seal", "Challenge, validate, report"];
  D.guideRoles = [
    { id: "exec", tag: "Committees and senior management: read results, make decisions",
      gets: ["Exposure in dollars against the limit you ratified", "Insurance and security spend framed as investment choices", "A board pack that cites only sealed, reviewed numbers"],
      steps: ["Start at the Executive briefing. The verdict line is the whole story in one sentence.", "Use “Decisions on your desk” to see what is due, the recommended option and the evidence behind it.", "Tap any ⓘ for a plain-English explanation of a term, or open the Glossary.", "Check “How confident are we?” before relying on a figure. Draft and challenged numbers are labeled.", "Open Board report to review or print the committee pack."] },
    { id: "1lod", tag: "Technology Risk: builds scenarios, runs the model, owns the numbers",
      gets: ["Dollar answers for funding asks, sized by the model", "A defensible trail: every number sealed, sourced and reproducible", "One set of numbers for committees, insurance and disclosure"],
      steps: ["Confirm the decision your analysis informs in Decisions, or register a new one. No decision, no analysis.", "Open New analysis: link the decision, then pick the scenario template.", "Set inputs as low / most-likely / high ranges, each with a source, owner and date.", "Review and run. The seed is pinned and the audit record written before the first iteration.", "Read the deep-dive: the bad year against appetite, the loss curve, and what moves the answer.", "Seal the snapshot and send it to the second line. Respond to challenges; you can answer, never edit.", "Publish validated numbers through the Board report builder."] },
    { id: "2lod", tag: "Operational Risk: reviews independently and files challenges",
      gets: ["Read-only sight of every input, run and flag", "Permanent challenge rights the first line cannot override", "A tamper-evident record that your review happened"],
      steps: ["Scan the Risk dashboard for what changed: new runs, open flags, overdue inputs.", "Work Data sources: automatic flags (stale, judgment-driven) show where to look first.", "Inspect runs sent to you in the deep-dive and Scenario detail. Everything is read-only.", "File a challenge: name the input, set severity, state the evidence and the re-analysis you require.", "Track responses and close what is resolved. The record is permanent."] },
    { id: "mrm", tag: "Model Risk Management: validates and re-runs sealed results",
      gets: ["A validation package assembled continuously from live data", "Sealed snapshots you can re-run on demand", "Evidence of effective challenge, ready for supervisors"],
      steps: ["Open Model validation and review the package sections.", "Audit Data sources and the Challenge ledger as evidence of data quality and challenge.", "Pick a sealed snapshot and run the reproducibility check. The pinned seed must reproduce every figure exactly.", "Record the determination: full, conditional with named follow-ups, or fail.", "Set the next review date and back-test cycle."] }
  ];

  root.CRQData = D;
})(window);
