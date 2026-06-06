# Retirement SWR — Methodology & Calibration Notes

Developer reference for the **When can I retire?** tool (`/retirement`). Explains how the
Monte Carlo engine works, where the return assumptions come from, why the long-horizon safe
withdrawal rate (SWR) looks low, and the empirical work behind the `RETURN_AUTOCORRELATION = 0`
decision. Read this before "fixing" a SWR that seems too low.

Engine: [`src/utils/retirement/monteCarlo.ts`](../src/utils/retirement/monteCarlo.ts).
Presets: [`src/utils/retirement/presets.ts`](../src/utils/retirement/presets.ts).
Validation prototype: [`analysis/jst_swr_bootstrap.py`](../analysis/jst_swr_bootstrap.py).

---

## TL;DR

- The long-horizon SWR (~2.6% at 50y for 60/40) is **low because the return assumption is
  modest, not because the risk model is harsh.** This is correct, not a bug.
- Return presets come from **PWL Capital** (corroborated by **FP Canada** planning guidelines).
  They are mainstream Canadian forward estimates — **not conservative**.
- The US "4% rule" / ~3.2% long-horizon _floor_ is a **US-exceptionalism
  artifact** (US real returns ~6%, geo ~5.4%). It does not transfer to Canadian forward CMAs.
- We **removed the `−0.2` AR(1) mean-reversion** (now `0`, i.e. iid). It had been added to match
  Morningstar's 30y number, but 150 years of global history shows real returns have _at least_
  as much long-horizon dispersion as iid, so a variance-reducing φ<0 was unjustified optimism
  (~0.2pp).
- **If asked to lift the long-horizon SWR, the lever is the return assumption — not the risk
  model.** Inflating returns to chase the US floor is not recommended.

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
[`Assumptions.tsx`](../src/components/retirement/Assumptions.tsx)). Cross-checked against
**FP Canada Projection Assumption Guidelines 2025/26**: inflation 2.1%, fixed income ~3.2–3.4%,
equities ~6.3–6.6% nominal CAD. The presets are at or slightly above these — **not conservative.**

---

## 2. Why the long-horizon SWR is "low" (and correct)

SWR @ 90%, 60/40, current engine (φ = 0, iid):

| Horizon | 20y   | 30y   | 40y   | 50y    |
| ------- | ----- | ----- | ----- | ------ |
| SWR     | 5.07% | 3.67% | 3.02% | ~2.61% |

This is **entirely a consequence of the ~3.5% real return assumption.** At ~3.5% real, the
median retiree barely grows the portfolio while withdrawing, so longer horizons keep biting.
The US 4%-rule floor (~3.7% even at 50y) assumes **US real returns of ~6%** (geo 5.4%) — the
luckiest equity century on record — which Canadian forward CMAs explicitly do not project.

**For a typical retirement (retire 60–65, plan to 95 ⇒ 30–35y horizon) the SWR is 3.3–3.7%,
which is reasonable.** Sub-3% appears only at 45–50y horizons (retiring at 45–50), where
caution is appropriate.

---

## 3. The `RETURN_AUTOCORRELATION` decision (−0.2 → 0)

`RETURN_AUTOCORRELATION` is the AR(1) coefficient on the annual return deviation.

- **Was −0.2** (mean reversion: an above-average year tends to be followed by a below-average
  one). Variance ratio (1+φ)/(1−φ) ≈ 0.67 ⇒ ~⅓ less multi-year dispersion ⇒ higher SWR. It had
  been tuned to land the 30y number near Morningstar.
- **Now 0** (iid). The AR(1) machinery remains (just zeroed) so a _separately justified_ view
  could be reintroduced by changing one constant.

**Why we dropped it:** global return history (§4) shows real returns have **at least as much**
long-horizon dispersion as iid — crashes and high-inflation decades _cluster_ (positive, not
negative, effective serial dependence at long horizons). So a variance-_reducing_ φ<0 points
the wrong way empirically; it was quietly inflating the SWR ~0.2pp. iid is the industry default
and is, if anything, still mildly optimistic vs real sequencing — so do **not** go above 0.

Cost of the change (60/40): 30y 3.89→3.67%, 40y 3.23→3.02%, 50y 2.83→~2.61%.

---

## 4. Empirical validation — JST Macrohistory

Prototype: [`analysis/jst_swr_bootstrap.py`](../analysis/jst_swr_bootstrap.py) (Python; pandas +
numpy + openpyxl). Auto-downloads the **Jordà–Schularick–Taylor "Rate of Return on Everything"**
dataset (R6, 1870–2020, 16 advanced economies, equity + bond + CPI) to a gitignored
`analysis/.data/`. Builds real 60/40 total returns and computes SWR two ways:

- **Overlapping actual sequences** (cFIREsim/FIRECalc style) — preserves the full multi-decade
  path, including long-run mean reversion.
- **Circular block bootstrap** — stitches consecutive-year blocks; preserves only within-block
  (≤ block_len) dependence.

### Key results (60/40, 90%)

| Method / universe                                            | 30y   | 40y   | 50y    |
| ------------------------------------------------------------ | ----- | ----- | ------ |
| **USA, overlapping**                                         | 4.54% | 4.08% | 3.74%  |
| **World (eq-wt 16c), overlapping**                           | 3.77% | 3.20% | 2.83%  |
| World, block bootstrap (bl=8)                                | 3.72% | 3.17% | 2.90%  |
| World, re-centered to **3.5% real / 8.79% vol**, overlapping | 3.25% | 2.60% | 2.19%  |
| **App parametric (φ=0)**                                     | 3.67% | 3.02% | ~2.61% |

Real-return context: USA mean 6.19% / vol 12.1% / **geo 5.47%**; World mean 5.14% / vol 9.6% /
**geo 4.69%**; app preset ~3.5% / 8.79% / geo ~3.1%.

### What it taught us

1. **The US floor is US-exceptionalism.** USA overlapping floors ~3.7% at 50y and matches the
   literature; dropping US bias (World) costs ~0.9pp at every horizon.
2. **At the app's own 3.5%-real assumption, real historical sequencing gives ~3.3%/2.6%/2.2%
   (30/40/50y)** — _lower_ than the app's parametric output. So the parametric model is, if
   anything, slightly generous; it is not too harsh.
3. **Block bootstrap destroys the multi-decade mean reversion** that creates the empirical
   floor (it only keeps within-block dependence) — so it does not reliably reproduce the floor
   and can fall below iid. The floor is a property of _actual realized long paths_; reshuffling
   breaks it. Use the **overlapping** method to see the true historical floor.
4. **Diversification matters:** single-country real-return vol is ~15.5% (war/hyperinflation
   tails: Germany/Japan worst years −80% to −90%); an equal-weight world aggregate is ~9.6%.

---

## 5. Sensitivity — what raising returns would do (Path B)

SWR @ 90%, 60/40, vol 8.79%, by assumed real return:

| Real return             | 20y   | 30y   | 40y   | 50y   |
| ----------------------- | ----- | ----- | ----- | ----- |
| **3.5% (current, φ=0)** | 5.06% | 3.66% | 2.99% | 2.61% |
| 4.0%                    | 5.30% | 3.91% | 3.26% | 2.89% |
| 4.5%                    | 5.54% | 4.17% | 3.54% | 3.20% |
| 5.0%                    | 5.82% | 4.47% | 3.86% | 3.52% |

To get the **50y SWR to ~3.2%** you need **~4.5% real**, which (bonds fixed at 3.5% nominal)
implies **equities ~8.8% nominal** — well above PWL/FP Canada (~6.3–6.8%). That means overriding
the Canadian CMA anchor with US-like numbers. **Not recommended.** The honest position: keep the
CMAs, accept the long-horizon SWR they imply.

---

## 6. UI — the technical note

[`SwrTechnicalNote.tsx`](../src/components/retirement/SwrTechnicalNote.tsx) renders a
"Why this figure?" link beside the headline SWR (in
[`InputForm.tsx`](../src/components/retirement/InputForm.tsx), Plan-confidence section). The
modal explains the two reasons the rate is below the 4% rule and shows a **live** SWR table by
allocation (`SWR_TABLE_ALLOCATIONS`) × horizon (`SWR_TABLE_HORIZONS`), computed via
`safeWithdrawalRate` at the user's current confidence. That table is a _pure-portfolio_ benchmark
(excludes CPP/OAS/pension), so it intentionally differs from the blended headline figure.

---

## 7. Guidance for future changes

- **Don't chase the US 4%/3.2% floor by inflating returns.** It would abandon the Canadian CMA
  anchor that makes the tool credible. The low long-horizon SWR is the honest output.
- **Keep `RETURN_AUTOCORRELATION = 0`** unless you have a _separately justified, disclosed_
  mean-reversion view (and remember real data argues the effect is the wrong sign at long
  horizons). Do not re-introduce it to backfill a target number.
- To revisit the empirical basis, re-run `analysis/jst_swr_bootstrap.py` (tweak the CONFIG block:
  allocation, method, block length, `RECENTER` to a target mean/vol).

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
