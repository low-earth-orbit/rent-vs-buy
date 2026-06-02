#!/usr/bin/env python3
"""
Command-line front end for the glide-path recommender.

Optimizes (by Monte Carlo, not a lookup table) the equity weight per step for YOUR inputs and
prints the schedule + outcome stats. Thin wrapper around
`glide_path_recommender.recommend_glide_path` so the engine file stays import-only.

EXAMPLES
--------
  # constant-$ spending, 30y accumulation + 30y retirement, per-age, labelled by age
  python3 analysis/recommend_glide.py --accum 30 --retire 30 --flex 0 --pension 0.2 --start-age 35

  # semi-flexible, 5-year steps, more risk-averse, with an estate motive, and save a plot
  python3 analysis/recommend_glide.py --accum 25 --retire 35 --flex 0.5 --pension 0.3 \\
      --interval 5 --gamma 6 --bequest 10 --start-age 40 --plot myglide.png

  # use your own capital-market curve (CSV rows: equity_weight,mean,vol  — nominal %, deflated by --inflation)
  python3 analysis/recommend_glide.py --curve mycurve.csv --flex 1 --pension 0.4

  # the built-in 4-figure showcase
  python3 analysis/recommend_glide.py --demo

Run with -h to see every flag and its default.
"""

from __future__ import annotations

import argparse
import os
import sys

# Allow running as `python3 analysis/recommend_glide.py` from the repo root.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glide_path_recommender import (  # noqa: E402
    PWL_CURVE,
    _fmt,
    plot_glide_path,
    recommend_glide_path,
)


def load_curve(path):
    """Load a return/vol curve from CSV/whitespace rows of `equity_weight, mean, vol`.
    A non-numeric header line is skipped; lines starting with # are comments."""
    rows = []
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.replace(",", " ").split()
            try:
                rows.append((float(parts[0]), float(parts[1]), float(parts[2])))
            except (ValueError, IndexError):
                continue  # header or malformed line
    if not rows:
        raise SystemExit(f"no usable (w, mean, vol) rows found in {path}")
    return rows


def print_rec(rec):
    """Header line, summary stats, and the per-step schedule."""
    p = rec["params"]
    spend = {0.0: "constant $", 0.5: "semi-flex 50%", 1.0: "flexible 100%"}.get(
        p["flexibility"], f"flex {p['flexibility']:.2f}")
    by_age = "age_start" in rec["schedule"][0]
    print("Recommended equity glide path")
    print(f"  {p['accum_years']}y accumulation + {p['retire_years']}y retirement | {spend} | "
          f"pension {p['pension_level']*100:.0f}% | γ {p['gamma']:.0f} | bequest {p['bequest']:.0f} | "
          f"{p['interval']}y steps")
    print(_fmt(rec))
    print(f"\n  {'age' if by_age else 'year':>5}  equity%  phase")
    for e in rec["schedule"]:
        x = e["age_start"] if by_age else e["year_start"]
        print(f"  {x:>5}   {e['equity_pct']:>5.0f}   {e['phase']}")


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Recommend a Monte-Carlo-optimized equity glide path for your inputs.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    ap.add_argument("--demo", action="store_true", help="run the built-in showcase (writes 4 figures) and exit")
    # core inputs
    ap.add_argument("--accum", type=int, default=30, help="accumulation years")
    ap.add_argument("--retire", type=int, default=30, help="retirement (planning-horizon) years")
    ap.add_argument("--flex", type=float, default=0.0, help="spending flexibility 0..1 (0=constant $, 1=flexible)")
    ap.add_argument("--pension", type=float, default=0.2, help="pension as a fraction of target income 0..1")
    ap.add_argument("--interval", type=int, default=1, help="years per glide step (1=per-age, 5=every 5y)")
    ap.add_argument("--gamma", type=float, default=4.0, help="CRRA risk aversion (1 log, 4 base, 8 cautious)")
    ap.add_argument("--bequest", type=float, default=0.0, help="estate motive weight (0 none, ~1-100, saturates ~100)")
    ap.add_argument("--start-age", type=int, default=None, help="label the schedule by age instead of year")
    # household scale (real dollars)
    ap.add_argument("--savings", type=float, default=200_000.0, help="current savings ($)")
    ap.add_argument("--contrib", type=float, default=20_000.0, help="annual contribution ($/yr, accumulation)")
    ap.add_argument("--target-income", type=float, default=60_000.0, help="target real retirement income ($/yr)")
    ap.add_argument("--withdrawal-rate", type=float, default=0.04, help="rate for the flexible spending part")
    ap.add_argument("--inflation", type=float, default=2.1, help="inflation %% used to deflate the curve to real")
    # capital-market curve + outputs
    ap.add_argument("--curve", type=str, default=None,
                    help="CSV file of 'equity_weight,mean,vol' rows (default: built-in PWL curve)")
    ap.add_argument("--plot", type=str, default=None, help="save a step-plot of the recommendation to this PNG")
    ap.add_argument("--show", action="store_true", help="display the plot interactively")
    args = ap.parse_args(argv)

    if args.demo:
        import runpy
        engine = os.path.join(os.path.dirname(os.path.abspath(__file__)), "glide_path_recommender.py")
        runpy.run_path(engine, run_name="__main__")  # runs the engine's built-in showcase
        return

    curve = load_curve(args.curve) if args.curve else PWL_CURVE
    rec = recommend_glide_path(
        args.accum, args.retire, flexibility=args.flex, pension_level=args.pension,
        alloc_curve=curve, interval=args.interval, gamma=args.gamma, bequest=args.bequest,
        start_age=args.start_age, current_savings=args.savings, annual_contribution=args.contrib,
        target_income=args.target_income, withdrawal_rate=args.withdrawal_rate, inflation=args.inflation,
    )
    print_rec(rec)
    if args.plot or args.show:
        plot_glide_path(rec, start_age=args.start_age, path=args.plot, show=args.show)
        if args.plot:
            print(f"\nPlot written to {args.plot}")


if __name__ == "__main__":
    main()
