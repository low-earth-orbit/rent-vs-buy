#!/usr/bin/env python3
"""
Glide-path RECOMMENDER — optimizes the equity weight at each step by Monte Carlo.

Given a household's horizons, spending flexibility, pension level, and a capital-market
curve (equity weight → expected return + volatility), this returns the welfare-maximizing
equity weight at each step of a chosen interval (1y, 5y, …) across accumulation and
retirement. The path is found by SIMULATION (per-interval coordinate ascent on iid Monte
Carlo, under common random numbers), not from any hard-coded table or fitted formula — so
it adapts to whatever returns/vols, pension, and flexibility you feed it.

It is the productized form of the analysis in `docs/glidepath-analysis.md`
(`analysis/glidepath_utility_mc.py`): same model (real dollars, arithmetic-normal returns,
mid-year cash flow, absorbing-at-zero, CRRA utility), exposed as one function.

KEY INPUTS
----------
  accum_years, retire_years : lengths of the two phases (retirement is a fixed planning horizon).
  flexibility               : spending rule in [0,1]. 0 = constant real $ (rigid floor),
                              1 = fully flexible (spend `withdrawal_rate` of the live balance),
                              0.5 = half-and-half. Blends the two targets proportionally each year.
  withdrawal_rate           : the flexible-spending fraction of the live balance (used only when
                              flexibility > 0). E.g. 0.04 = spend 4% of current balance per year.
  pension_level             : guaranteed real income in retirement, as a FRACTION OF
                              `pre_retirement_income` (e.g. 0.0, 0.2, 0.5 — matches the web app's
                              currentIncome base). Acts like a bond you own outside the portfolio:
                              the higher it is, the less the portfolio must derisk.
  pre_retirement_income     : the household's real pre-retirement gross income (dollars); the base
                              for `pension_level`. Default 100k.
  pension_delay_years       : years into retirement before the pension starts (a "bridge"). 0 =
                              starts at retirement. e.g. retire at 55 with CPP/OAS at 65 → 10.
                              During the bridge the portfolio funds the FULL target income; after,
                              only the remaining gap.
  target_income             : the household's real annual spending target in retirement (dollars).
                              "Retirement expenses" for the bequest unit below.
  annual_contribution       : real annual savings added during accumulation (dollars).
  current_savings           : portfolio balance at the start of accumulation (dollars).
  alloc_curve               : the capital-market assumptions, as anchors
                              [(equity_weight, mean_return, volatility), …] spanning w∈[0,1].
                              Interpolated to any weight. Units controlled by `returns_in_percent`
                              and deflated to real with `inflation`.
  inflation                 : annual inflation rate used to convert nominal returns to real.
                              Must match the units of `alloc_curve` (default: percent, i.e. 2.1).
  returns_in_percent        : if True (default), `alloc_curve` means/vols are in % per year.
  max_leverage              : cap on the equity weight. 1.0 = no leverage (default); 1.5 = the
                              optimizer may borrow to hold up to 150% equity. A weight w>1 borrows
                              (w−1) at `borrow_cost` to hold w in the all-equity portfolio, so its
                              real return is w·eq − (w−1)·borrow and its vol scales as w·eq_vol. A
                              leveraged wipeout is treated as ruin (balance floored at 0).
  borrow_cost               : the REAL annual cost of borrowing (same units as the curve, e.g.
                              2.0 = 2% real). Only matters when `max_leverage` > 1. Higher cost ⇒
                              the optimizer leverages less. The optimizer leverages only where the
                              risk-adjusted gain beats the borrowing drag — typically early
                              accumulation under a low γ ("lifecycle investing"); it avoids leverage
                              in retirement where sequence risk dominates.
  interval                  : years per glide step (1 = per-age, 5 = change allocation every 5y…).
                              Equity weight is held constant within each interval block.
  gamma                     : CRRA risk aversion — a SINGLE value for the whole life. Higher = more
                              averse to consumption swings → lower equity. 1 ≈ log, 3 = base (default),
                              8 = very cautious. There is deliberately no separate accumulation γ:
                              the *declining* glide already emerges from the contribution stream +
                              horizon (the human-capital effect), and your consumption risk aversion
                              pins down the accumulation glide through how wealth becomes spending —
                              so a distinct accumulation γ has almost no leverage and a γ(age) gradient
                              would double-count the age–risk relationship the optimizer produces.
  beta                      : annual time-discount factor (default 0.985 → ~1.5% time preference).
                              Values near 1 = patient; near 0.95 = heavily discounts distant years.
  bequest                   : raw warm-glow weight (advanced). 0 = pure consumption. Prefer
                              `bequest_years` below; this is the unscaled lever it calibrates.
  bequest_years             : target median estate expressed in YEARS of retirement spending
                              (estate ≈ bequest_years × target_income). The engine calibrates the
                              raw `bequest` weight to hit it. NOTE: the motive can only *raise* the
                              estate (via more equity); a target at/below what your spending plan
                              already leaves needs no motive (weight 0), and very large targets may
                              be unreachable — `bequest_target_reached` in the output flags this.
  bequest_floor             : small additive constant inside the bequest CRRA term to prevent
                              utility blowup when the terminal portfolio is near zero (default $10k).

USAGE
-----
  from glide_path_recommender import recommend_glide_path
  rec = recommend_glide_path(accum_years=30, retire_years=30, flexibility=0.0,
                             pension_level=0.2, alloc_curve=PWL_CURVE, interval=1)
  print(rec["schedule"])

Run this file directly for a worked demo:  python3 analysis/glide_path_recommender.py
Requires numpy.
"""

from __future__ import annotations

import math
from typing import Sequence

import numpy as np

# Example curve: the app's PWL/FP-Canada allocation table (presets.ts), nominal % + 2.1% inflation.
PWL_CURVE = [
    (1.00, 6.87, 12.57), (0.90, 6.59, 11.59), (0.80, 6.29, 10.62),
    (0.70, 5.99, 9.68), (0.60, 5.67, 8.79), (0.50, 5.35, 7.94),
    (0.40, 5.01, 7.17), (0.30, 4.66, 6.49), (0.20, 4.30, 5.94),
    (0.10, 3.93, 5.56), (0.00, 3.55, 5.38),
]


# ── utility ─────────────────────────────────────────────────────────────────--

# Numerical floor shared by _crra and the depletion test in _stats. Prevents
# log(0)/division blowup; not a real-world consumption floor assumption.
# All values are in real dollars, so $1 is effectively zero consumption.
_FLOOR = 1.0


def _crra(c, gamma):
    c = np.maximum(c, _FLOOR)
    if abs(gamma - 1.0) < 1e-9:
        return np.log(c)
    return c ** (1.0 - gamma) / (1.0 - gamma)


def _ce_from_util(util_per_period, gamma):
    if abs(gamma - 1.0) < 1e-9:
        return float(np.exp(util_per_period))
    return float(((1.0 - gamma) * util_per_period) ** (1.0 / (1.0 - gamma)))


def _build_alloc(alloc_curve, inflation, returns_in_percent, borrow_cost=0.0):
    """Return alloc(w)->(real_mean, vol) interpolating the curve. Accepts any-shape w.

    For w > 1 (leverage), borrow (w-1) at the REAL `borrow_cost` to hold w in the all-equity
    portfolio: real_mean = w·eq_mean − (w−1)·borrow, vol = w·eq_vol. `borrow_cost` is already
    real (the user's real cost of borrowing); only its unit is scaled to a fraction."""
    arr = sorted(((float(w), float(m), float(v)) for w, m, v in alloc_curve), key=lambda t: t[0])
    cw = np.array([t[0] for t in arr])
    cm = np.array([t[1] for t in arr])
    cv = np.array([t[2] for t in arr])
    scale = 100.0 if returns_in_percent else 1.0
    infl = inflation / scale
    real_mean = (1.0 + cm / scale) / (1.0 + infl) - 1.0   # deflate nominal mean to real
    vol = cv / scale
    borrow_real = borrow_cost / scale
    eq_mean = float(np.interp(1.0, cw, real_mean))        # 100%-equity anchor (what we lever)
    eq_vol = float(np.interp(1.0, cw, vol))

    def alloc(w):
        w = np.asarray(w, dtype=float)
        wc = np.minimum(w, 1.0)                            # curve portion (interpolated)
        m = np.interp(wc.ravel(), cw, real_mean).reshape(w.shape)
        s = np.interp(wc.ravel(), cw, vol).reshape(w.shape)
        over = w > 1.0                                     # leveraged region
        if np.any(over):
            m = np.where(over, w * eq_mean - (w - 1.0) * borrow_real, m)
            s = np.where(over, w * eq_vol, s)
        return m, s

    return alloc


# ── core lifecycle simulator over a bundle of candidate paths (common random numbers) ──
#
# `gap_arr` and `guar_arr` are per-retirement-year arrays (length retire_years), so the model
# supports a "bridge": before the pension starts the portfolio funds the full target income
# (guar=0, gap=target_income); once it starts, the portfolio funds only the remaining gap.
def _eu(W, Z, accum_years, retire_years, alloc, *, flex, gap_arr, guar_arr, wr,
        contrib, start_savings, gamma, beta, bequest, bequest_floor):
    """Return expected discounted utility for each of G candidate equity-weight paths.

    W : (n_years, G) — one column per candidate path; equity weight constant within each
        interval block but potentially different across blocks.
    Z : (n_years, n) — shared standard-normal shocks (common random numbers so candidates
        are evaluated on the same market draws, reducing variance of comparisons).
    gamma : CRRA risk aversion used for this evaluation (a single value throughout).
    Returns a (G,) array: mean discounted utility across the n paths, for each candidate.
    """
    means, vols = alloc(W)                       # each (n_years, G)
    G, n = W.shape[1], Z.shape[1]
    bal = np.full((G, n), start_savings)
    for i in range(accum_years):
        r = means[i][:, None] + vols[i][:, None] * Z[i][None, :]
        # Floor at 0 before contributing: a leveraged wipeout (margin call) is ruin, not debt.
        # A no-op without leverage, where annual returns never approach −100%.
        bal = np.maximum(bal * (1 + r), 0.0) + contrib * (1 + r / 2)
    disc = beta ** np.arange(retire_years)
    eu = np.zeros((G, n))
    for t in range(retire_years):
        i = accum_years + t
        r = means[i][:, None] + vols[i][:, None] * Z[i][None, :]
        grown = np.maximum(bal * (1 + r), 0.0)
        target = (1 - flex) * gap_arr[t] + flex * (wr * bal)
        afford = grown / (1 + r / 2)
        wdr = np.minimum(target, afford)
        bal = grown - wdr * (1 + r / 2)
        eu += disc[t] * _crra(guar_arr[t] + wdr, gamma)
    if bequest > 0:
        eu += bequest * disc[-1] * _crra(bal + bequest_floor, gamma)
    return eu.mean(axis=1)


def _stats(weights, Z, accum_years, retire_years, alloc, *, flex, gap_arr, guar_arr, wr,
           contrib, start_savings, gamma, beta, bequest, bequest_floor):
    """Outcome stats for one path (independent draw). CE income is CONSUMPTION-ONLY — the
    bequest motive shapes the path but is reported separately (median estate), so adding a
    bequest weight does not distort the spending CE. `gamma` here is the retirement-phase
    risk aversion (the CE is a retirement-consumption metric)."""
    means, vols = alloc(weights)
    bal = np.full(Z.shape[1], start_savings)
    for i in range(accum_years):
        r = means[i] + vols[i] * Z[i]
        bal = np.maximum(bal * (1 + r), 0.0) + contrib * (1 + r / 2)  # floor: leverage ruin
    disc = beta ** np.arange(retire_years)
    C = np.empty((retire_years, Z.shape[1]))
    cons_eu = np.zeros(Z.shape[1])
    depleted = np.zeros(Z.shape[1], bool)
    for t in range(retire_years):
        i = accum_years + t
        r = means[i] + vols[i] * Z[i]
        grown = np.maximum(bal * (1 + r), 0.0)
        target = (1 - flex) * gap_arr[t] + flex * (wr * bal)
        wdr = np.minimum(target, grown / (1 + r / 2))
        bal = grown - wdr * (1 + r / 2)
        C[t] = guar_arr[t] + wdr
        cons_eu += disc[t] * _crra(C[t], gamma)
        depleted |= bal <= _FLOOR
    return {
        "ce_income": _ce_from_util(cons_eu.mean() / disc.sum(), gamma),
        "depletion": float(depleted.mean()),
        "income_cv": float(np.mean(C.std(axis=0) / C.mean(axis=0))),
        "median_bequest": float(np.median(bal)),
    }


# ══════════════════════════════════════════════════════════════════════════════
def recommend_glide_path(
    accum_years: int = 30,
    retire_years: int = 30,
    flexibility: float = 0,
    pension_level: float = 0.2,
    alloc_curve: Sequence[tuple] = PWL_CURVE,
    interval: int = 5,
    *,
    # capital-market input units
    inflation: float = 2.1,
    returns_in_percent: bool = True,
    # leverage (borrowing to invest); 1.0 = none
    max_leverage: float = 1.0,                  # cap on equity weight (1.5 = up to 150%)
    borrow_cost: float = 2.0,                   # REAL cost of borrowing (used only when leveraged)
    # household scale (real dollars) — affects the constant-$ floor/gap economics
    current_savings: float = 200_000.0,
    annual_contribution: float = 20_000.0,
    target_income: float = 60_000.0,
    withdrawal_rate: float = 0.04,
    pre_retirement_income: float = 100_000.0,   # base for the pension %
    pension_delay_years: int = 0,               # years into retirement before the pension starts
    # preferences
    gamma: float = 3.0,                         # CRRA risk aversion (single value; drives the glide)
    beta: float = 0.985,
    bequest: float = 0.0,                       # raw warm-glow weight (advanced)
    bequest_years: float | None = None,         # friendlier: target estate = this × target_income
    bequest_floor: float = 10_000.0,
    # optimizer / Monte Carlo
    n_paths: int = 15_000,
    grid_step: float = 0.05,
    passes: int = 12,
    seed: int = 20260602,
    start_age: int | None = None,
    flat_band: float = 0.10,
) -> dict:
    """Recommend the welfare-maximizing equity weight per `interval`-year step, by simulation.

    Returns a dict with:
      schedule      : list of blocks {step, year_start, year_end, age_start, phase, equity_pct}
      equity_by_year: the expanded per-year equity weights (fractions)
      accum_dir/retire_dir : 'Rising' | 'Flat' | 'Falling' slope of each phase
      tent_pct, tent_year/tent_age : lowest equity within 15y of retirement (the tent bottom)
      ce_income, depletion, income_cv : out-of-sample outcome stats for the recommended path
      flat_equity_pct, flat_ce_income : the best single CONSTANT equity weight and its CE income
                                        (the simpler alternative; the glide's edge is usually tiny)
      median_bequest, median_estate_years : median terminal estate ($ and in years of spending)
      bequest_target_reached : None (no target) | True | False (target above what's achievable)
      params        : echo of the resolved inputs (incl. the calibrated bequest weight)
    """
    if not (0.0 <= flexibility <= 1.0):
        raise ValueError("flexibility must be in [0, 1]")
    if not (0.0 <= pension_level <= 1.0):
        raise ValueError("pension_level must be in [0, 1] (fraction of pre_retirement_income)")
    if interval < 1:
        raise ValueError("interval must be >= 1 year")
    n_years = accum_years + retire_years
    if n_years < 1:
        raise ValueError("need at least one year")
    pension_delay = max(0, int(pension_delay_years))
    if pension_delay >= retire_years and pension_level > 0:
        raise ValueError("pension_delay_years must be < retire_years (else the pension never pays)")
    if not (grid_step <= max_leverage <= 3.0):
        raise ValueError("max_leverage must be in [grid_step, 3.0] (1.0 = no leverage)")

    alloc = _build_alloc(alloc_curve, inflation, returns_in_percent, borrow_cost)
    # Pension is a fraction of PRE-RETIREMENT income (matches the web app's currentIncome base).
    guaranteed = pension_level * pre_retirement_income
    # Per-retirement-year arrays for the bridge: before the pension starts the portfolio funds
    # the whole target income; once it starts it funds only the remaining (non-negative) gap.
    guar_arr = np.where(np.arange(retire_years) < pension_delay, 0.0, guaranteed)
    gap_arr = np.maximum(target_income - guar_arr, 0.0)

    # Internal short aliases passed to _eu/_stats. NOTE: gamma and bequest are passed
    # per-call (the bequest weight may be calibrated below); the rest live here.
    common = dict(flex=flexibility, gap_arr=gap_arr, guar_arr=guar_arr, wr=withdrawal_rate,
                  contrib=annual_contribution, start_savings=current_savings,
                  beta=beta, bequest_floor=bequest_floor)

    # Candidate equity weights 0..max_leverage. Weights > 1 are leveraged (borrowed) positions.
    grid = np.round(np.arange(0.0, max_leverage + 1e-9, grid_step), 6)
    G = len(grid)

    # Map each year to its interval block; equity weight is constant within a block.
    # The clamp to n_blocks-1 absorbs any remainder when n_years % interval != 0.
    n_blocks = math.ceil(n_years / interval)
    block_of_year = np.minimum(np.arange(n_years) // interval, n_blocks - 1)

    def _optimize(bequest_w, Zopt, max_passes):
        """Coordinate-ascent the per-block equity weights for a given bequest weight.

        Returns the per-block weights that maximise expected discounted consumption utility."""
        # Initialise at the best flat weight (shape-neutral) to avoid biasing the shape and
        # reduce the risk of the coordinate ascent settling in a poor local optimum.
        flat = _eu(np.tile(grid, (n_years, 1)), Zopt, accum_years, retire_years, alloc,
                   gamma=gamma, bequest=bequest_w, **common)
        block_w = np.full(n_blocks, grid[int(np.argmax(flat))])
        for p in range(max_passes):
            order = range(n_blocks) if p % 2 == 0 else range(n_blocks - 1, -1, -1)
            changed = False
            for b in order:
                years = block_w[block_of_year]
                # (n_years, G): current path in all columns, block b's rows = full grid.
                W = np.tile(years[:, None], (1, G))
                W[block_of_year == b, :] = grid
                eu = _eu(W, Zopt, accum_years, retire_years, alloc,
                         gamma=gamma, bequest=bequest_w, **common)
                best = grid[int(np.argmax(eu))]
                if best != block_w[b]:
                    block_w[b] = best
                    changed = True
            if not changed:
                break
        return block_w

    # If a bequest target (in years of spending) is given, calibrate the raw warm-glow weight
    # so the median terminal estate ≈ bequest_years × target_income. The bequest motive can
    # only raise the estate (by lifting equity), so a target at or below the estate the
    # spending plan already leaves needs no motive (weight 0). Above that, median estate rises
    # monotonically with the weight, so we bracket then bisect — at reduced fidelity for speed.
    bequest_w = bequest
    bequest_target_reached = None
    if bequest_years is not None and bequest_years > 0:
        target_estate = bequest_years * target_income
        n_cal = min(n_paths, 4_000)
        Zc = np.random.default_rng(seed + 101).standard_normal((n_years, n_cal))
        Zce = np.random.default_rng(seed + 202).standard_normal((n_years, max(n_cal, 12_000)))

        def _median_estate(bw):
            w = _optimize(bw, Zc, max_passes=min(passes, 6))[block_of_year]
            return _stats(w, Zce, accum_years, retire_years, alloc,
                          gamma=gamma, bequest=bw, **common)["median_bequest"]

        natural = _median_estate(0.0)  # estate the spending plan already leaves, motive off
        if target_estate <= natural:
            bequest_w = 0.0
            bequest_target_reached = True  # already covered; no extra equity tilt needed
        else:
            # The estate saturates once the glide is near all-equity, so a modest weight cap
            # is enough; beyond it more weight barely moves the estate (target unreachable).
            cap = 200.0
            lo, hi = 0.0, 25.0
            est_hi = _median_estate(hi)
            while est_hi < target_estate and hi < cap:
                lo, hi = hi, min(hi * 2, cap)
                est_hi = _median_estate(hi)
            if est_hi < target_estate:
                bequest_w = hi                  # pinned at the cap; target out of reach
                bequest_target_reached = False
            else:
                for _ in range(10):
                    mid = 0.5 * (lo + hi)
                    if _median_estate(mid) < target_estate:
                        lo = mid
                    else:
                        hi = mid
                bequest_w = 0.5 * (lo + hi)
                bequest_target_reached = True

    Z = np.random.default_rng(seed).standard_normal((n_years, n_paths))
    block_w = _optimize(bequest_w, Z, max_passes=passes)
    weights = block_w[block_of_year]

    # Out-of-sample outcome stats for the recommended path.
    Zf = np.random.default_rng(seed + 9999).standard_normal((n_years, max(n_paths, 40_000)))
    st = _stats(weights, Zf, accum_years, retire_years, alloc,
                gamma=gamma, bequest=bequest_w, **common)

    # Best single CONSTANT (flat) equity weight — the simpler alternative to the glide path.
    # Picked by the same in-sample utility objective, then scored out-of-sample on Zf for a
    # fair CE-income comparison. The glide path's edge over it is usually tiny (see §2e of the
    # analysis note), so the web tool leads with this when the gap is small.
    flat_eu = _eu(np.tile(grid, (n_years, 1)), Z, accum_years, retire_years, alloc,
                  gamma=gamma, bequest=bequest_w, **common)
    best_flat_w = float(grid[int(np.argmax(flat_eu))])
    flat_st = _stats(np.full(n_years, best_flat_w), Zf, accum_years, retire_years, alloc,
                     gamma=gamma, bequest=bequest_w, **common)

    # Shape descriptors.
    def classify(d):
        return "Rising" if d > flat_band else ("Falling" if d < -flat_band else "Flat")

    acc = weights[:accum_years] if accum_years else np.array([])
    ret = weights[accum_years:]
    twin = min(15, retire_years)
    tent_i = int(np.argmin(ret[:twin])) if retire_years else 0
    accum_dir = classify(acc[-1] - acc[0]) if accum_years >= 2 else "n/a"
    # Measure full retirement phase, not just the first 15 years (twin is only
    # used for the tent search, not for the overall slope direction).
    retire_dir = classify(ret[-1] - ret[0]) if retire_years >= 2 else "n/a"

    # Build the interval schedule.
    schedule = []
    for b in range(n_blocks):
        blk_start = b * interval
        blk_end = min((b + 1) * interval, n_years) - 1
        entry = {
            "step": b,
            "year_start": blk_start,
            "year_end": blk_end,
            "phase": "accum" if blk_start < accum_years else "retire",
            "equity_pct": round(float(block_w[b]) * 100, 1),
        }
        if start_age is not None:
            entry["age_start"] = start_age + blk_start
        schedule.append(entry)

    tent_label = "tent_age" if start_age is not None else "tent_year"
    tent_value = (start_age + accum_years + tent_i) if start_age is not None else (accum_years + tent_i)

    return {
        "schedule": schedule,
        "equity_by_year": [round(float(w), 4) for w in weights],
        "accum_dir": accum_dir,
        "retire_dir": retire_dir,
        "tent_pct": round(float(ret[tent_i]) * 100, 1) if retire_years else None,
        tent_label: tent_value,
        "ce_income": round(st["ce_income"], 0),
        # Best single constant equity weight + its CE income (the simpler alternative).
        "flat_equity_pct": round(best_flat_w * 100, 1),
        "flat_ce_income": round(flat_st["ce_income"], 0),
        "median_bequest": round(st["median_bequest"], 0),
        # Estate expressed in years of retirement spending (the friendlier bequest unit).
        "median_estate_years": (round(st["median_bequest"] / target_income, 1)
                                if target_income > 0 else None),
        "bequest_target_reached": bequest_target_reached,
        "depletion": round(st["depletion"], 4),
        "income_cv": round(st["income_cv"], 4),
        "params": {
            "accum_years": accum_years, "retire_years": retire_years,
            "flexibility": flexibility, "pension_level": pension_level,
            "pre_retirement_income": pre_retirement_income, "target_income": target_income,
            "guaranteed": guaranteed, "pension_delay_years": pension_delay,
            "post_pension_gap": float(target_income - guaranteed), "interval": interval,
            "gamma": gamma,
            "bequest": round(float(bequest_w), 3), "bequest_years": bequest_years,
            "max_leverage": max_leverage, "borrow_cost": borrow_cost,
            "n_paths": n_paths, "grid_step": grid_step,
        },
    }


# ── plotting ──────────────────────────────────────────────────────────────────
def plot_glide_path(recs, *, start_age=None, path=None, title=None, show=False):
    """Plot one or more recommended glide paths.

    recs      : a single result dict from recommend_glide_path, or a {label: result}
                mapping to overlay multiple paths.
    start_age : if given, the x-axis is labelled as age; otherwise years-from-start.
    path      : if given, save the figure there (PNG).
    show      : if True, display interactively.
    Returns the saved path (or None).
    """
    import matplotlib
    if path is not None and not show:
        matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    # A single recommendation is itself a dict (it has a "schedule" key); a {label: rec}
    # mapping does not. Distinguish them so a lone result isn't iterated as a mapping.
    if isinstance(recs, dict) and "schedule" not in recs:
        items = list(recs.items())
    else:
        items = [(None, recs)]
    x0 = start_age if start_age is not None else 0
    xlabel = "age" if start_age is not None else "year from start"

    # Try to import scipy spline once; degrade gracefully if unavailable.
    _spline = None

    # Upper y-limit: 100% normally, higher when any path uses leverage (equity > 100%).
    lev_cap = max((rec["params"].get("max_leverage", 1.0) for _, rec in items), default=1.0) * 100

    fig, ax = plt.subplots(figsize=(9, 5.2))
    boundaries = set()
    for label, rec in items:
        accum = rec["params"]["accum_years"]
        n_years = accum + rec["params"]["retire_years"]
        boundaries.add(x0 + accum)

        # Original staircase: equity is constant within each interval block.
        xs = [x0 + e["year_start"] for e in rec["schedule"]] + [x0 + n_years]
        ys = [e["equity_pct"] for e in rec["schedule"]]
        ys = ys + [ys[-1]]  # extend the last block to the horizon end
        ax.step(xs, ys, where="post", lw=2.3, label=label)

    for b in boundaries:
        ax.axvline(b, color="k", alpha=0.3, ls="--")
    if len(boundaries) == 1:
        ax.text(next(iter(boundaries)) + 0.4, 4, "retirement", alpha=0.6)
    if lev_cap > 100:  # mark the unleveraged ceiling when leverage is in play
        ax.axhline(100, color="gray", alpha=0.4, ls=":")
        ax.text(x0 + 0.4, 101.5, "100% (unleveraged)", alpha=0.6, fontsize=9)

    ax.set_xlabel(xlabel)
    ax.set_ylabel("recommended equity weight (%)")
    ax.set_ylim(0, max(105, lev_cap + 5))
    ax.grid(alpha=0.3)
    ax.set_title(title or "Recommended equity glide path (Monte-Carlo optimized)")
    if any(lbl for lbl, _ in items):
        ax.legend()
    fig.tight_layout()
    if path is not None:
        fig.savefig(path, dpi=110)
    if show:
        plt.show()
    plt.close(fig)
    return path


# ── formatting helpers ───────────────────────────────────────────────────────-
def _fmt(rec):
    sched = " | ".join(
        f"{e.get('age_start', 'y'+str(e['year_start']))}:{e['equity_pct']:.0f}%" for e in rec["schedule"]
    )
    tent = rec.get("tent_age", rec.get("tent_year"))
    return (f"  before={rec['accum_dir']:<7} after={rec['retire_dir']:<7} "
            f"tent={rec['tent_pct']}%@{tent}  CE=${rec['ce_income']:,.0f} "
            f"deplete={rec['depletion']*100:.1f}% incCV={rec['income_cv']*100:.0f}% "
            f"estate≈${rec['median_bequest']:,.0f}\n"
            f"  schedule: {sched}")


def _ask(prompt, default, cast=float, example=None):
    """Prompt the user for a value, returning `default` on blank input."""
    hint = f"  (default: {default}"
    if example is not None:
        hint += f",  e.g. {example}"
    hint += ")"
    while True:
        raw = input(f"{prompt}\n{hint}\n> ").strip()
        if raw == "":
            return default
        try:
            return cast(raw)
        except ValueError:
            print(f"  ! Invalid input — expected a number. Try again.\n")


def _section(title):
    print(f"\n{'─' * 50}")
    print(f"  {title}")
    print(f"{'─' * 50}")


# ── demo (sweep mode) ─────────────────────────────────────────────────────────
def _run_demo(out_dir):
    """Sweep key levers across three spending rules and write plots."""
    import os
    os.makedirs(out_dir, exist_ok=True)
    AGE, INTERVAL = 35, 5

    SPENDING = [
        ("constant", 0.0, "constant $"),
        ("semiflex", 0.5, "semi-flex 50%"),
        ("flexible", 1.0, "flexible 100%"),
    ]
    SWEEPS = [
        ("pension", "pension level",   "pension_level", lambda v: f"pension {v*100:.0f}%", (0.0, 0.2, 0.5)),
        ("bequest", "bequest motive",  "bequest",       lambda v: f"bequest {v:g}",        (0.0, 10.0, 100.0)),
        ("gamma",   "risk aversion γ", "gamma",         lambda v: f"γ = {v:g}",            (1.0, 2.0, 3.0, 5.0)),
    ]

    def one(flex, **kw):
        return recommend_glide_path(flexibility=flex, alloc_curve=PWL_CURVE,
                                    start_age=AGE, interval=INTERVAL, **kw)

    print(f"Demo mode — PWL curve, start age {AGE}, {INTERVAL}y steps\n")
    figs = []
    for slug, flex, label in SPENDING:
        for lslug, ltitle, kwarg, fmt, values in SWEEPS:
            print(f"{label}  —  varying {ltitle}")
            group = {}
            for v in values:
                rec = one(flex, **{kwarg: v})
                group[fmt(v)] = rec
                print(f"   {fmt(v):<13} {_fmt(rec).splitlines()[0].strip()}")
            f = plot_glide_path(
                group, start_age=AGE,
                path=os.path.join(out_dir, f"glide_{slug}_by_{lslug}.png"),
                title=f"{label}: optimal equity glide vs {ltitle}\n"
                      f"(other inputs at defaults — 30y accum + 30y retire, {INTERVAL}y steps)")
            figs.append(f)
            print()

    overview = {label: one(flex) for slug, flex, label in SPENDING}
    figs.append(plot_glide_path(
        overview, start_age=AGE, path=os.path.join(out_dir, "glide_by_spending.png"),
        title="Optimal equity glide by spending rule\n(all other inputs at defaults)"))

    print("Figures written:")
    for f in figs:
        print(f"  {f}")


# ── interactive CLI ───────────────────────────────────────────────────────────
def _run_interactive():
    """Walk the user through their inputs and print the recommended glide path."""
    print("\n╔══════════════════════════════════════════════════╗")
    print("║   Glide-path recommender — interactive mode      ║")
    print("╚══════════════════════════════════════════════════╝")
    print("  Press Enter to accept the default shown in (  ).")
    print("  All dollar amounts are in today's real dollars.")

    # ── About you ────────────────────────────────────────────────────────────
    _section("About you")
    current_age     = _ask("Current age",                      35,  int)
    retirement_age  = _ask("Planned retirement age",           65,  int,  "60 for early retirement")
    planning_age    = _ask("Plan until age (life expectancy)", 95,  int,  "90–100 is typical")
    pre_ret_income  = _ask("Current pre-retirement gross income ($/yr)", 100_000, float, "120000")
    current_savings = _ask("Current portfolio balance ($)",    200_000, float, "500000")
    annual_contrib  = _ask("Annual savings / contribution ($)", 20_000, float, "30000")

    accum_years = max(1, retirement_age - current_age)
    retire_years = max(1, planning_age - retirement_age)

    # ── Retirement income ─────────────────────────────────────────────────────
    _section("Retirement income")
    target_income = _ask(
        "Target annual spending in retirement ($)",
        60_000, float, "70000  (gross, in today's dollars)")
    pension_pct = _ask(
        "Guaranteed income (CPP + OAS + DB pension)\n"
        "  as a % of your PRE-RETIREMENT income",
        20.0, float, "0 = none,  20 = typical CPP/OAS,  50 = generous DB pension")
    pension_level = pension_pct / 100.0
    pension_start_age = _ask(
        "Age the pension starts paying\n"
        "  (if earlier than retirement, it just starts at retirement)",
        retirement_age, int, "65 for CPP/OAS even if you retire at 60")
    pension_delay = max(0, pension_start_age - retirement_age)
    if pension_delay > 0:
        print(f"  → {pension_delay}-year bridge: your portfolio funds the full "
              f"${target_income:,.0f} until the pension starts.")

    # ── Spending rule ─────────────────────────────────────────────────────────
    _section("Spending rule")
    print("  Flexibility = how much your spending follows the market:")
    print("    0   = fixed real $ every year (rigid; safest default)")
    print("    1   = fully proportional — a 20% portfolio drop ⇒ ~20% spending cut")
    print("    0.5 = half-and-half")
    flexibility = _ask("Spending flexibility [0–1]", 0.0, float, "0 = no flexibility")
    if flexibility > 0:
        withdrawal_rate = _ask(
            "  When spending flexibly, what % of the balance to draw each year?\n"
            "  (the proportional draw rate — like the 4% rule)",
            0.04, float, "0.04 = 4%")
    else:
        withdrawal_rate = 0.04  # unused when flexibility == 0

    # ── Preferences ───────────────────────────────────────────────────────────
    _section("Preferences & risk")
    print("  Risk aversion (γ): 1 = log utility, 2 = moderate, 3 = cautious, 5+ = very cautious.")
    print("  One value drives the whole glide — your consumption risk aversion already")
    print("  determines the accumulation path (a separate 'working' γ has ~no effect).")
    gamma = _ask("Risk aversion γ", 3.0, float, "3 = cautious base case")

    beta = _ask(
        "Time-discount factor β  (0.99 = very patient saver, 0.97 = moderate)",
        0.99, float, "0.985 = standard, 0.99 = high saver")

    print("\n  Bequest: how large an estate to leave, in YEARS of your retirement spending.")
    print("  0 = spend it all; 10 = leave ~10 years of expenses. (The plan may already")
    print("  leave more than you ask — flexible/constant spending often under-draws.)")
    bequest_years = _ask("Target estate (years of spending)", 0.0, float, "0 = none, 10 = moderate")

    print("\n  Leverage: allow borrowing to invest more than 100% in equity?")
    print("  Enter the max equity % (100 = no leverage, 150 = up to 1.5×).")
    max_equity_pct = _ask("Max equity %", 100.0, float, "100 = none, 150 = lifecycle leverage")
    max_leverage = max(max_equity_pct / 100.0, 0.05)
    if max_leverage > 1.0:
        borrow_cost = _ask("  Real cost of borrowing (% per year)", 2.0, float,
                           "2 = margin/HELOC real rate")
    else:
        borrow_cost = 2.0  # unused when not leveraging

    # ── Optimizer ─────────────────────────────────────────────────────────────
    _section("Optimizer settings")
    interval = _ask(
        "Glide-step interval in years (1 = per-age path, 5 = coarser but faster)",
        5, int, "1 for smoothest result, 5 for quick run")
    n_paths = _ask(
        "Number of Monte Carlo paths (more = more stable, slower)",
        15_000, int, "5000 for quick, 30000 for publication quality")

    # ── Run ───────────────────────────────────────────────────────────────────
    note = "  (calibrating the bequest target may take a little longer)" if bequest_years > 0 else ""
    lev_note = f", leverage≤{max_leverage:g}× @{borrow_cost:g}% real" if max_leverage > 1 else ""
    print(f"\n  Running optimiser ({int(n_paths):,} paths, {interval}y steps, "
          f"γ={gamma}, β={beta}{lev_note})…{note}")
    rec = recommend_glide_path(
        accum_years=accum_years,
        retire_years=retire_years,
        flexibility=flexibility,
        pension_level=pension_level,
        pre_retirement_income=pre_ret_income,
        pension_delay_years=pension_delay,
        interval=interval,
        current_savings=current_savings,
        annual_contribution=annual_contrib,
        target_income=target_income,
        withdrawal_rate=withdrawal_rate,
        gamma=gamma,
        beta=beta,
        bequest_years=(bequest_years if bequest_years > 0 else None),
        max_leverage=max_leverage,
        borrow_cost=borrow_cost,
        n_paths=int(n_paths),
        start_age=current_age,
        alloc_curve=PWL_CURVE,
    )

    # ── Results ───────────────────────────────────────────────────────────────
    print(f"\n{'═' * 50}")
    print(f"  RECOMMENDED GLIDE PATH")
    print(f"{'═' * 50}")
    print(f"  Accumulation ({current_age}→{retirement_age}): {rec['accum_dir']}")
    print(f"  Retirement   ({retirement_age}→{planning_age}): {rec['retire_dir']}")
    tent_label = "tent_age" if "tent_age" in rec else "tent_year"
    print(f"  Equity trough: {rec['tent_pct']}% at age {rec[tent_label]}")
    print()
    print(f"  Outcome stats (out-of-sample):")
    print(f"    CE income     : ${rec['ce_income']:>10,.0f} /yr  (certainty-equivalent spending)")
    print(f"    Best constant : {rec['flat_equity_pct']:>9.0f} %   "
          f"(CE ${rec['flat_ce_income']:,.0f}/yr — the glide's edge over a flat weight is usually tiny)")
    print(f"    Depletion rate: {rec['depletion']*100:>8.1f} %")
    print(f"    Income CV     : {rec['income_cv']*100:>8.1f} %  (spending variability; lower = steadier)")
    print(f"    Median estate : ${rec['median_bequest']:>10,.0f}  "
          f"(~{rec['median_estate_years']} yrs of spending)")
    if bequest_years > 0 and rec.get("bequest_target_reached") is False:
        print(f"    ⚠ Target of {bequest_years:g} yrs is not reachable even at full equity; "
              f"showing the most the plan can leave.")
    print()
    print(f"  Schedule (equity % per block):")
    for e in rec["schedule"]:
        age_lbl = f"age {e['age_start']:>3}" if "age_start" in e else f"year {e['year_start']:>3}"
        print(f"    {age_lbl}  [{e['phase']:<6}]  {e['equity_pct']:>5.1f}%")

    # ── Plot ──────────────────────────────────────────────────────────────────
    print()
    save = input("  Save a chart? Enter a file path (or press Enter to skip):\n> ").strip()
    if save:
        if not save.endswith(".png"):
            save += ".png"
        lev_t = f", lev≤{max_leverage:g}×" if max_leverage > 1 else ""
        out = plot_glide_path(rec, start_age=current_age, path=save,
                              title=f"Recommended glide path  (γ={gamma}, "
                                    f"β={beta}, pension={pension_pct:.0f}%, flex={flexibility}{lev_t})")
        print(f"  Chart saved to: {out}")


# ── entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import os
    import sys

    if "--demo" in sys.argv:
        out_dir = os.path.join(os.path.dirname(__file__), "glidepath_figures")
        _run_demo(out_dir)
    else:
        _run_interactive()
