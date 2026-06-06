from __future__ import annotations

from contextlib import redirect_stderr
import io
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd

from glide_path_recommender import (
    PWL_CURVE,
    _HistoricalMarket,
    _build_market,
    recommend_glide_path,
)
from jst_history import (
    ReturnHistory,
    load_world_returns,
    real_stock_bond_returns,
    real_stock_fixed_income_returns,
    sample_indices,
    sample_return_paths,
)
from recommend_glide import main as cli_main


def synthetic_history() -> ReturnHistory:
    return ReturnHistory(
        years=np.arange(2000, 2005),
        equity=np.array([0.10, -0.20, 0.30, -0.40, 0.50]),
        bonds=np.array([0.01, 0.02, 0.03, 0.04, 0.05]),
        label="synthetic world",
        country_count=2,
    )


class JstHistoryTests(unittest.TestCase):
    def test_real_returns_and_world_aggregation(self):
        frame = pd.DataFrame(
            [
                ("A", 2000, None, None, None, 100.0),
                ("A", 2001, 0.20, 0.10, 0.05, 110.0),
                ("B", 2000, None, None, None, 100.0),
                ("B", 2001, 0.10, 0.00, 0.02, 100.0),
            ],
            columns=["country", "year", "eq_tr", "bond_tr", "bill_rate", "cpi"],
        )
        country = real_stock_bond_returns(frame[frame["country"] == "A"])
        self.assertAlmostEqual(country.iloc[0]["equity"], 1.2 / 1.1 - 1)
        self.assertAlmostEqual(country.iloc[0]["bonds"], 0.0)
        bills = real_stock_fixed_income_returns(frame[frame["country"] == "A"], "bills")
        self.assertAlmostEqual(bills.iloc[0]["bonds"], 1.05 / 1.1 - 1)

        with patch("jst_history.load_jst_frame", return_value=frame):
            world = load_world_returns()
            world_bills = load_world_returns(fixed_income="bills")
        self.assertEqual(world.country_count, 2)
        self.assertEqual(world.observations, 1)
        self.assertEqual(world.fixed_income, "bonds")
        self.assertAlmostEqual(world.equity[0], ((1.2 / 1.1 - 1) + 0.10) / 2)
        self.assertAlmostEqual(world.bonds[0], 0.0)
        self.assertEqual(world_bills.fixed_income, "bills")
        self.assertAlmostEqual(
            world_bills.bonds[0], ((1.05 / 1.1 - 1) + 0.02) / 2
        )

        with self.assertRaisesRegex(ValueError, "fixed_income"):
            real_stock_fixed_income_returns(frame, "cash")

    def test_historical_iid_preserves_pairs(self):
        history = synthetic_history()
        seed = 42
        expected = np.random.default_rng(seed).integers(
            0, history.observations, size=(6, 4)
        )
        indices = sample_indices(
            history.observations,
            6,
            4,
            mode="historical-iid",
            block_years=8,
            seed=seed,
        )
        np.testing.assert_array_equal(indices, expected)

        equity, bonds = sample_return_paths(
            history, 6, 4, mode="historical-iid", block_years=8, seed=seed
        )
        np.testing.assert_array_equal(equity, history.equity[expected])
        np.testing.assert_array_equal(bonds, history.bonds[expected])

    def test_historical_block_is_stationary_preserves_pairs_and_wrap(self):
        history = synthetic_history()
        seed = 7
        block_years = 3
        indices = sample_indices(
            history.observations,
            8,
            5,
            mode="historical-block",
            block_years=block_years,
            seed=seed,
        )

        rng = np.random.default_rng(seed)
        expected = np.empty_like(indices)
        expected[0] = rng.integers(0, history.observations, size=indices.shape[1])
        restarts_by_year = []
        for year in range(1, len(expected)):
            starts = rng.integers(0, history.observations, size=indices.shape[1])
            restarts = rng.random(indices.shape[1]) < 1 / block_years
            restarts_by_year.append(restarts)
            expected[year] = np.where(
                restarts,
                starts,
                (expected[year - 1] + 1) % history.observations,
            )
        np.testing.assert_array_equal(indices, expected)

        restarts = np.stack(restarts_by_year)
        continuations = ~restarts
        diffs = np.diff(indices, axis=0) % history.observations
        np.testing.assert_array_equal(
            diffs[continuations], np.ones(continuations.sum(), dtype=int)
        )

        equity, bonds = sample_return_paths(
            history, 8, 5, mode="historical-block", block_years=block_years, seed=seed
        )
        np.testing.assert_array_equal(equity, history.equity[indices])
        np.testing.assert_array_equal(bonds, history.bonds[indices])
        self.assertTrue(np.any((indices[:-1] == history.observations - 1) & (indices[1:] == 0)))

    def test_historical_block_uses_configured_average_length(self):
        indices = sample_indices(
            10_000,
            500,
            1_000,
            mode="historical-block",
            block_years=10,
            seed=19,
        )
        restart_rate = np.mean(indices[1:] != (indices[:-1] + 1) % 10_000)
        self.assertAlmostEqual(restart_rate, 0.1, delta=0.002)

    def test_invalid_historical_sampling_inputs(self):
        with self.assertRaisesRegex(ValueError, "block_years"):
            sample_indices(5, 4, 2, mode="historical-block", block_years=0, seed=1)
        with self.assertRaisesRegex(ValueError, "unsupported historical mode"):
            sample_indices(5, 4, 2, mode="other", block_years=2, seed=1)


class GlidePathMarketTests(unittest.TestCase):
    def test_historical_mix_and_leverage(self):
        history = synthetic_history()
        market = _HistoricalMarket(
            history, mode="historical-iid", block_years=8, borrow_real=0.02
        )
        sample = (
            np.array([[0.10, -0.20]]),
            np.array([[0.04, 0.06]]),
        )
        weights = np.array([0.0, 0.5, 1.0, 1.5])
        actual = market.annual_returns(weights, sample, 0)
        expected = np.array(
            [
                [0.04, 0.06],
                [0.07, -0.07],
                [0.10, -0.20],
                [0.14, -0.31],
            ]
        )
        np.testing.assert_allclose(actual, expected)

        mean = market.mean_returns(weights)
        eq_mean = history.equity.mean()
        bond_mean = history.bonds.mean()
        np.testing.assert_allclose(
            mean,
            [
                bond_mean,
                0.5 * eq_mean + 0.5 * bond_mean,
                eq_mean,
                1.5 * eq_mean - 0.5 * 0.02,
            ],
        )

    def test_market_validation_and_metadata(self):
        history = synthetic_history()
        with self.assertRaisesRegex(ValueError, "return_mode"):
            _build_market("other", PWL_CURVE, 2.1, True, 2.0, 8, history)
        with self.assertRaisesRegex(ValueError, "block_years"):
            _build_market("historical-block", PWL_CURVE, 2.1, True, 2.0, 0, history)

        market = _build_market(
            "historical-block", PWL_CURVE, 2.1, True, 2.0, 3, history
        )
        self.assertEqual(market.metadata["return_mode"], "historical-block")
        self.assertEqual(market.metadata["history_start_year"], 2000)
        self.assertEqual(market.metadata["history_end_year"], 2004)
        self.assertEqual(market.metadata["history_observations"], 5)
        self.assertEqual(market.metadata["historical_fixed_income"], "bonds")
        self.assertEqual(market.metadata["block_method"], "stationary-circular")
        self.assertEqual(market.metadata["block_years"], 3)

        with self.assertRaisesRegex(ValueError, "historical_fixed_income"):
            _build_market(
                "historical-iid",
                PWL_CURVE,
                2.1,
                True,
                2.0,
                3,
                historical_fixed_income="cash",
            )
        with self.assertRaisesRegex(ValueError, "only to historical modes"):
            _build_market(
                "iid-mc",
                PWL_CURVE,
                2.1,
                True,
                2.0,
                3,
                historical_fixed_income="bills",
            )
        with self.assertRaisesRegex(ValueError, "does not match"):
            _build_market(
                "historical-iid",
                PWL_CURVE,
                2.1,
                True,
                2.0,
                3,
                history,
                historical_fixed_income="bills",
            )

    def test_default_and_explicit_iid_are_identical(self):
        implicit = self._recommend()
        explicit = self._recommend(return_mode="iid-mc")
        self.assertEqual(implicit, explicit)

    def test_all_modes_are_deterministic_end_to_end(self):
        history = synthetic_history()
        for mode in ("iid-mc", "historical-iid", "historical-block"):
            with self.subTest(mode=mode), patch(
                "glide_path_recommender._load_world_history", return_value=history
            ):
                first = self._recommend(return_mode=mode, block_years=2)
                second = self._recommend(return_mode=mode, block_years=2)
            self.assertEqual(first, second)
            self.assertEqual(first["params"]["return_mode"], mode)
            if mode != "iid-mc":
                self.assertEqual(first["params"]["history_source"], "synthetic world")

    def test_cli_rejects_custom_curve_for_historical_mode(self):
        stderr = io.StringIO()
        with redirect_stderr(stderr), self.assertRaises(SystemExit):
            cli_main(["--mode", "historical-iid", "--curve", "curve.csv"])
        self.assertIn("--curve is only supported", stderr.getvalue())

    def test_cli_rejects_historical_fixed_income_for_iid(self):
        stderr = io.StringIO()
        with redirect_stderr(stderr), self.assertRaises(SystemExit):
            cli_main(["--historical-fixed-income", "bills"])
        self.assertIn("applies only to historical modes", stderr.getvalue())

    def test_historical_bills_selects_bill_history(self):
        bill_history = ReturnHistory(
            years=np.arange(2000, 2005),
            equity=np.array([0.10, -0.20, 0.30, -0.40, 0.50]),
            bonds=np.array([0.005, 0.006, 0.007, 0.008, 0.009]),
            label="synthetic world (bills)",
            country_count=2,
            fixed_income="bills",
        )
        with patch(
            "glide_path_recommender._load_world_history", return_value=bill_history
        ) as loader:
            result = self._recommend(
                return_mode="historical-iid", historical_fixed_income="bills"
            )
        loader.assert_called_once_with("bills")
        self.assertEqual(result["params"]["historical_fixed_income"], "bills")

    @staticmethod
    def _recommend(**overrides):
        params = dict(
            accum_years=2,
            retire_years=2,
            interval=2,
            n_paths=40,
            grid_step=0.5,
            passes=1,
            seed=123,
            current_savings=100_000,
            annual_contribution=10_000,
            target_income=40_000,
            guaranteed_income=20_000,
        )
        params.update(overrides)
        return recommend_glide_path(**params)


if __name__ == "__main__":
    unittest.main()
