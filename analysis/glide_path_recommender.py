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
                              0.5 = half-and-half. Blends the two targets.
  pension_level             : guaranteed real income in retirement, as a FRACTION OF
                              `target_income` (e.g. 0.0, 0.2, 0.5). Acts like a bond you own
                              outside the portfolio: the higher it is, the less the portfolio
                              must derisk. The portfolio funds the remaining gap.
  alloc_curve               : the capital-market assumptions, as anchors
                              [(equity_weight, mean_return, volatility), …] spanning w∈[0,1].
                              Interpolated to any weight. Units controlled by `returns_in_percent`
                              and deflated to real with `inflation`.
  interval                  : years per glide step (1 = per-age, 5 = change allocation every 5y…).
                              Equity weight is held constant within each interval block.
  gamma                     : CRRA risk aversion. Higher = more averse to consumption swings →
                              lower / more defensive equity (especially under flexible spending).
                              1 ≈ log utility, 4 = base case, 8 ≈ very cautious.
  bequest                   : weight on a warm-glow estate motive (CRRA utility of terminal
                              wealth). 0 = pure consumption (spend it all). Because terminal
                              wealth ≫ annual spending, the useful range is ~1–100 (it saturates
                              by ~100); a stronger motive lifts equity toward flat-high (it makes
                              equity upside valuable again rather than wasted). `ce_income` stays
                              consumption-only; the estate is reported as `median_bequest`.

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
def _crra(c, gamma):
    c = np.maximum(c, 1.0)
    if abs(gamma - 1.0) < 1e-9:
        return np.log(c)
    return c ** (1.0 - gamma) / (1.0 - gamma)


def _ce_from_util(util_per_period, gamma):
    if abs(gamma - 1.0) < 1e-9:
        return float(np.exp(util_per_period))
    return float(((1.0 - gamma) * util_per_period) ** (1.0 / (1.0 - gamma)))


def _build_alloc(alloc_curve, inflation, returns_in_percent):
    """Return alloc(w)->(real_mean, vol) interpolating the curve. Accepts any-shape w."""
    arr = sorted(((float(w), float(m), float(v)) for w, m, v in alloc_curve), key=lambda t: t[0])
    cw = np.array([t[0] for t in arr])
    cm = np.array([t[1] for t in arr])
    cv = np.array([t[2] for t in arr])
    scale = 100.0 if returns_in_percent else 1.0
    infl = inflation / scale
    real_mean = (1.0 + cm / scale) / (1.0 + infl) - 1.0   # deflate nominal mean to real
    vol = cv / scale

    def alloc(w):
        w = np.asarray(w, dtype=float)
        m = np.interp(w.ravel(), cw, real_mean).reshape(w.shape)
        s = np.interp(w.ravel(), cw, vol).reshape(w.shape)
        return m, s

    return alloc


# ── core lifecycle simulator over a bundle of candidate paths (common random numbers) ──
def _eu(W, Z, accum_years, retire_years, alloc, *, flex, gap, guaranteed, wr,
        contrib, start_savings, gamma, beta, bequest, bequest_floor):
    """Expected discounted utility per candidate. W: (n_years, G) equity weights; Z: (n_years, n)."""
    means, vols = alloc(W)                       # each (n_years, G)
    G, n = W.shape[1], Z.shape[1]
    bal = np.full((G, n), start_savings)
    for i in range(accum_years):
        r = means[i][:, None] + vols[i][:, None] * Z[i][None, :]
        bal = bal * (1 + r) + contrib * (1 + r / 2)
    disc = beta ** np.arange(retire_years)
    eu = np.zeros((G, n))
    for t in range(retire_years):
        i = accum_years + t
        r = means[i][:, None] + vols[i][:, None] * Z[i][None, :]
        grown = np.maximum(bal * (1 + r), 0.0)
        target = (1 - flex) * gap + flex * (wr * bal)
        afford = grown / (1 + r / 2)
        wdr = np.minimum(target, afford)
        bal = grown - wdr * (1 + r / 2)
        eu += disc[t] * _crra(guaranteed + wdr, gamma)
    if bequest > 0:
        eu += bequest * disc[-1] * _crra(bal + bequest_floor, gamma)
    return eu.mean(axis=1)


def _stats(weights, Z, accum_years, retire_years, alloc, *, flex, gap, guaranteed, wr,
           contrib, start_savings, gamma, beta, bequest, bequest_floor):
    """Outcome stats for one path (independent draw). CE income is CONSUMPTION-ONLY — the
    bequest motive shapes the path but is reported separately (median estate), so adding a
    bequest weight does not distort the spending CE."""
    means, vols = alloc(weights)
    bal = np.full(Z.shape[1], start_savings)
    for i in range(accum_years):
        r = means[i] + vols[i] * Z[i]
        bal = bal * (1 + r) + contrib * (1 + r / 2)
    disc = beta ** np.arange(retire_years)
    C = np.empty((retire_years, Z.shape[1]))
    cons_eu = np.zeros(Z.shape[1])
    depleted = np.zeros(Z.shape[1], bool)
    for t in range(retire_years):
        i = accum_years + t
        r = means[i] + vols[i] * Z[i]
        grown = np.maximum(bal * (1 + r), 0.0)
        target = (1 - flex) * gap + flex * (wr * bal)
        wdr = np.minimum(target, grown / (1 + r / 2))
        bal = grown - wdr * (1 + r / 2)
        C[t] = guaranteed + wdr
        cons_eu += disc[t] * _crra(C[t], gamma)
        depleted |= bal <= 1.0
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
    interval: int = 1,
    *,
    # capital-market input units
    inflation: float = 2.1,
    returns_in_percent: bool = True,
    # household scale (real dollars) — affects the constant-$ floor/gap economics
    current_savings: float = 200_000.0,
    annual_contribution: float = 20_000.0,
    target_income: float = 60_000.0,
    withdrawal_rate: float = 0.04,
    # preferences
    gamma: float = 3.0,
    beta: float = 0.985,
    bequest: float = 0.0,
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
      params        : echo of the resolved inputs
    """
    if not (0.0 <= flexibility <= 1.0):
        raise ValueError("flexibility must be in [0, 1]")
    if not (0.0 <= pension_level <= 1.0):
        raise ValueError("pension_level must be in [0, 1] (fraction of target_income)")
    if interval < 1:
        raise ValueError("interval must be >= 1 year")
    n_years = accum_years + retire_years
    if n_years < 1:
        raise ValueError("need at least one year")

    alloc = _build_alloc(alloc_curve, inflation, returns_in_percent)
    guaranteed = pension_level * target_income          # pension floor, paid every retirement year
    gap = target_income - guaranteed                    # what the portfolio funds under constant-$

    common = dict(flex=flexibility, gap=gap, guaranteed=guaranteed, wr=withdrawal_rate,
                  contrib=annual_contribution, start_savings=current_savings, gamma=gamma,
                  beta=beta, bequest=bequest, bequest_floor=bequest_floor)

    Z = np.random.default_rng(seed).standard_normal((n_years, n_paths))
    grid = np.round(np.arange(0.0, 1.0 + 1e-9, grid_step), 6)
    G = len(grid)

    # Map each year to its interval block; the equity weight is constant within a block.
    n_blocks = math.ceil(n_years / interval)
    block_of_year = np.minimum(np.arange(n_years) // interval, n_blocks - 1)

    def expand(block_w):
        return block_w[block_of_year]

    # Initialize blocks at the best single (flat) weight — a shape-neutral start.
    flat_eu = _eu(np.tile(grid, (n_years, 1)), Z, accum_years, retire_years, alloc, **common)
    bw0 = grid[int(np.argmax(flat_eu))]
    block_w = np.full(n_blocks, bw0)

    # Coordinate ascent over blocks (alternating sweep direction) until nothing moves.
    for p in range(passes):
        order = range(n_blocks) if p % 2 == 0 else range(n_blocks - 1, -1, -1)
        changed = False
        for b in order:
            years = expand(block_w)
            W = np.tile(years[:, None], (1, G))
            W[block_of_year == b, :] = grid
            eu = _eu(W, Z, accum_years, retire_years, alloc, **common)
            best = grid[int(np.argmax(eu))]
            if best != block_w[b]:
                block_w[b] = best
                changed = True
        if not changed:
            break

    weights = expand(block_w)

    # Out-of-sample outcome stats for the recommended path.
    Zf = np.random.default_rng(seed + 9999).standard_normal((n_years, max(n_paths, 40_000)))
    st = _stats(weights, Zf, accum_years, retire_years, alloc, **common)

    # Shape descriptors.
    def classify(d):
        return "Rising" if d > flat_band else ("Falling" if d < -flat_band else "Flat")

    acc = weights[:accum_years] if accum_years else np.array([])
    ret = weights[accum_years:]
    twin = min(15, retire_years)
    tent_i = int(np.argmin(ret[:twin])) if retire_years else 0
    accum_dir = classify(acc[-1] - acc[0]) if accum_years >= 2 else "n/a"
    retire_dir = (classify(ret[min(twin, retire_years) - 1] - ret[0])
                  if retire_years >= 2 else "n/a")

    # Build the interval schedule.
    schedule = []
    for b in range(n_blocks):
        ys = b * interval
        ye = min((b + 1) * interval, n_years) - 1
        entry = {
            "step": b,
            "year_start": ys,
            "year_end": ye,
            "phase": "accum" if ys < accum_years else "retire",  # labeled by the block's first year
            "equity_pct": round(float(block_w[b]) * 100, 1),
        }
        if start_age is not None:
            entry["age_start"] = start_age + ys
        schedule.append(entry)

    return {
        "schedule": schedule,
        "equity_by_year": [round(float(w), 4) for w in weights],
        "accum_dir": accum_dir,
        "retire_dir": retire_dir,
        "tent_pct": round(float(ret[tent_i]) * 100, 1) if retire_years else None,
        ("tent_age" if start_age is not None else "tent_year"):
            (start_age + accum_years + tent_i) if start_age is not None else (accum_years + tent_i),
        "ce_income": round(st["ce_income"], 0),
        "median_bequest": round(st["median_bequest"], 0),
        "depletion": round(st["depletion"], 4),
        "income_cv": round(st["income_cv"], 4),
        "params": {
            "accum_years": accum_years, "retire_years": retire_years,
            "flexibility": flexibility, "pension_level": pension_level,
            "guaranteed": guaranteed, "gap": gap, "interval": interval,
            "gamma": gamma, "bequest": bequest, "n_paths": n_paths, "grid_step": grid_step,
        },
    }


# ── plotting ──────────────────────────────────────────────────────────────────
def plot_glide_path(recs, *, start_age=None, path=None, title=None, show=False):
    """Plot one or more recommended glide paths as STEP lines (equity is flat within a block).

    recs : a single result dict from recommend_glide_path, or a {label: result} mapping to overlay.
    start_age : if given, the x-axis is age; otherwise it is years-from-start.
    path : if given, save the figure there (PNG). show : if True, display interactively.
    Returns the saved path (or None)."""
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

    fig, ax = plt.subplots(figsize=(9, 5.2))
    boundaries = set()
    for label, rec in items:
        accum = rec["params"]["accum_years"]
        n_years = accum + rec["params"]["retire_years"]
        xs = [x0 + e["year_start"] for e in rec["schedule"]] + [x0 + n_years]
        ys = [e["equity_pct"] for e in rec["schedule"]]
        ys = ys + [ys[-1]]  # extend the last block to the horizon end
        ax.step(xs, ys, where="post", lw=2.3, label=label)
        boundaries.add(x0 + accum)

    for b in boundaries:
        ax.axvline(b, color="k", alpha=0.3, ls="--")
    if len(boundaries) == 1:
        ax.text(next(iter(boundaries)) + 0.4, 4, "retirement", alpha=0.6)

    ax.set_xlabel(xlabel)
    ax.set_ylabel("recommended equity weight (%)")
    ax.set_ylim(0, 105)
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


# ── demo ────────────────────────────────────────────────────────────────────--
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


if __name__ == "__main__":
    import os

    out_dir = os.path.join(os.path.dirname(__file__), "glidepath_figures")
    os.makedirs(out_dir, exist_ok=True)

    # The demo runs at 5y steps for speed and readable plots (a per-age interval=1 call is ~30x
    # slower); use the CLI (recommend_glide.py) or the default interval=1 for a per-age path.
    AGE, INTERVAL = 35, 5

    # The three spending rules (file slug, flexibility, legend label).
    SPENDING = [
        ("constant", 0.0, "constant $"),
        ("semiflex", 0.5, "semi-flex 50%"),
        ("flexible", 1.0, "flexible 100%"),
    ]
    # For each spending rule we sweep one lever at a time; every OTHER input stays at its default
    # (30y+30y, γ=4, bequest=0, pension=0.2). (file slug, title, kwarg, label fn, values).
    SWEEPS = [
        ("pension", "pension level", "pension_level", lambda v: f"pension {v*100:.0f}%", (0.0, 0.2, 0.5)),
        ("bequest", "bequest motive", "bequest", lambda v: f"bequest {v:g}", (0.0, 10.0, 100.0)),
        ("gamma", "risk aversion γ", "gamma", lambda v: f"γ = {v:g}", (1.0, 2.0, 4.0, 8.0)),
    ]

    def one(flex, **kw):
        return recommend_glide_path(flexibility=flex, alloc_curve=PWL_CURVE,
                                    start_age=AGE, interval=INTERVAL, **kw)

    print(f"Glide-path recommender — demo (PWL curve, start age {AGE}, {INTERVAL}y steps; "
          f"each plot varies ONE lever, others at defaults)\n")

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

    # Overview — the three spending rules side by side, everything at defaults.
    overview = {label: one(flex) for slug, flex, label in SPENDING}
    figs.append(plot_glide_path(
        overview, start_age=AGE, path=os.path.join(out_dir, "glide_by_spending.png"),
        title="Optimal equity glide by spending rule\n(all other inputs at defaults)"))

    print("Figures written:")
    for f in figs:
        print(f"  {f}")
