# Retirement SWR — Methodology & Calibration Notes

Developer reference for the **When can I retire?** tool (`/retirement`). Explains how the
Monte Carlo engine works, where the return assumptions come from, why the long-horizon safe
withdrawal rate (SWR) looks low, and the empirical work behind the `RETURN_AUTOCORRELATION = 0`
decision. Read this before "fixing" a SWR that seems too low.

Engine: [`src/utils/retirement/monteCarlo.ts`](../../src/utils/retirement/monteCarlo.ts).
Presets: [`src/utils/retirement/presets.ts`](../../src/utils/retirement/presets.ts).
Validation prototype:
[`analysis/retirement/jst_swr_bootstrap.py`](../../analysis/retirement/jst_swr_bootstrap.py).

## Contents

1. [How the engine works](#1-how-the-engine-works)
2. [Why the long-horizon SWR is low](#2-why-the-long-horizon-swr-is-low-and-correct)
3. [The autocorrelation decision](#3-the-return_autocorrelation-decision)
4. [JST empirical validation — full factorial](#4-empirical-validation--jst-macrohistory-full-factorial)
5. [Return-assumption sensitivity](#5-sensitivity--what-raising-returns-would-do-path-b)
6. [UI technical note](#6-ui--the-technical-note)
7. [Guidance for future changes](#7-guidance-for-future-changes)

---

## TL;DR

- The long-horizon SWR (~2.4% at 50y for 60/40) is **low because the return assumption is
  modest, not because the risk model is harsh.** This is correct, not a bug.
- Return presets come from **PWL Capital** (corroborated by **FP Canada** planning guidelines).
  They are mainstream Canadian forward estimates — **not conservative**.
- The US "4% rule" / ~3.7% long-horizon floor is a **US-exceptionalism artifact**
  (US real returns ~6%, geo ~5.4%). It does not transfer to Canadian forward CMAs.
- `RETURN_AUTOCORRELATION = 0` (iid) is confirmed correct: forward-calibrated historical
  sequencing (pooled forward-block) gives SWRs within ~0.1–0.2pp of the app's parametric
  output — not materially different in either direction.
- **If asked to lift the long-horizon SWR, the lever is the return assumption — not the
  risk model.** Inflating returns to chase the US floor is not recommended.

---

## 1. How the engine works

A two-phase, real-dollar (inflation-adjusted) Monte Carlo:

- **Accumulation** (`accumulationBalances`): deterministic, grows start savings at the
  accumulation mean real return plus annual contributions.
- **Drawdown** (`simulate`): stochastic. Starting from the balance at a candidate retirement
  age, each year draws a real return `r = mean + deviation`, withdraws the income gap
  (target − guaranteed/pension), and absorbs at zero if depleted. Withdrawals are mid-year
  (earn a half-year of return), matching the rent-vs-buy convention.
- **Feasibility** (`computeRetirement`): the earliest age whose drawdown sim clears the user's
  target success rate (e.g. 90%).
- **Headline SWR** (`computePlanSWR`): portfolio withdrawal ÷ required wealth at the chosen age.
- **Reference SWR** (`safeWithdrawalRate`): pure-portfolio SWR for a given mean/vol/horizon —
  powers the technical-note table; independent of the user's savings/pension.

Returns are **normal (arithmetic)** around the phase mean; compounding produces the usual
volatility drag (geometric ≈ arithmetic − σ²/2). Fixed PRNG seed ⇒ deterministic output.

### Return / volatility presets (real, derived from nominal − inflation)

| Mix                        | Nominal return | Volatility | Real arith. | Real geo. |
| -------------------------- | -------------- | ---------- | ----------- | --------- |
| 100/0                      | 6.87%          | 12.57%     | ~4.7%       | ~3.9%     |
| 80/20                      | 6.29%          | 10.62%     | ~4.1%       | ~3.5%     |
| **60/40 (retire default)** | **5.67%**      | **8.79%**  | **~3.5%**   | **~3.1%** |
| 40/60                      | 5.01%          | 7.17%      | ~2.8%       | ~2.6%     |

Inflation 2.1%. Source: **PWL Capital** capital-market assumptions (linked in
[`Assumptions.tsx`](../../src/components/retirement/Assumptions.tsx)). Cross-checked against
**FP Canada Projection Assumption Guidelines 2025/26**: inflation 2.1%, fixed income ~3.2–3.4%,
equities ~6.3–6.6% nominal CAD. The presets are at or slightly above these — **not conservative.**

---

## 2. Why the long-horizon SWR is "low" (and correct)

SWR @ 90%, 60/40, current engine (φ = 0, iid):

| Horizon | 20y   | 30y   | 40y   | 50y    |
| ------- | ----- | ----- | ----- | ------ |
| SWR     | 4.80% | 3.44% | 2.77% | ~2.36% |

This is **entirely a consequence of the ~3.5% real return assumption.** At ~3.5% real, the
median retiree barely grows the portfolio while withdrawing, so longer horizons keep biting.
The US 4%-rule floor (~3.7% even at 50y) assumes **US real returns of ~6%** (geo 5.4%) — the
luckiest equity century on record — which Canadian forward CMAs explicitly do not project.

**For a typical retirement (retire 60–65, plan to 95 ⇒ 30–35y horizon) the SWR is ~3.0–3.4%,
which is reasonable.** Sub-2.5% appears only at 45–50y horizons (retiring at 45–50), where
caution is appropriate.

---

## 3. The `RETURN_AUTOCORRELATION` decision

`RETURN_AUTOCORRELATION` is the AR(1) coefficient on the annual return deviation.

- **Was −0.2** (mean reversion). Variance ratio (1+φ)/(1−φ) ≈ 0.67 ⇒ ~⅓ less multi-year
  dispersion ⇒ higher SWR. Had been tuned to land the 30y number near Morningstar.
- **Now 0** (iid). The AR(1) machinery remains (just zeroed) so a separately justified view
  could be reintroduced by changing one constant.
- **The −0.05 candidate (from equity VR diagnostics)**: the JST variance-ratio analysis
  (see glide-path methodology) gives equity VR(10y) ≈ 0.91, implying a lag-1 autocorrelation
  of about −0.05. However, adding ρ = −0.05 barely moves the SWR or optimal allocation in
  practice, and the bond side has *positive* persistence (VR > 1) which cannot be handled by
  the same scalar AR(1). The empirically grounded answer is to use the historical block
  bootstrap (§4), not to approximate the joint dynamics parametrically.

**Why we keep it at zero:** the full factorial (§4) shows that forward-calibrated historical
sequencing (§G, pooled forward-block) gives SWRs within ~0.1–0.2pp of the app's iid estimate
(§H), not systematically above or below. There is no direction-stable evidence that a non-zero
AR(1) would improve accuracy.

---

## 4. Empirical validation — JST Macrohistory full factorial

Prototype: [`analysis/retirement/jst_swr_bootstrap.py`](../../analysis/retirement/jst_swr_bootstrap.py).
Auto-downloads **Jordà–Schularick–Taylor R6** (1870–2020, 18 economies in database, 16 with
equity+bond series — Canada and Ireland have no return data in R6) to a gitignored
`analysis/.data/`. Uses the same segment-aware block infrastructure built for the glide-path
research (`analysis/shared/jst_history.py`).

The script tests the **marginals × sequencing × dataset factorial** that mirrors the
glide-path research:

| | Marginals: historical | Marginals: forward-CMA |
|---|---|---|
| **Sequencing: none** | overlapping windows (§A/B/D) | iid parametric (§H) |
| **Sequencing: block** | block bootstrap (§C/E) | forward-block (§F/G) |
| | world=§B/C &nbsp; pooled=§D/E | world=§F &nbsp; pooled=§G |

Forward-CMA anchors (real): equity 4.67%/12.57%, bonds 1.42%/5.38%.

### Return statistics

| Series | Mean | Vol | Geo |
|---|---|---|---|
| USA (149 yrs) | 6.19% | 12.10% | 5.47% |
| World eq-wt (150 yrs) | 5.14% | 9.61% | 4.69% |
| Pooled single-country (2212 obs) | 5.04% | 15.44% | 3.79% |
| World fwd-rescaled | 3.37% | 8.57% | 3.01% |
| Pooled fwd-rescaled | 3.37% | 8.43% | 3.02% |
| App CMA iid | 3.37% | 9.69% | — |

### SWR results @ 90%, 60/40, block = 10y

| Horizon | §A USA | §B Wld-OL | §C Wld-Blk | §D Pool-OL | §E Pool-Blk | §F Wld-FwdBlk | §G Pool-FwdBlk | §H App iid |
|---|---|---|---|---|---|---|---|---|
| 20y | 5.39% | 4.95% | 5.00% | 3.41% | 3.91% | 4.60% | 4.98% | 4.80% |
| 25y | 4.85% | 4.16% | 4.29% | 2.64% | 3.07% | 3.78% | 4.13% | 3.97% |
| 30y | 4.54% | 3.77% | 3.78% | 2.18% | 2.47% | 3.29% | 3.57% | 3.44% |
| 35y | 4.28% | 3.43% | 3.48% | 1.82% | 2.14% | 2.95% | 3.15% | 3.05% |
| 40y | 4.08% | 3.20% | 3.22% | 1.59% | 1.94% | 2.68% | 2.89% | 2.77% |
| 45y | 3.90% | 2.98% | 3.05% | 1.33% | 1.69% | 2.46% | 2.65% | 2.55% |
| 50y | 3.74% | 2.83% | 2.95% | 1.20% | 1.61% | 2.31% | 2.49% | 2.36% |

### What the factorial teaches

**1. §B vs §C — block bootstrap (10y) now tracks overlapping on world series.**
At 30y: 3.77% vs 3.78%. The old study used 8y blocks and found block bootstrap fell below
iid. With 10y blocks the block bootstrap captures enough of the within-country mean reversion
cycle to reproduce the overlapping floor. The old "block bootstrap destroys the floor"
conclusion was block-length dependent; it no longer holds at 10y.

**2. §D — raw pooled overlapping gives catastrophically low SWRs.**
At 30y: 2.18% (vs 3.77% world). Within-segment windows include Germany's 1914–1943 sequence,
Japan's 1940s, UK's 1970s stagflation — periods where a single-country retiree with 60/40
was wiped out. This is real historical evidence that retirement risk is severe for
undiversified single-country investors. It is not directly applicable to a globally diversified
Canadian investor, but it sets the lower bound.

**3. §E — pooled block bootstrap also much lower than world.**
At 30y: 2.47%. Single-country sequence risk survives block resampling; the disaster structure
is not in the precise year ordering but in the clustering of bad years within a country-decade.

**4. §F — world forward-block falls below world overlapping.**
At 30y: 3.29% vs 3.77%. Rescaling the world series down to forward-CMA levels (mean 4.69%→3.37%
geo) reduces the SWR. The world overlapping floor relied partly on high historical world returns
(geo 4.69%); at the app's more modest 3.1% real geo, the floor is lower.

**5. §G vs §H — the key comparison: forward sequencing ≈ iid.**
At 30y: 3.57% (§G, pooled fwd-block) vs 3.44% (§H, app iid). §G is 0.1–0.2pp *above* app iid
across all horizons. The forward-calibrated historical sequencing (which preserves equity mean
reversion and moderate bond persistence from single-country sequences) is slightly more
favorable than iid — confirming that `RETURN_AUTOCORRELATION = 0` is appropriate and slightly
conservative, not optimistic.

**6. §G > §F — pooled forward-block gives higher SWR than world forward-block.**
At 30y: 3.57% vs 3.29%. Same forward-CMA marginals; difference is sequencing. The world series
has stronger bond persistence (VR up to ~3.8) — sustained inflation epochs that hit the bond
leg of the portfolio hard and don't recover within the block horizon. Pooled sequences have
weaker bond persistence (VR ~1.7) and stronger within-country equity mean reversion — a more
favorable long-run sequence structure for a 60/40 retiree.

**7. §A — US exceptionalism.**
At 30y: 4.54%. Matches the literature's "4% rule" at 30y. The ~0.8pp premium over the world
average is entirely explained by the US's higher historical real returns (geo 5.47% vs 4.69%).
Canadian forward CMAs do not project returns at this level.

### Summary interpretation

The empirically honest range for a diversified, forward-looking Canadian retiree (60/40, 90%,
30y) is **3.3–3.6%** (§F–§G), bracketed below by raw pooled history (§E, 2.47%) and above by
US history (§A, 4.54%). The app's parametric iid output of **3.44%** sits comfortably within
this range and is slightly conservative relative to pooled forward-block (3.57%). Using iid is
well-justified.

---

## 5. Sensitivity — what raising returns would do (Path B)

SWR @ 90%, 60/40, vol 8.79%, by assumed real return:

| Real return             | 20y   | 30y   | 40y   | 50y   |
| ----------------------- | ----- | ----- | ----- | ----- |
| **3.5% (current, φ=0)** | 4.80% | 3.44% | 2.77% | 2.36% |
| 4.0%                    | 5.05% | 3.70% | 3.03% | 2.63% |
| 4.5%                    | 5.30% | 3.97% | 3.31% | 2.91% |
| 5.0%                    | 5.57% | 4.26% | 3.61% | 3.23% |

To get the **50y SWR to ~3.2%** you need **~5% real** — well above the PWL/FP Canada anchor
(~3.5% real for 60/40). That means adopting US-like return assumptions. **Not recommended.**
The honest position: keep the CMAs, accept the long-horizon SWR they imply.

---

## 6. UI — the technical note

[`SwrTechnicalNote.tsx`](../../src/components/retirement/SwrTechnicalNote.tsx) renders a
"Why this figure?" link beside the headline SWR (in
[`InputForm.tsx`](../../src/components/retirement/InputForm.tsx), Plan-confidence section). The
modal explains the two reasons the rate is below the 4% rule and shows a **live** SWR table by
allocation (`SWR_TABLE_ALLOCATIONS`) × horizon (`SWR_TABLE_HORIZONS`), computed via
`safeWithdrawalRate` at the user's current confidence. That table is a _pure-portfolio_ benchmark
(excludes CPP/OAS/pension), so it intentionally differs from the blended headline figure.

---

## 7. Guidance for future changes

- **Don't chase the US 4%/3.7% floor by inflating returns.** It would abandon the Canadian CMA
  anchor. The low long-horizon SWR is the honest output.
- **Keep `RETURN_AUTOCORRELATION = 0`.** The full factorial (§4) confirms iid is slightly
  conservative relative to forward-calibrated historical sequencing (§G, 3.57% at 30y vs iid
  3.44%). Adding ρ = −0.05 does not materially change the SWR and the bond side has the
  opposite sign (positive persistence). Use the historical bootstrap modes for research, not
  the parametric engine.
- To revisit the empirical basis, re-run `python3 -m analysis.retirement.jst_swr_bootstrap`
  (tweak the CONFIG block: allocation, `TARGET`, `BLOCK_YEARS`, `HORIZONS`).

---

## References

- **PWL Capital** — financial-planning return assumptions (market-cap-weighted portfolio).
- **FP Canada / Institute of Financial Planning** — Projection Assumption Guidelines 2025/26.
- **Jordà, Knoll, Kuvshinov, Schularick, Taylor (2019)** — "The Rate of Return on Everything,
  1870–2015," _QJE_ 134(3). Data: <https://www.macrohistory.net/database/>.
- **Morningstar** — "What's a Safe Retirement Withdrawal Rate?" (annual; Blanchett et al.).
- **Kitces** — Monte Carlo vs. rolling historical returns / sequence-of-returns risk.
- **Vanguard VCMM** — valuation-conditioned forward returns (an example of intra-sim mean
  reversion; sophisticated but contested).
