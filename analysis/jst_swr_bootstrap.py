#!/usr/bin/env python3
"""
SWR vs. horizon from real global return history (Jordà–Schularick–Taylor Macrohistory DB).

WHY THIS EXISTS
---------------
Our app's parametric Monte Carlo (constant real mean + AR(1) on annual returns) keeps
lowering the safe withdrawal rate at long horizons (50y → ~2.8%), whereas the published
literature (Bengen/Trinity, Morningstar, Kitces/Pfau) reports the SWR *flooring* around
3.2–3.8%. This prototype tests whether real *return history* reproduces that floor, and
whether it survives dropping US-exceptionalism (i.e. using a globally diversified series).

DATA
----
Jordà, Knoll, Kuvshinov, Schularick, Taylor — "The Rate of Return on Everything, 1870–2015"
(JST Macrohistory DB, R6: 1870–2020, 16 advanced economies with equity+bond series).
We use three columns only, as requested: eq_tr, bond_tr (nominal total returns), cpi.
Real total return = (1 + nominal) / (1 + inflation) − 1, inflation = cpi.pct_change().
The file auto-downloads to analysis/.data/ on first run (≈1.4 MB, not committed).

KEY FINDINGS (default run, 60/40, 90% success)
----------------------------------------------
                         30y     40y     50y
  USA, overlapping       4.5%    4.0%    3.7%   ← reproduces the literature floor; flat after 40y
  World, overlapping     3.6%    3.1%    2.7%   ← honest cost of dropping US-exceptionalism
  World, block bootstrap 3.6%    3.0%    2.7%
  App parametric model   3.9%    3.2%    2.8%   (for reference)

  * The floor is a property of ACTUAL multi-decade paths: real markets mean-revert over
    decades (every bad US start recovered), so the overlapping-history curve flattens.
  * BLOCK BOOTSTRAP DESTROYS that multi-decade reversion (it only preserves within-block,
    ≤block_len, dependence) — so it does NOT reliably reproduce the floor and can even fall
    below an iid draw of the same mean/vol. Use METHOD="overlap" to see the true floor.
  * Global diversification cuts single-country vol (~15.5%, war/hyperinflation tails) down
    to ~9.7% for an equal-weight world aggregate — the right object for a diversified retiree.

USAGE
-----
  python3 analysis/jst_swr_bootstrap.py
Tweak the CONFIG block below (allocation, method, block length, re-centering, horizons).
Requires: pandas, numpy, openpyxl  (pip install pandas numpy openpyxl)
"""

from __future__ import annotations
import os
import urllib.request
import numpy as np
import pandas as pd

# ───────────────────────── CONFIG ─────────────────────────
EQUITY_WEIGHT = 0.60          # 60/40; bond weight = 1 − this
TARGET = 0.90                 # success rate the SWR must hit
HORIZONS = [20, 25, 30, 35, 40, 45, 50, 60]
NUM_SIMS = 20_000             # bootstrap paths (ignored by the overlapping method)
BLOCK_LEN = 8                 # years per block for the block-bootstrap method
SEED = 12345

# Re-center the series to a target (mean, vol) in REAL terms, keeping the historical
# *sequencing* (autocorrelation) but matching the app's assumptions. None = use raw history.
# e.g. RECENTER = (0.035, 0.0879) matches the app's 60/40 retire assumption.
RECENTER: tuple[float, float] | None = None
# ───────────────────────────────────────────────────────────

DATA_DIR = os.path.join(os.path.dirname(__file__), ".data")
DATA_FILE = os.path.join(DATA_DIR, "JSTdatasetR6.xlsx")
DATA_URL = "https://www.macrohistory.net/app/download/9834512569/JSTdatasetR6.xlsx"

RNG = np.random.default_rng(SEED)


def ensure_data() -> str:
    if not os.path.exists(DATA_FILE):
        os.makedirs(DATA_DIR, exist_ok=True)
        print(f"Downloading JST dataset → {DATA_FILE} ...")
        req = urllib.request.Request(DATA_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as r, open(DATA_FILE, "wb") as f:
            f.write(r.read())
    return DATA_FILE


def real_returns(sub: pd.DataFrame, eq_w: float) -> pd.DataFrame:
    """Real (CPI-deflated) annual total return of an `eq_w`/(1−eq_w) stock/bond mix."""
    bond_w = 1 - eq_w
    sub = sub.sort_values("year").dropna(subset=["eq_tr", "bond_tr", "cpi"]).copy()
    sub["infl"] = sub["cpi"].pct_change()
    real_eq = (1 + sub["eq_tr"]) / (1 + sub["infl"]) - 1
    real_bd = (1 + sub["bond_tr"]) / (1 + sub["infl"]) - 1
    sub["r"] = eq_w * real_eq + bond_w * real_bd
    return sub.dropna(subset=["infl", "r"])[["year", "r"]]


def maybe_recenter(arr: np.ndarray) -> np.ndarray:
    if RECENTER is None:
        return arr
    mean, vol = RECENTER
    z = (arr - arr.mean()) / arr.std()
    return mean + vol * z


def swr_overlapping(series: np.ndarray, h: int, target: float = TARGET) -> tuple[float, int]:
    """SWR from every overlapping actual h-year window (cFIREsim/FIRECalc style)."""
    windows = [series[s : s + h] for s in range(len(series) - h + 1)]
    n = len(windows)

    def frac_survive(w: float) -> float:
        c = 0
        for path in windows:
            bal, alive = 1.0, True
            for r in path:
                bal = bal * (1 + r) - w * (1 + r / 2)
                if bal <= 0:
                    alive = False
                    break
            c += alive
        return c / n

    lo, hi = 0.001, 0.20
    for _ in range(26):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if frac_survive(m) >= target else (lo, m)
    return lo * 100, n


def _block_paths(series: np.ndarray, h: int) -> np.ndarray:
    """Circular block bootstrap: stitch consecutive-year blocks to length `h`."""
    L = len(series)
    R = np.empty((NUM_SIMS, h))
    for i in range(NUM_SIMS):
        path: list[float] = []
        while len(path) < h:
            start = RNG.integers(0, L)
            idx = (start + np.arange(BLOCK_LEN)) % L  # wrap within the series
            path.extend(series[idx].tolist())
        R[i, :] = path[:h]
    return R


def swr_block(series: np.ndarray, h: int, target: float = TARGET) -> tuple[float, int]:
    R = _block_paths(series, h)

    def frac_survive(w: float) -> float:
        bal = np.ones(NUM_SIMS)
        alive = np.ones(NUM_SIMS, bool)
        for t in range(h):
            r = R[:, t]
            bal = np.where(alive, np.maximum(bal * (1 + r) - w * (1 + r / 2), 0.0), 0.0)
            alive &= bal > 0
        return alive.mean()

    lo, hi = 0.001, 0.20
    for _ in range(24):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if frac_survive(m) >= target else (lo, m)
    return lo * 100, NUM_SIMS


def describe(arr: np.ndarray) -> str:
    geo = np.expm1(np.log1p(arr).mean()) * 100
    return f"mean={arr.mean()*100:5.2f}%  vol={arr.std()*100:5.2f}%  geo={geo:5.2f}%"


def main() -> None:
    df = pd.read_excel(ensure_data(), sheet_name=0)
    countries = [
        c for c in df["country"].unique()
        if len(real_returns(df[df["country"] == c], EQUITY_WEIGHT)) > 0
    ]

    # Per-country real series, and an equal-weight world aggregate (a diversified investor).
    panel_rows = []
    for c in countries:
        t = real_returns(df[df["country"] == c], EQUITY_WEIGHT)
        for y, r in zip(t["year"].astype(int), t["r"]):
            panel_rows.append((y, c, r))
    panel = pd.DataFrame(panel_rows, columns=["year", "country", "r"])
    world = maybe_recenter(panel.groupby("year")["r"].mean().sort_index().values)
    usa = maybe_recenter(real_returns(df[df["country"] == "USA"], EQUITY_WEIGHT)["r"].values)

    eqp = int(EQUITY_WEIGHT * 100)
    rc = "" if RECENTER is None else f"  [re-centered to mean={RECENTER[0]*100:.1f}% vol={RECENTER[1]*100:.1f}%]"
    print(f"JST R6 · {eqp}/{100-eqp} portfolio · {int(TARGET*100)}% success{rc}")
    print(f"  USA   ({len(usa)} yrs): {describe(usa)}")
    print(f"  World ({len(world)} yrs, equal-wt {len(countries)} countries): {describe(world)}")
    print()
    print("SWR @ {}% by horizon:".format(int(TARGET * 100)))
    print("Horizon | USA overlap | World overlap | World block-bs(bl={}) | lit".format(BLOCK_LEN))
    lit = {20: 5.2, 25: 4.3, 30: 3.8, 35: 3.4, 40: 3.2, 45: 3.25, 50: 3.25, 60: 3.2}
    for h in HORIZONS:
        us, _ = swr_overlapping(usa, h)
        wo, _ = swr_overlapping(world, h)
        wb, _ = swr_block(world, h)
        print(f"{h:5d}y  |    {us:4.2f}%    |     {wo:4.2f}%     |        {wb:4.2f}%        | ~{lit.get(h,'')}%")


if __name__ == "__main__":
    main()
