# Lifetime Allocation Optimizer — Methodology and Research

Developer/research note for the Lifetime Allocation Optimizer. Companion to the
[`retirement` SWR methodology](../retirement/swr-methodology.md). It asks: **what equity weight
should you hold at each age — before and after retirement — to maximize lifetime welfare?**

The research sweep and reported results in Sections 2–4 use our forward Canadian capital-market
assumptions and plain **iid Monte Carlo**. The productized Python recommender and the web app both
now default to **forward-block pooled** — historical single-country return sequences affine-rescaled
to the forward-CMA marginals, then stationary-block-bootstrapped — so the results capture sequence
risk while honoring the user's return assumptions. **IID Monte Carlo** remains available as an
optional mode in both interfaces.

The web and Python recommender share the baseline household/model defaults: flexibility 0,
γ = 4, β = 0.985, a 4% flexible withdrawal rate, and a 2% real borrowing cost. Their product
surfaces intentionally differ: the web app fixes the glide cadence at 5-year steps, uses
browser-sized path/pass caps, exposes fewer controls, and requires at least $10,000 of guaranteed
income. Python exposes the interval and historical return modes (with world/pooled dataset
choices), and accepts zero guaranteed income for research and CLI sensitivity cases.

This work is a deliberate cross-check on two influential backtest-based studies:

- **ACO** — Anarkulova, Cederburg, O'Doherty, _Beyond the Status Quo_ ([SSRN 4590406](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4590406)):
  a 38-country block bootstrap concludes the lifetime-utility optimum is **~100% equity, held
  flat** across the whole lifecycle (no bonds, no glide). Its constant-spending optimal profile
  (their Figure 3) is **flat ~100% through accumulation** with a shallow bills/bonds "tent"
  concentrated **right at retirement**, receding within a few years.
- **ERN** — earlyretirementnow.com [Part 20](https://earlyretirementnow.com/2017/09/20/the-ultimate-guide-to-safe-withdrawal-rates-part-20-more-thoughts-on-equity-glidepaths/):
  a US Shiller backtest finds a **rising** retirement glide (e.g. 60%→100%) adds ~0.1–0.3pp to
  the SWR, **but only when CAPE > 20**.

Simulation: [`analysis/glide_path/research.py`](../../analysis/glide_path/research.py)
(`python3 -m analysis.glide_path.research`; needs numpy + matplotlib). Figures it writes are in
gitignored `analysis/artifacts/glide_path/research/`.

## Contents

1. [Method](#1-method)
2. [Results](#2-results)
3. [Comparison with ACO and ERN](#3-does-this-validate-or-reject-aco-and-ern)
4. [Caveats](#4-caveats--what-an-iid-model-on-our-cmas-cannot-see)
5. [Python recommender](#5-recommender-script)
6. [Reproducing the analysis](#6-reproduce)

The research sweep remains forward-CMA iid Monte Carlo. The web app and Python recommender both
default to forward-block pooled; iid-mc is available as an optional mode. The four supported
modes in the Python recommender:

```bash
# Default: historical sequences rescaled to forward-CMA marginals, then block-bootstrapped
python3 analysis/recommend_glide.py                         # forward-block pooled

# Forward-CMA normal iid Monte Carlo (original behavior)
python3 analysis/recommend_glide.py --mode iid-mc

# Raw paired world stock/fixed-income years, sampled independently with replacement
python3 analysis/recommend_glide.py --mode historical-iid

# Raw paired world stock/bond years, sampled in stationary circular blocks
python3 analysis/recommend_glide.py --mode historical-block --block-years 10

# Historical sequences rescaled to the forward-CMA marginals, then block-bootstrapped
python3 analysis/recommend_glide.py --mode forward-block --dataset pooled
```

Historical modes use real paired stock and long-government-bond returns from the JST R6
Macrohistory workbook. `analysis/shared/jst_history.py` downloads it on first use to gitignored
`analysis/.data/`, deflates each asset by each country's CPI, and pairs the real returns by year.
`--dataset world` (default) averages countries within each calendar year into one
annually-rebalanced portfolio; `--dataset pooled` concatenates each country's own sequence so a
block samples consecutive years of a single country. Each sampled historical year keeps stock and
bond paired. Historical modes require pandas and openpyxl in addition to numpy. A custom `--curve`
and `--inflation` apply only to `iid-mc`.

The world series has no negative 20- or 30-year circular stock window, so longer average blocks can
make a 100% stock result optimal under this model — a property of bootstrapping the
already-diversified world series, not of the (stock/bond) candidate set.

---

## TL;DR

1. **The spending rule decides the shape.**
   - **Constant real-dollar withdrawal** → the optimum **derisks into retirement** to a low at/just after the retirement date (a **bond tent**), then drifts equity back up. This appears under **pure iid**, so it is a genuine **sequence-of-returns** effect, not a valuation/mean-reversion artifact.
   - **Flexible withdrawal** (income allowed to move with the market) → optimum is **flat, high equity (~100%)** essentially throughout — exactly **ACO's** prescription.
2. **The glide _shape_ is worth very little; the _level_ is what matters.** Tested out-of-sample, the full per-age glide beats the best single **flat** weight by only **~$300/yr of certainty-equivalent (CE) income (~0.5%)**, and ≈ $0 when spending is flexible. But for constant-$ the right _level_ is **~60–80% equity, not 100%** — holding 100% (in accumulation or retirement) is genuinely dominated, by **$650–$2,000/yr**.

3. **Where the constant-$ tent sits — and why it differs from ACO.** Our constant-$ tent bottoms
   at/just after retirement (age 65–69), matching ACO's location, but our iid-CMA accumulation path
   **falls** rather than staying flat near 100%. The difference reflects the complete model: our
   lower forward equity premium, fixed-horizon household, and default no-bequest objective versus
   ACO's developed-country block bootstrap, stochastic mortality, and bequest utility. Under our
   rigid spending floor with no bequest, upside beyond the target has little value while depletion
   is severely penalized. Adding a bequest motive or raising the premium moves our path toward
   ACO's flat-high result.

4. **Both studies are right in their own world.** ACO's flat-100% is optimal _when spending is flexible (or wealth is valued)_; ERN/Kitces–Pfau's rising retirement glide is optimal _when spending is rigid_ — and the sequence-risk rationale survives iid even though ERN's CAPE-conditional SWR _boost_ cannot.

5. **A CRRA allocation recommendation requires some guaranteed retirement income.** If guaranteed
   income is zero, even a rare depleted year drives consumption to the numerical floor and makes CE
   tail-dominated. The web app therefore requires at least $10,000 of guaranteed annual income.
   Python accepts zero for sensitivity work and can still report depletion and the two candidate
   paths, but their allocation comparison is tail-dominated.

---

## 1. Method

Real (today's) dollars throughout. The documented research results below use iid normal returns,
drawn each year — **no** serial correlation, **no** valuation signal — so anything the optimizer
likes here is robust to the absence of mean reversion, by construction.

### Python recommender return modes

All four modes feed the same lifecycle cash flows, utility objective, coordinate-ascent optimizer,
and independent evaluation-sample comparison:

- **`iid-mc`** maps each allocation to the app's forward-CMA real mean and volatility, then draws
  independent normal returns. This remains the default and the only mode used by the web app and
  `analysis/glide_path/research.py`.
- **`historical-iid`** samples raw historical years independently with replacement. Stock and the
  selected asset returns remain paired within a sampled year, but year-to-year ordering is removed.
- **`historical-block`** uses a stationary circular block bootstrap of paired asset-return years.
  Each next year continues the current historical sequence with probability `1 − 1/L` or restarts
  at a random year with probability `1/L`, so block lengths are geometric and average `L` years.
  The default `L` is 10 years, an annual approximation of the 120-month average used by ACO.
- **`forward-block`** affine-rescales each asset's historical series to the forward-CMA marginals
  (the same `w=0` and `w=1` mean/vol `iid-mc` uses), then block-bootstraps exactly like
  `historical-block`. Being affine, the rescale preserves each asset's autocorrelation and the
  stock/bond correlation, so this isolates *sequencing* from the historical return/risk level — the
  missing cell of the marginals × sequencing factorial.

**What each mode actually does** (the distinctions that matter when reading results):

| Mode | Preserves sequencing | Single-country sequence | Stock/bond pair kept | Uses forward PWL marginals |
| ----------------- | :------------------: | :---------------------: | :------------------: | :-------------------------: |
| `iid-mc`          | ✕ (iid)              | n/a                     | n/a (curve, no corr) | ✓ (full curve)              |
| `historical-iid`  | ✕ (iid)              | pooled only             | ✓                    | ✕ (raw historical)          |
| `historical-block`| ✓                    | pooled only             | ✓                    | ✕ (raw historical)          |
| `forward-block`   | ✓                    | pooled only             | ✓                    | ✓ (`w=0` & `w=1` anchors)   |

Notes: (1) "Single-country sequence" holds only with `--dataset pooled`; the default `world`
dataset is the equal-weight cross-country average, whose sequence no single investor lived. (2) The
stock/bond *contemporaneous* correlation is preserved in every historical mode because both series
are indexed by the same sampled rows; `forward-block` keeps the **historical** correlation while
matching forward marginals (intermediate-weight risk therefore comes from that historical
covariance, not the curve). (3) `forward-block` matches only the `w=0`/`w=1` anchors, not the
curve's interpolated intermediate-weight vols.

**Dataset and exclusions** (historical modes only): `--dataset pooled` (default) concatenates
each country's own sequence end to end, with segment ids that keep a block from bridging two
countries or a data/exclusion gap, so a block samples consecutive years of a single country.
`--dataset world` averages countries within each calendar year into one annually-rebalanced
portfolio.
`--exclude-countries` / `--exclude-years` (pooled only) drop disaster countries or windows.

For allocations up to 100% equity, each annual portfolio return is `w × stock + (1−w) × bonds`.
Above 100% equity, the leveraged return is `w × stock − (w−1) × real borrowing cost`, with no bond
position. The `historical-*` modes use raw
realized return levels; they do not re-center history to the forward CMAs (only `forward-block`
does). They are bootstrap backtests, not overlapping realized lifecycle windows. With the default
`world` dataset, the block bootstrap resamples an already-diversified annual equal-weight-world
series; the `pooled` dataset instead preserves single-country sequence risk. Either way these are
annual sequencing sensitivity checks, not an ACO replication (ACO bootstraps a monthly
country-level four-asset panel).

### Returns — our own assumptions, no history

The app's allocation curve ([`presets.ts`](../../src/utils/retirement/presets.ts) `ALLOCATIONS`, PWL Capital-based, inflation 2.1%) is interpolated so **any** equity weight `w∈[0,1]` maps to a real arithmetic `(mean, vol)`. Endpoints: **100% equity → 4.67% real / 12.6% vol**; **0% equity → 1.42% real / 5.4% vol** ⇒ an equity premium of **~3.3pp** (vs the ~5pp the US-tilted history ACO and ERN lean on — see the [`retirement` SWR methodology](../retirement/swr-methodology.md) §2). Each year's return is `mean(wₜ) + vol(wₜ)·Z`, matching `monteCarlo.ts` (arithmetic normal, mid-year cash flow earns half a year, a depleted portfolio absorbs at 0).

### Household & phases

`START_AGE=35`, `START_SAVINGS=$200k`, income `$100k`, save **20%/yr** during accumulation,
target retirement income **60%** of income, of which **$20k** is guaranteed income (CPP/OAS/DB)
paid every retirement year — so the portfolio must fund a **$40k** gap. Accumulation consumption is
allocation-invariant, so it drops out of the objective; the accumulation glide matters only through
the **wealth distribution it hands to retirement**. Retirement is a **fixed planning horizon**
(`retire_years`), which makes "horizon" a clean axis (no mortality truncation; no bequest motive —
terminal wealth carries no utility).

### Spending rules — the income-variation axis

Each retirement year the withdrawal target blends a constant and a portfolio-proportional rule by
a flexibility knob **`FLEX∈[0,1]`**:

```
targetₜ = (1−FLEX)·$40k  +  FLEX·(4%·balanceₜ)
withdrawalₜ = min(targetₜ, affordable)      consumptionₜ = $20k guaranteed + withdrawalₜ
```

- **`FLEX=0` — constant $**: insists on the full $40k every year; income is rigid until the
  portfolio is exhausted (then drops to the $20k floor). This is the SWR / `/retirement`-tool world.
- **`FLEX=0.5` — semi-flexible**: half the target floats with the portfolio.
- **`FLEX=1` — fully flexible**: spends 4% of the _current_ portfolio, so income rises and falls
  with the market and the portfolio is never mechanically depleted. This is ACO's world.

### Objective & the per-age optimizer

Maximize expected discounted **CRRA utility** of retirement consumption (γ = 4 base; β = 0.985;
bequest weight 0). The control is the **equity weight at every age** (length = accumulation +
retirement years). We optimize it by **coordinate ascent**: hold all ages fixed but one, evaluate
that age over a 10pp equity grid on a **shared** shock matrix (common random numbers), take the
best, and cycle (alternating sweep direction) until the whole vector stops moving. CRN makes each
one-dimensional search exact for the drawn markets, and **no parametric shape is imposed** — so
flat / tent / monotone shapes all compete on equal footing.

### Zero-income states and the CRRA impossible trinity

The model assumes guaranteed income is paid **every** retirement year. With positive guaranteed
income, consumption remains positive after portfolio depletion and CRRA's `u(c)` stays finite. The
bare `_FLOOR = $1` is then only a numerical guard and does not bind in the §2 scenarios.

A pre-pension bridge, or a plan with **$0 guaranteed income for all of retirement**, breaks that
assumption. Once the portfolio depletes, consumption falls to the numerical floor. Because
`u(c)→−∞` as `c→0`, with γ≥2 even a handful of `$1` consumption-years can dominate thousands of
otherwise successful paths. CE collapses toward the floor and the optimizer can select an
implausible allocation merely to avoid those rare cells.

We tested three approaches and found an **impossible trinity**: the model cannot simultaneously
provide all three of the following:

1. **No consumption floor or assumed fallback income.**
2. **A γ-responsive welfare objective.**
3. **Possible ruin while still producing one preferred allocation.**

Raw all-path CRRA preserves (1) and (2), but a ruined year has effectively unbounded negative
utility, so it cannot produce a useful comparison when (3) occurs. Assigning a finite utility value
to a broke year restores a comparison, but that floor effectively fabricates consumption the
household does not have. Scoring CRRA only over surviving paths avoids fabricated income, but under
target spending every survivor consumes the target by construction. Survivor CE therefore equals
the target for every γ; the objective collapses to γ-independent depletion minimization and, in
testing, recommended roughly the same 120–135% leveraged allocation from γ=1 through γ=12.

The chosen scope is therefore to preserve clean, all-path, γ-responsive CRRA and not model a
pre-pension bridge. That funding-feasibility question belongs to `/retirement`. A user-entered
**$0 guaranteed income is economically a permanent bridge** and recreates the same limitation: the
product labels the CE values as tail-dominated and presents the allocation comparison as
**inconclusive** rather than treating either candidate as a reliable recommendation. Depletion
metrics remain meaningful and are still reported.

Two honesty checks accompany every result:

- **Tent vs terminal artifact.** With bequest weight 0, the optimizer drives equity toward 0 in the
  _final_ retirement years (no future to grow for). That is a planning-horizon artifact, so we
  report the **tent** = lowest equity within 15y of retirement separately from the **terminal-year**
  equity.
- **Shape value, out of sample (§2e).** We re-score the optimized path on an **independent** shock
  draw against (a) flat 100%, (b) the best single flat weight, and (c) the optimal retirement glide
  with accumulation _forced_ to 100%. If the optimized accumulation shape doesn't beat flat-100% out
  of sample, we don't believe it.
- **Product recommender fallback.** The interactive recommender applies one extra robustness guard:
  after coordinate ascent, it scores the optimized glide and the best constant allocation on an
  independent draw. If the constant allocation wins materially, the UI/CLI recommends that flat
  allocation as the robust choice, while still charting and reporting the raw optimized glide.
  Smaller differences are treated as shape-vs-level noise: the app may still call out the simpler
  constant allocation, but it keeps the optimized glide visible.

---

## 2. Results

### 2a. SWR anchor (validates the engine; tests ERN under iid)

Retirement-only, constant $, 90% success — reproduces the `/retirement` tool and tests whether a
rising glide beats the best flat weight under iid.

| Horizon | Best flat (w\*) | Flat 100% | Rising 60→100 |
| ------- | --------------- | --------- | ------------- |
| 30y     | **3.66%** (50%) | 3.47%     | 3.65%         |
| 40y     | **2.99%** (65%) | 2.87%     | 3.01%         |
| 50y     | **2.61%** (70%) | 2.51%     | 2.63%         |

Matches the methodology doc (30y 3.67%, 50y 2.61%). The SWR-maximizing weight is **interior
(50–70%)**, not 100% — because the SWR is a pure left-tail metric. The rising glide ties the best
flat weight to two decimals; **it earns no SWR premium under iid**, confirming ERN's effect is a
CAPE/mean-reversion phenomenon absent from an iid world. (See `swr_anchor.png`.)

### 2b. Per-age optimal glide — retirement-horizon sweep

γ = 4, 30y accumulation. All columns are **equity %**. `tent` = lowest equity within 15y of
retirement (the retirement-date tent bottom) and the age it hits; `end` = terminal-year equity (a
no-bequest horizon artifact, not real). BEFORE/AFTER = slope of accumulation / of the retirement
approach into the tent.

| Spending      | Ret. horizon | start | acc. avg | pre-ret | @ret | tent (age) | end | BEFORE  | AFTER  | CE income | Deplete |
| ------------- | ------------ | ----- | -------- | ------- | ---- | ---------- | --- | ------- | ------ | --------- | ------- |
| constant $    | 30y          | 100   | 68       | 40      | 50   | 40 (@66)   | 100 | Falling | Rising | $55,825   | 6.3%    |
| constant $    | 40y          | 100   | 78       | 50      | 60   | 50 (@69)   | 80  | Falling | Rising | $50,804   | 11.8%   |
| constant $    | 50y          | 100   | 84       | 60      | 70   | 70 (@65)   | 40  | Falling | Rising | $47,101   | 15.9%   |
| semi-flex 50% | 30y          | 100   | 98       | 90      | 90   | 70 (@76)   | 100 | Flat    | Flat   | $69,470   | 1.5%    |
| semi-flex 50% | 40y          | 100   | 94       | 80      | 80   | 70 (@69)   | 100 | Falling | Flat   | $65,340   | 4.0%    |
| semi-flex 50% | 50y          | 100   | 94       | 70      | 80   | 70 (@67)   | 50  | Falling | Flat   | $60,516   | 7.8%    |
| flexible 100% | 30y          | 100   | 99       | 90      | 90   | 80 (@69)   | 0   | Flat    | Flat   | $68,459   | 0.0%    |
| flexible 100% | 40y          | 100   | 99       | 90      | 90   | 90 (@65)   | 0   | Flat    | Flat   | $66,123   | 0.0%    |
| flexible 100% | 50y          | 100   | 99       | 90      | 90   | 90 (@65)   | 0   | Flat    | Flat   | $64,139   | 0.0%    |

**Reading it:**

- **Constant $ → derisk into a tent, then drift up.** Equity falls through accumulation to a low
  **at/just after retirement** (40–70%), then rises. Income is near-rigid; the cost shows up as
  **depletion risk** (6–16%, rising with horizon). Longer horizons keep the tent shallower (70% vs
  40%) because a longer retirement needs more growth.
- **Flexible 100% → flat ~100%.** Equity is pinned near the top for the entire working and
  retired life; depletion is **0%** (proportional spending can't deplete) and the cost is borne as
  income variation. CE income is _higher_ than constant-$ ($64–68k vs $47–56k) — the value of
  letting income move is what unlocks the equity premium. (The `end = 0` column is the no-bequest
  terminal artifact, not a recommendation.)
- **Semi-flex is intermediate**, tipping from flat toward a mild tent as the horizon lengthens.

### 2c. Per-age optimal glide — accumulation-horizon sweep

γ = 4, 30y retirement. Same columns.

| Spending      | Accum. years | start | acc. avg | pre-ret | @ret | tent (age) | end | BEFORE  | AFTER  | CE income | Deplete |
| ------------- | ------------ | ----- | -------- | ------- | ---- | ---------- | --- | ------- | ------ | --------- | ------- |
| constant $    | 20y          | 100   | 88       | 80      | 70   | 70 (@55)   | 90  | Falling | Rising | $43,565   | 25.9%   |
| constant $    | 30y          | 100   | 68       | 40      | 50   | 40 (@66)   | 100 | Falling | Rising | $55,825   | 6.3%    |
| constant $    | 40y          | 70    | 55       | 50      | 50   | 30 (@76)   | 60  | Falling | Flat   | $59,407   | 1.1%    |
| semi-flex 50% | 20y          | 100   | 92       | 80      | 70   | 70 (@55)   | 100 | Falling | Rising | $53,812   | 7.3%    |
| semi-flex 50% | 30y          | 100   | 98       | 90      | 90   | 70 (@76)   | 100 | Flat    | Flat   | $69,470   | 1.5%    |
| semi-flex 50% | 40y          | 100   | 98       | 90      | 90   | 80 (@76)   | 40  | Flat    | Flat   | $86,831   | 0.3%    |
| flexible 100% | 20y          | 100   | 100      | 100     | 90   | 90 (@55)   | 0   | Flat    | Flat   | $52,027   | 0.0%    |
| flexible 100% | 30y          | 100   | 99       | 90      | 90   | 80 (@69)   | 0   | Flat    | Flat   | $68,459   | 0.0%    |
| flexible 100% | 40y          | 100   | 96       | 90      | 90   | 80 (@76)   | 0   | Flat    | Flat   | $88,785   | 0.0%    |

Longer accumulation lets a constant-$ saver derisk _earlier and deeper_ (more time for a smaller,
safer pile to still clear the floor → lower depletion: 26% → 1%). Flexible savers stay ~100%
regardless of accumulation length.

### 2d. Risk-aversion sensitivity (30y + 30y)

| Spending      | γ   | start | acc. avg | pre-ret | @ret | tent (age) | end | BEFORE  | AFTER  |
| ------------- | --- | ----- | -------- | ------- | ---- | ---------- | --- | ------- | ------ |
| constant $    | 2   | 100   | 68       | 40      | 40   | 40 (@65)   | 100 | Falling | Rising |
| constant $    | 4   | 100   | 68       | 40      | 50   | 40 (@66)   | 100 | Falling | Rising |
| constant $    | 8   | 100   | 69       | 40      | 40   | 40 (@65)   | 100 | Falling | Rising |
| flexible 100% | 2   | 100   | 100      | 100     | 100  | 100 (@65)  | 0   | Flat    | Flat   |
| flexible 100% | 4   | 100   | 99       | 90      | 90   | 80 (@69)   | 0   | Flat    | Flat   |
| flexible 100% | 8   | 100   | 82       | 60      | 60   | 50 (@68)   | 0   | Falling | Flat   |

The **constant-$ tent is invariant across risk aversion** (the sequence-risk dip is structural —
driven by the spending rule, not by taste). For flexible spending, only at γ = 8 does
consumption-volatility aversion pull the saver off the 100% corner.

### 2e. Shape value — is the glide actually worth anything? (out-of-sample)

Re-scored on an **independent** shock draw. CE = certainty-equivalent annual retirement
consumption. `opt ret / 100 acc` keeps the optimal retirement glide but forces flat 100% in
accumulation; `best flat` is the single constant weight that maximizes CE on the same independent
draw.

| Spending      | Ret. horizon | optimum | opt ret / 100% acc | flat 100% | best flat (w\*) | **glide vs best-flat** |
| ------------- | ------------ | ------- | ------------------ | --------- | --------------- | ---------------------- |
| constant $    | 30y          | $55,933 | $54,265            | $53,894   | $55,626 (60%)   | **+$307**              |
| constant $    | 40y          | $50,905 | $49,954            | $49,671   | $50,610 (70%)   | **+$295**              |
| constant $    | 50y          | $47,144 | $46,667            | $46,488   | $46,839 (80%)   | **+$305**              |
| semi-flex 50% | 30y          | $69,360 | $69,318            | $69,258   | $69,258 (100%)  | +$102                  |
| semi-flex 50% | 40y          | $65,273 | $65,044            | $64,791   | $64,941 (90%)   | +$332                  |
| semi-flex 50% | 50y          | $60,514 | $60,234            | $59,981   | $60,192 (90%)   | +$322                  |
| flexible 100% | 30y          | $68,405 | $68,385            | $68,279   | $68,279 (100%)  | +$126                  |
| flexible 100% | 40y          | $66,040 | $66,033            | $65,965   | $65,965 (100%)  | +$75                   |
| flexible 100% | 50y          | $64,039 | $64,042            | $64,019   | $64,019 (100%)  | ≈$0                    |

Two readings, both important:

- **The glide _shape_ is a rounding effect.** Over the best single flat weight it is worth
  **≤ ~$330/yr (~0.5%)**, and essentially nothing once spending is flexible. This is Estrada's
  "glidepath illusion."
- **The _level_ is not.** For constant-$, the optimum beats **flat 100%** by **$656–$2,039/yr**, and
  the optimal-retirement-glide-with-100%-accumulation is _worse_ than a flat 60% — i.e. **holding
  100% equity in accumulation is genuinely dominated** for a rigid-spending, no-bequest retiree. For
  flexible spending the best flat weight _is_ 100%, so there is nothing to gain anywhere.

---

## 3. Does this validate or reject ACO and ERN?

| Claim                                                    | Verdict under our iid model                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ACO:** ~100% equity, flat across life                  | **Validated — conditional on flexible spending** (or, as in ACO's utility, a bequest/terminal-wealth motive). When income moves with the market, flat ~100% is optimal here too, even on our smaller ~3.3pp premium. With _rigid_ spending and no bequest motive it is **not** optimal: a ~60–80% level with a derisking tent into retirement beats flat 100% by $650–$2,000/yr.                                                             |
| **ERN / Kitces–Pfau:** rising equity glide in retirement | **Validated as a shape, for constant-$ spending — and shown to be sequence-risk, not valuation.** The derisk-then-rise glide emerges under pure iid, so it needs no CAPE>20. _But_ ERN's specific claim — that the glide _raises the SWR_ — does **not** reproduce (§2a): under iid it only ties the best flat weight. That boost is the valuation-conditional slice an iid model cannot contain. |
| Both: beat the conventional **declining** (TDF) glide    | **Direction agreed, magnitude tiny.** A monotone-declining retirement glide is dominated in every cell — but the glide _shape_ is worth ≤ ~0.5% of CE. The spending rule and the equity _level_ dwarf it.                                                                                                                                                                                         |

### 3a. Reconciling our constant-$ profile with ACO's

ACO's constant-spending optimum stays **flat ~100% through accumulation** and dips only **at
retirement**; ours **falls through accumulation** to a tent at retirement. Same tent _location_,
different accumulation _approach_. The gap is not a method artifact — both are non-parametric,
per-age optima — it is the assumptions:

1. **Wasted upside vs catastrophic downside (no bequest + capped spending).** A constant-$ retiree
   with bequest weight 0 gets **zero** marginal utility from wealth above what funds the fixed floor
   (you can't spend it, you leave nothing), but **huge** negative utility from landing low
   (depletion). That asymmetry says: don't carry the fat right tail of a 100%-equity accumulation
   into retirement — derisk so the wealth you hand over is _tight_, not _high-mean_. ACO's utility
   still values terminal wealth, so the upside isn't wasted and 100% accumulation pays.
2. **Premium + mean reversion.** ACO's realized history carries a higher equity premium and
   multi-decade mean reversion, so a 100% accumulation almost always recovers in time — cheap
   insurance to stay aggressive. Our iid + ~3.3pp premium removes the recovery guarantee, so the
   sequence protection of derisking is worth more.

Both assumptions point the same way: a terminal-wealth/bequest motive (as in ACO) or a higher
premium would raise our accumulation path back toward ACO's flat 100%. This model has no bequest
motive (pure consumption), so within the tool **spending flexibility** is the switchable lever. The
robust, assumption-light conclusion is the one in §2e — for constant-$, hold a **moderate** level
and **derisk into retirement**; the precise curve is worth ~0.5%.

---

## 4. Caveats — what the iid research sweep (§2–§3) cannot see

The research sweep (§2–§3) used iid Monte Carlo; the web app and Python recommender now default to
**forward-block pooled**, which captures historical sequence structure (equity mean reversion, bond
persistence, single-country clustering). The caveats below apply to the §2–§3 iid results; the
forward-block default addresses the first two directly.

- **No valuation signal / no mean reversion (iid only).** The research sweep is by design iid, so
  it cannot reproduce ERN's _CAPE-conditional_ SWR boost. Forward-block preserves the empirical
  equity mean reversion from JST history (~VR(10y)≈0.91) and bond persistence (VR>1) in the
  bootstrap sequences.
- **One equity asset, our curve.** No domestic/international split, so ACO's ⅓/⅔ tilt and its
  diversification benefit are out of scope — we test only the _stock-vs-bond_ and _flat-vs-glide_
  axes, on a ~3.3pp premium deliberately lower than ACO's US-tilted history.
- **Fixed-horizon, no mortality, no bequest.** Cleaner "horizon" axis, but it omits longevity risk
  and survival-weighting; and bequest weight 0 is what drives the constant-$ accumulation derisking
  (§3a). A bequest motive pushes every cell toward higher equity.
- **End-of-horizon artifact.** With no bequest the optimizer collapses equity toward 0 in the final
  retirement years — reported as the `end` column and excluded from the `tent`. It is a property of
  a fixed terminal date, not real.
- **CRRA utility, fixed contributions, no taxes/fees, annual rebalancing, 10pp grid.** Standard
  simplifications. **Read shape direction and rough magnitude, not basis points** — with CE gains of
  tenths of a percent, do not over-read a 40% vs 50% retirement-date knot.

---

## 5. Recommender script

The same model is exposed as a one-call recommender —
[`analysis/glide_path/recommender.py`](../../analysis/glide_path/recommender.py),
`recommend_glide_path(...)` — that **optimizes** (does not look up) the allocation per chosen step
(`interval` = 1y, 5y, …) given your horizons, spending flexibility, guaranteed income, risk
aversion, and selected return mode (including an arbitrary return/vol curve under `iid-mc`). The
default return mode is `forward-block` with `dataset=pooled`. It varies equity against bonds. It
first finds a coordinate-ascent glide, then scores both that glide and the best single constant
allocation on an independent evaluation sample. It always returns the raw optimized glide as the
schedule, plus the robust constant comparator (`flat_equity_pct` / `flat_ce_income`) so callers
can recommend the flat path when it is materially better. It returns the per-step schedule plus
independent-evaluation CE income, income CV, and two depletion views: full-path depletion
(`depletion`), which includes pre-retirement market luck from today, and drawdown-only depletion
(`drawdown_depletion`), which starts from the deterministic expected retirement balance and matches
the `/retirement` headline semantics. It also returns the **best single constant allocation** — the
simpler alternative whose CE the glide path usually beats by only a hair (§2e) — and ships a
`plot_glide_path()` helper.

`python3 analysis/recommend_glide.py --demo` sweeps **each lever across all three spending
rules** under `iid-mc` — holding every other input at its default — and writes
`glide_<spending>_by_<lever>.png` (spending ∈ {`constant`, `semiflex`, `flexible`}; lever ∈
{`guaranteed`, `gamma`}) plus a `glide_by_spending.png` overview to
gitignored `analysis/artifacts/glide_path/demo/`. What each lever does — and how the
effect itself depends on the spending rule:

| Lever                 | Effect on the optimal glide (spending-dependent)                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spending** (`flex`) | rigid → deep retirement tent; flexible → flat ~100% (`glide_by_spending.png`).                                                                                                                                                                                |
| **Guaranteed income** | a bigger guaranteed floor lets the portfolio derisk → **deeper, lower tent**. $0 guaranteed income is a permanent zero-income bridge: CE becomes tail-dominated, so its allocation comparison is inconclusive rather than a valid "go for broke" result (§1). |
| **Risk aversion** (γ) | higher γ → lower equity / deeper tent — but mostly under **flexible/semi-flex** spending; the **constant-$ shape is ~γ-invariant** (its tent is driven by the rigid floor, not by taste).                                                                     |

The guaranteed-income panel is the concrete, dial-able form of the §3a reconciliation: for
constant-$ it moves the path between our "derisk" result and ACO's "flat ~100%."

**Additional dials** (beyond the demo matrix), all exposed on both the interactive prompt flow and
the `recommend_glide.py` flag CLI:

- **Guaranteed income amount.** `guaranteed_income` is the real annual dollar amount from CPP, OAS,
  DB pensions, and other income paid **every** retirement year. A pre-pension bridge is out of
  scope. A zero amount recreates the same zero-income state and makes the CE allocation comparison
  inconclusive (see §1).
- **Leverage.** `max_leverage` (1.0 = none; 1.5 = up to 150% equity) lets the optimizer borrow at a
  **real** `borrow_cost` to hold w>1 in the all-equity portfolio (real return `w·eq − (w−1)·borrow`,
  vol `w·eq_vol`; a wipeout is treated as ruin). It leverages only where the risk-adjusted gain beats
  the borrowing drag and survives the independent-evaluation CE guard — typically early accumulation
  under a low γ ("lifecycle investing"). Recommendations therefore use leverage less often than the
  raw coordinate-ascent path when the leveraged upside comes with a fragile left tail.
- **Retirement-consumption γ, by design.** Risk aversion is applied to retirement consumption, not
  directly to accumulation wealth. The user's chosen γ is their preference for _stable retirement
  spending_ — "how hard should the optimizer avoid low spending in bad market draws?" rather than
  "how much equity do you want?" — and may differ from their general investment risk appetite today.
  Higher γ penalizes low retirement-spending outcomes more heavily across simulated market scenarios.
  It is distinct from spending flexibility, which sets how spending _responds_ to portfolio value.
  Accumulation wealth carries no direct utility, but γ still pins down the accumulation glide through
  how that wealth becomes retirement spending; the _declining_ glide also emerges from the
  contribution stream + horizon (human capital). A separate accumulation γ has almost no leverage,
  and a γ(age) gradient would double-count the age–risk relationship the optimizer already produces —
  so neither is offered.
  - _Typical values._ γ = 1 is log utility (aggressive); the literature's plausible band is ~1–10
    with **2–5 the realistic center** (the ~30–40 needed to rationalize historical equity premia is
    the "equity premium puzzle" precisely because it is implausible). The recommender and §2
    analysis sweeps use 4 as the base case. γ's effect on the glide is **spending-rule
    dependent**: under flexible spending a higher γ pulls equity down, but the **constant-$ tent is
    ~γ-invariant** (§2d) because the rigid floor — not taste — drives that shape.
- **β front-loads retirement spending; it discounts retirement years, not years from today.** The
  first retirement year has weight 1, and each subsequent retirement year has β times the previous
  year's weight (`disc[t] = β^t`, length = retirement years; accumulation is undiscounted). A β of 1
  weights every retirement year equally; lower β tilts the optimizer toward funding _earlier, more
  active_ retirement years over later ones. Over 30 years, β of 1, 0.985, and 0.97 give the final
  year about **100%, 65%, and 41%** of the first year's weight.
  - _Typical values._ The default **0.985** ≈ 1.5%/yr — close to the empirical "retirement spending
    smile" (real spending drifts down ~1%/yr in mid-retirement, ≈ β 0.99). **0.97** ≈ 3%/yr is a
    strong early-years tilt; **0.95** ≈ 5%/yr (final-year weight ~23% over 30y) is a _very_ strong
    front-load and atypical; the floor is 0.90. The model has **no separate survival/mortality
    weighting**, so part of any β < 1 a household picks legitimately stands in for declining survival
    probability — the realistic "neutral" point sits a little below 1.0, not exactly at it.

## 6. Reproduce

```bash
python3 -m analysis.glide_path.research             # the analysis (tables + figures), ≈ 5 min
python3 -m analysis.glide_path.recommender          # interactive: prompts for your inputs
python3 analysis/recommend_glide.py --demo          # recommender showcase: 3×2 lever matrix + overview, ≈ 2 min
python3 analysis/recommend_glide.py --help          # scriptable flag CLI for a single custom recommendation

# Regenerate the pre-rescaled JST bundle used by the web app's forward-block engine
python3 -m analysis.glide_path.generate_bundle      # writes src/utils/glide-path/jstData.ts
```

After an interactive run, the recommender prints a copy-pasteable `analysis/recommend_glide.py`
command containing the resolved inputs. The flag CLI exposes the interactive optimizer settings,
including `--beta` and `--paths`, so that command reruns the same simulation and is easy to modify.

Tweak `analysis/glide_path/research.py`'s CONFIG block: `SPENDING_REGIMES` (FLEX levels), `RETIRE_HORIZONS`,
`ACCUM_HORIZONS`, `GAMMA`, `WITHDRAWAL_RATE`, `GRID_STEP`, `OPT_N`/`N_FINAL`/`OPT_PASSES`.
Returns/vol come straight from the `ALLOC_ANCHORS` mirror of
[`presets.ts`](../../src/utils/retirement/presets.ts) — change them there (and here) together. Runtime
≈ 5 min (the per-age coordinate ascent is the cost).

## References

- ACO — Anarkulova, Cederburg, O'Doherty, _Beyond the Status Quo_ (SSRN 4590406).
- ERN — earlyretirementnow.com, SWR Series Part 20 (equity glidepaths).
- Kitces & Pfau (2014) — _Reducing Retirement Risk with a Rising Equity Glide Path_ (the bond tent).
- Estrada (2014) — _The Glidepath Illusion_ (glide shape adds little once the level is set).
- [`retirement` SWR methodology](../retirement/swr-methodology.md) — the CMAs, the iid/AR(1)
  decision, and the JST historical cross-check this note builds on.
