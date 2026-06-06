#!/usr/bin/env python3
"""Shared JST Macrohistory loading and bootstrap helpers.

Historical glide-path modes use paired real stock/fixed-income returns from an
equal-weight world aggregate. The source workbook is downloaded on first use and
cached under the gitignored ``analysis/.data/`` directory.
"""

from __future__ import annotations

from dataclasses import dataclass
import os
import urllib.request

import numpy as np
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), ".data")
DATA_FILE = os.path.join(DATA_DIR, "JSTdatasetR6.xlsx")
DATA_URL = "https://www.macrohistory.net/app/download/9834512569/JSTdatasetR6.xlsx"


@dataclass(frozen=True)
class ReturnHistory:
    """Paired annual real stock and selected fixed-income returns."""

    years: np.ndarray
    equity: np.ndarray
    bonds: np.ndarray
    label: str
    country_count: int
    fixed_income: str = "bonds"

    @property
    def observations(self) -> int:
        return int(len(self.years))

    @property
    def start_year(self) -> int:
        return int(self.years[0])

    @property
    def end_year(self) -> int:
        return int(self.years[-1])


def ensure_data(path: str = DATA_FILE) -> str:
    """Return the JST workbook path, downloading the default cache on first use."""
    if os.path.exists(path):
        return path
    if path != DATA_FILE:
        raise FileNotFoundError(path)

    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"Downloading JST dataset -> {DATA_FILE} ...")
    req = urllib.request.Request(DATA_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as response, open(DATA_FILE, "wb") as output:
        output.write(response.read())
    return DATA_FILE


def load_jst_frame(path: str | None = None) -> pd.DataFrame:
    """Load the JST R6 workbook."""
    return pd.read_excel(ensure_data(path or DATA_FILE), sheet_name=0)


def real_stock_fixed_income_returns(
    sub: pd.DataFrame, fixed_income: str = "bonds"
) -> pd.DataFrame:
    """Convert one country's nominal stock and fixed-income returns to real returns."""
    if fixed_income not in ("bonds", "bills"):
        raise ValueError("fixed_income must be bonds or bills")

    sub = sub.sort_values("year").copy()
    # Calculate annual CPI changes on the calendar series before filtering returns. This
    # preserves the first valid return and avoids treating gaps as one-year inflation.
    sub["inflation"] = sub["cpi"].pct_change(fill_method=None)
    sub["equity"] = (1 + sub["eq_tr"]) / (1 + sub["inflation"]) - 1
    nominal_fixed_income = sub["bond_tr"] if fixed_income == "bonds" else sub["bill_rate"]
    sub["bonds"] = (1 + nominal_fixed_income) / (1 + sub["inflation"]) - 1
    return sub.dropna(subset=["inflation", "equity", "bonds"])[["year", "equity", "bonds"]]


def real_stock_bond_returns(sub: pd.DataFrame) -> pd.DataFrame:
    """Backward-compatible helper for paired real stock/bond returns."""
    return real_stock_fixed_income_returns(sub, "bonds")


def _as_history(
    frame: pd.DataFrame, label: str, country_count: int, fixed_income: str
) -> ReturnHistory:
    frame = frame.sort_values("year").dropna(subset=["equity", "bonds"])
    if frame.empty:
        raise ValueError(f"no paired stock/{fixed_income} returns available for {label}")
    return ReturnHistory(
        years=frame["year"].to_numpy(dtype=int),
        equity=frame["equity"].to_numpy(dtype=float),
        bonds=frame["bonds"].to_numpy(dtype=float),
        label=label,
        country_count=country_count,
        fixed_income=fixed_income,
    )


def load_country_returns(
    country: str, path: str | None = None, fixed_income: str = "bonds"
) -> ReturnHistory:
    """Load paired real stock/fixed-income returns for one JST country."""
    frame = load_jst_frame(path)
    returns = real_stock_fixed_income_returns(
        frame[frame["country"] == country], fixed_income
    )
    return _as_history(returns, country, 1, fixed_income)


def load_world_returns(
    path: str | None = None, fixed_income: str = "bonds"
) -> ReturnHistory:
    """Build equal-weight world real stock/fixed-income returns from JST countries."""
    frame = load_jst_frame(path)
    country_frames = []
    for country in frame["country"].dropna().unique():
        returns = real_stock_fixed_income_returns(
            frame[frame["country"] == country], fixed_income
        ).copy()
        if not returns.empty:
            returns["country"] = country
            country_frames.append(returns)
    if not country_frames:
        raise ValueError(f"no paired stock/{fixed_income} returns available in JST dataset")

    panel = pd.concat(country_frames, ignore_index=True)
    world = panel.groupby("year", as_index=False)[["equity", "bonds"]].mean()
    label = "JST R6 equal-weight world"
    if fixed_income != "bonds":
        label += f" ({fixed_income})"
    return _as_history(
        world,
        label,
        len(country_frames),
        fixed_income,
    )


def sample_indices(
    observations: int,
    n_years: int,
    n_paths: int,
    *,
    mode: str,
    block_years: int,
    seed: int,
) -> np.ndarray:
    """Sample historical row indices as iid years or stationary circular blocks."""
    if observations < 1:
        raise ValueError("historical return series must contain at least one observation")
    if n_years < 1 or n_paths < 1:
        raise ValueError("n_years and n_paths must be >= 1")
    if block_years < 1:
        raise ValueError("block_years must be >= 1")

    rng = np.random.default_rng(seed)
    if mode == "historical-iid":
        return rng.integers(0, observations, size=(n_years, n_paths))
    if mode != "historical-block":
        raise ValueError(f"unsupported historical mode: {mode}")

    # Politis-Romano stationary bootstrap: continue the current circular block
    # with probability 1 - 1/L, otherwise restart at a random observation. This
    # makes block lengths geometric with expected length L.
    indices = np.empty((n_years, n_paths), dtype=int)
    indices[0] = rng.integers(0, observations, size=n_paths)
    restart_probability = 1.0 / block_years
    for year in range(1, n_years):
        starts = rng.integers(0, observations, size=n_paths)
        restarts = rng.random(n_paths) < restart_probability
        continuations = (indices[year - 1] + 1) % observations
        indices[year] = np.where(restarts, starts, continuations)
    return indices


def sample_return_paths(
    history: ReturnHistory,
    n_years: int,
    n_paths: int,
    *,
    mode: str,
    block_years: int,
    seed: int,
) -> tuple[np.ndarray, np.ndarray]:
    """Return paired stock/fixed-income bootstrap paths with shape ``(years, paths)``."""
    indices = sample_indices(
        history.observations,
        n_years,
        n_paths,
        mode=mode,
        block_years=block_years,
        seed=seed,
    )
    return history.equity[indices], history.bonds[indices]
