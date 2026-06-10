#!/usr/bin/env python3
"""Historical-vs-iid glide-path research harness.

Resolves *why* the sequence-preserving block bootstrap pushes the optimal lifetime allocation
toward all-equity while the iid modes do not, by sweeping the marginals x sequencing factorial
and the world-vs-pooled dataset choice. Unlike the web app, this reports the **raw optimized
glide path** (no simplicity bias); the best single constant allocation and the full CE-vs-constant
curve are printed alongside as comparators so you can judge for yourself how peaked each optimum is.

Sections (choose with --sections; default all):
  matrix  : the factorial — iid-mc / historical-iid / historical-block / forward-block, world & pooled
  blocks  : block-length sweep (sequencing strength) on the pooled dataset
  gamma   : risk-aversion sweep across the key modes
  curves  : CE vs constant equity weight (how peaked is "100% equity"?)
  vr      : variance-ratio diagnostic (mean reversion) for world vs pooled

  python3 -m analysis.glide_path.research_history --sections matrix vr
  python3 -m analysis.glide_path.research_history --quick          # faster, lower fidelity
"""

from __future__ import annotations

import argparse

import numpy as np

from .recommender import recommend_glide_path

# Disasters whose inclusion most stresses the equity case under single-country sequencing.
DISASTER_COUNTRIES = ["Germany", "Japan"]
DISASTER_YEARS = ["1914-1923", "1939-1948"]  # WWI + hyperinflation; WWII + aftermath


def _parse_windows(tokens):
    windows = []
    for token in tokens:
        if "-" in token[1:]:
            lo, hi = token.split("-", 1)
            windows.append((int(lo), int(hi)))
        else:
            windows.append(int(token))
    return windows


def base_kwargs(args, **overrides):
    """Common recommend_glide_path inputs for the research scenario, plus per-cell overrides."""
    kwargs = dict(
        accum_years=args.accum,
        retire_years=args.retire,
        flexibility=args.flex,
        guaranteed_income=args.guaranteed_income,
        target_income=args.target_income,
        current_savings=args.savings,
        annual_contribution=args.contrib,
        interval=args.interval,
        gamma=args.gamma,
        n_paths=args.paths,
        passes=args.passes,
    )
    kwargs.update(overrides)
    return kwargs


def glide_string(rec):
    """Per-step equity weights of the RAW optimized glide (the headline recommendation)."""
    return "/".join(f"{entry['equity_pct']:.0f}" for entry in rec["schedule"])


def summary_row(label, rec):
    edge = rec["ce_income"] - rec["flat_ce_income"]
    return (
        f"  {label:<34} glide[{glide_string(rec):<29}] "
        f"CE ${rec['ce_income']:>7,.0f}  | best-const {rec['flat_equity_pct']:>3.0f}% "
        f"CE ${rec['flat_ce_income']:>7,.0f}  (edge {edge:+,.0f}/yr)  "
        f"dd-deplete {rec['drawdown_depletion'] * 100:>4.1f}%"
    )


# Factorial x dataset cells. World cannot exclude countries/years (no per-country structure).
def matrix_cells(args):
    cells = [
        ("iid-mc", dict(return_mode="iid-mc")),
        ("historical-iid (world)", dict(return_mode="historical-iid")),
        ("historical-block (world)", dict(return_mode="historical-block", block_years=args.block_years)),
        ("forward-block (world)", dict(return_mode="forward-block", block_years=args.block_years)),
        ("historical-iid (pooled)", dict(return_mode="historical-iid", dataset="pooled")),
        ("historical-block (pooled)",
         dict(return_mode="historical-block", dataset="pooled", block_years=args.block_years)),
        ("forward-block (pooled)",
         dict(return_mode="forward-block", dataset="pooled", block_years=args.block_years)),
        ("forward-block (pooled, ex-disasters)",
         dict(return_mode="forward-block", dataset="pooled", block_years=args.block_years,
              exclude_countries=DISASTER_COUNTRIES, exclude_years=_parse_windows(DISASTER_YEARS))),
    ]
    return cells


def run_matrix(args):
    print("\n" + "=" * 100)
    print(f"FACTORIAL x DATASET  (raw optimized glide; γ={args.gamma:g}, "
          f"{args.accum}y accum + {args.retire}y retire, ${args.savings:,.0f}, "
          f"target ${args.target_income:,.0f}, guaranteed ${args.guaranteed_income:,.0f})")
    print("=" * 100)
    print("  Reads: world block→all-equity is SEQUENCING (forward-block barely moves it); pooling")
    print("  single-country sequences is the biggest lever (it restores the diversified-away risk).")
    for label, overrides in matrix_cells(args):
        rec = recommend_glide_path(**base_kwargs(args, **overrides))
        print(summary_row(label, rec))


def run_block_sweep(args):
    print("\n" + "=" * 100)
    print("BLOCK-LENGTH SWEEP  (pooled; longer blocks preserve more mean reversion → more equity)")
    print("  block=1 should ~collapse to historical-iid; the response curve measures sequencing's worth.")
    print("=" * 100)
    for mode in ("historical-block", "forward-block"):
        print(f"\n  -- {mode} (pooled) --")
        for block_years in (1, 3, 5, 10, 20):
            rec = recommend_glide_path(
                **base_kwargs(args, return_mode=mode, dataset="pooled", block_years=block_years)
            )
            print(summary_row(f"block={block_years:>2}y", rec))


def run_gamma_sweep(args):
    print("\n" + "=" * 100)
    print("RISK-AVERSION SWEEP  (does the mode ranking hold across γ?)")
    print("=" * 100)
    modes = [
        ("iid-mc", dict(return_mode="iid-mc")),
        ("historical-block (world)", dict(return_mode="historical-block", block_years=args.block_years)),
        ("historical-block (pooled)",
         dict(return_mode="historical-block", dataset="pooled", block_years=args.block_years)),
        ("forward-block (pooled)",
         dict(return_mode="forward-block", dataset="pooled", block_years=args.block_years)),
    ]
    for gamma in (2.0, 4.0, 8.0):
        print(f"\n  -- γ = {gamma:g} --")
        for label, overrides in modes:
            rec = recommend_glide_path(**base_kwargs(args, gamma=gamma, **overrides))
            print(summary_row(label, rec))


def run_flat_curves(args):
    print("\n" + "=" * 100)
    print("CE vs CONSTANT EQUITY WEIGHT  (how peaked is the optimum? near-flat → simplicity bias OK)")
    print("=" * 100)
    cells = [
        ("iid-mc", dict(return_mode="iid-mc")),
        ("historical-block (world)", dict(return_mode="historical-block", block_years=args.block_years)),
        ("historical-block (pooled)",
         dict(return_mode="historical-block", dataset="pooled", block_years=args.block_years)),
        ("forward-block (pooled)",
         dict(return_mode="forward-block", dataset="pooled", block_years=args.block_years)),
    ]
    weights_shown = [0, 20, 40, 50, 60, 70, 80, 90, 100]
    header = "  ".join(f"{w:>5}%" for w in weights_shown)
    print(f"\n  {'mode':<28} {header}   (CE $000/yr; * = argmax)")
    for label, overrides in cells:
        rec = recommend_glide_path(**base_kwargs(args, return_flat_curve=True, **overrides))
        by_weight = {round(p["equity_pct"]): p["ce_income"] for p in rec["flat_curve"]}
        best = max(by_weight, key=lambda k: by_weight[k])
        cells_out = []
        for w in weights_shown:
            ce = by_weight.get(w)
            if ce is None:
                cells_out.append(f"{'—':>6}")
            else:
                mark = "*" if w == best else " "
                cells_out.append(f"{ce / 1000:>5.1f}{mark}")
        print(f"  {label:<28} {'  '.join(cells_out)}")


def run_variance_ratios(args):
    from analysis.shared.jst_history import (
        load_pooled_country_returns,
        load_world_returns,
        variance_ratio,
    )

    print("\n" + "=" * 100)
    print("VARIANCE RATIO  (VR<1 = mean reversion; the mechanism behind block→equity)")
    print("=" * 100)
    horizons = [1, 2, 5, 10, 15]
    datasets = [
        ("world", load_world_returns()),
        ("pooled", load_pooled_country_returns()),
        ("pooled ex-disasters",
         load_pooled_country_returns(
             exclude_countries=DISASTER_COUNTRIES, exclude_years=_parse_windows(DISASTER_YEARS))),
    ]
    head = "  ".join(f"q={q:>2}" for q in horizons)
    print(f"\n  {'dataset':<22} {'asset':<7} eq.vol  {head}")
    for name, history in datasets:
        for asset, series in (("equity", history.equity), ("bonds", history.fixed_income)):
            vols = "  ".join(
                f"{variance_ratio(series, q, history.segment_ids):>4.2f}" for q in horizons
            )
            vol = f"{series.std() * 100:>5.1f}%"
            print(f"  {name:<22} {asset:<7} {vol}  {vols}")


SECTIONS = {
    "matrix": run_matrix,
    "blocks": run_block_sweep,
    "gamma": run_gamma_sweep,
    "curves": run_flat_curves,
    "vr": run_variance_ratios,
}


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Historical-vs-iid glide-path research sweeps (reports the raw optimized glide).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    ap.add_argument("--sections", nargs="*", choices=list(SECTIONS), default=list(SECTIONS),
                    help="which sections to run")
    # Funded constant-withdrawal decumulation by default (the paper's setting).
    ap.add_argument("--accum", type=int, default=0)
    ap.add_argument("--retire", type=int, default=30)
    ap.add_argument("--flex", type=float, default=0.0)
    ap.add_argument("--savings", type=float, default=1_000_000.0)
    ap.add_argument("--contrib", type=float, default=0.0)
    ap.add_argument("--guaranteed-income", type=float, default=20_000.0)
    ap.add_argument("--target-income", type=float, default=60_000.0)
    ap.add_argument("--gamma", type=float, default=4.0)
    ap.add_argument("--interval", type=int, default=5)
    ap.add_argument("--block-years", type=int, default=10)
    ap.add_argument("--paths", type=int, default=6_000)
    ap.add_argument("--passes", type=int, default=10)
    ap.add_argument("--quick", action="store_true",
                    help="lower fidelity (fewer paths/passes, 10y steps) for a fast look")
    args = ap.parse_args(argv)

    if args.quick:
        args.paths = min(args.paths, 3_000)
        args.passes = min(args.passes, 6)
        args.interval = max(args.interval, 10)

    for name in args.sections:
        SECTIONS[name](args)
    print()


if __name__ == "__main__":
    main()
