# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
npm start          # Start development server on http://localhost:3000
npm run build      # Build for production
npm test           # Run tests
npm run deploy     # Deploy to GitHub Pages
```

## Project Overview

A React-based financial calculator that compares the financial outcomes of renting versus buying a home in Canada. Users input assumptions about their personal situation, and the app generates a year-by-year net worth comparison over their chosen amortization period (5–30 years). Results include Monte Carlo confidence bands and a probability-based summary of which option is more likely to win.

## Architecture

### 1. UI Layer (`src/components/`)
- **Main.jsx**: Top-level state container. Holds `userInput` (initialized from `DEFAULTS`) and the `simulateUncertainty` toggle. Passes handlers to the form and result components.
- **UserInputForm.jsx**: Form with sections for rent, property, mortgage, investment/tax, and transaction costs. Switches between single-value inputs and two-thumb range sliders based on the `simulateUncertainty` toggle.
- **UserInputFormItem.jsx / UserInputRangeItem.jsx**: Reusable form controls. Range slider displays `base ± 2σ` (≈95% confidence range) and emits new `(base, sigma)` on change.
- **FieldLabel.jsx**: Label with optional helper text tooltip.
- **Result.jsx**: Validates input, then renders `NetWorthChart` (always with MC bands).
- **NetWorthChart.jsx**: Computes both the deterministic median path and Monte Carlo percentile bands. Renders a `Summary` Alert with probability-tiered language, then the chart.
- **Header.jsx / Footer.jsx**: Static UI.

### 2. Calculation Layer (`src/utils/`)
- **math.jsx**: Deterministic year-by-year calculations. The exported `calculateNetWorthAtYearEnd()` returns `{ year, renterNetWorth, ownerNetWorth, difference }` and is used for the median line on the chart.
- **monteCarlo.js**: Stochastic simulation. `runMonteCarlo()` runs 1,000 simulations and returns per-year percentiles (P25, median, P75) for both renter and owner, plus `renterWinPct` (fraction of simulations where renter > owner at that year).
- **presets.js**: `DEFAULTS` (input values) and `UNCERTAINTIES` (sigmas) plus `PRESETS` (preset scenarios for Bay Street Condo, Vancouver Townhouse, Calgary SFH).
- **validation.js**: `FIELD_CONSTRAINTS` (per-field min/max/step), `SLIDER_BOUNDS` (range slider track domains), and `validateUserInput()` (returns errors object).
- **format.js**: `formatCAD()` and `formatCADCompact()` for currency display.

### 3. Styling
Uses **Mantine** UI components (`@mantine/core`) and **Recharts** for charts. Layout is a Mantine `Grid` — inputs on left, results on right.

## Key Modeling Assumptions

1. **Renter invests the surplus**: Each year, the renter invests the difference between the owner's total cost (mortgage + property tax + maintenance) and the renter's rent. Surplus is added mid-year (earns half-year return).
2. **Mortgage scope**: The calculator only models conventional mortgages with at least 20% down and amortization up to 25 years. CMHC-insured high-ratio loans and 30-year insured eligibility are intentionally out of scope.
3. **Mortgage compounding**: Semi-annual compounding (Canadian convention).
4. **Mortgage renewal**: 5-year terms. Rate redrawn at each renewal in the Monte Carlo path; deterministic path holds rate constant.
5. **Tax treatment**:
   - **Dividends**: Taxed annually at `dividendTaxRate`. After-tax dividends increase cost basis to prevent double-taxation.
   - **Capital gains**: Tax applied at sale (year N) on `portfolioValue − bookValue`. No tax credit on losses.
   - **Principal residence**: Capital gains on the home are exempt (Canadian rule).
6. **Selling costs**: Owner's terminal net worth = `homePrice × (1 − sellersClosingCostPercentage) − mortgageBalance`.
7. **Holding period vs amortization**: `holdingPeriod` (default 12, matching the ~10–13y Canadian median tenure) is the year at which the owner sells and the renter–vs–buyer comparison is decided. `amortizationPeriod` only drives mortgage payment size and the rate-renewal schedule. The two are independent: the simulation horizon is `max(amortizationPeriod, holdingPeriod)`. Net-worth paths beyond `holdingPeriod` are shown on the chart as hypothetical (if-held-longer) extrapolation; the Summary's win % is computed at `holdingPeriod`.
8. **Independent growth assumptions**: `rentIncreaseRate` applies only to rent payments, `ownerCostGrowthRate` applies to recurring owner costs (maintenance/insurance, property tax, condo fees), and `homePriceGrowthRate` applies only to the home's market value.

## Monte Carlo Simulation Architecture

The MC simulation uses a **two-layer uncertainty model**:

### Layer 1: Long-run mean uncertainty (user-controllable)
User-facing sigmas in `UNCERTAINTIES` capture uncertainty about the long-run expected value of each variable over the time horizon. Drawn once per simulation in `drawScenario()`:

| Sigma | Default | Captures |
|---|---|---|
| `homePriceGrowthSigma` | 2.0 | Long-run home price growth mean |
| `investmentReturnSigma` | 3.0 | Long-run portfolio return mean |
| `rentIncreaseSigma` | 0.75 | Long-run rent growth mean |
| `ownerCostGrowthSigma` | 0.75 | Long-run recurring owner cost growth mean |
| `mortgageRateSigma` | 1.5 | Long-run mortgage rate mean |
| `dividendYieldSigma` | 0.3 | Long-run dividend yield mean |

Note: `maintenanceCostPercentage` and `propertyTaxRate` are user-known starting levels and intentionally have no anchor sigma. Their future dollar path is driven by `ownerCostGrowthRate` / `ownerCostGrowthSigma`, independent of rent growth and home price appreciation.

### Layer 2: Annual realized volatility (hardcoded)
`ANNUAL_VOL` constants in `monteCarlo.js` capture year-to-year noise around the long-run mean. Drawn each year in `drawPath()`:

| Constant | Value | Notes |
|---|---|---|
| `inflation` | 1.0 | Hidden common factor σ |
| `homePriceIdio` | 4.0 | Idiosyncratic real housing σ |
| `investment` | 14.0 | Equity lognormal σ (annual) |
| `rentIdio` | 1.0 | Idiosyncratic rent σ |
| `ownerCostIdio` | 1.0 | Idiosyncratic recurring owner cost σ |
| `dividend` | 0.2 | |
| `mortgageRenewal` | 1.0 | Shock at each 5-year renewal |

### Inflation common factor
`INFLATION_BETA = { homePrice: 0.8, rent: 0.8, ownerCost: 0.8, mortgageRate: 0.5 }` couples home prices, rents, recurring owner costs, and mortgage rates through a hidden inflation factor — so in high-inflation scenarios, all four rise together (realistic correlation structure).

### Investment returns
Drawn as **lognormal** to preserve the arithmetic mean: `logMean = log(1 + μ) − σ²/2`, then `R = exp(logMean + σ·Z) − 1`. This avoids volatility-drag bias that would result from naive normal sampling.

### Mortgage renewals
At year multiples of 5, the rate is redrawn (with current year's inflation shock factored in) and the remaining balance is re-amortized at the new rate over the remaining years. Models Canadian fixed-rate convention.

### Pairwise comparison
Renter and owner share the same scenario path in each simulation. This enables fair per-simulation comparison and the `renterWinPct` calculation (used in the Summary tier logic).

## Summary Tier Logic (NetWorthChart.jsx)

The `Summary` component picks language based on the final-year `renterWinPct`:

| Winner's win % | Title | Color |
|---|---|---|
| ≥ 80% | "{Renting/Buying} clearly leads" | teal / indigo |
| 65–80% | "{Renting/Buying} likely leads" | teal / indigo |
| < 65% | "Too close to call" | gray |

The body always shows the actual win percentage and adds context: median crossover years if any, or a sensitivity warning when close.

## Validated Modeling Properties

The simulation has been audited for correctness:

- ✓ Lognormal investment returns preserve arithmetic mean (no volatility-drag bias)
- ✓ Cost basis tracks after-tax dividends + surplus (prevents double-taxation at sale)
- ✓ Capital losses generate no tax credit (matches real tax law)
- ✓ Mortgage re-amortization at renewal computes new payment from remaining balance
- ✓ Mid-year surplus investment matches deterministic math (`× (1 + r/2)`)
- ✓ Paired scenarios enable fair `renterWinPct` calculation
- ✓ Dividend yield bounded above by `max(investmentReturnMean, 0)` so non-negative dividends are allowed even when realized return is negative

Known limitations (intentional simplifications):
- No equity-inflation correlation (empirically weak negative correlation exists)
- No equity autocorrelation (mild mean-reversion at long horizons)
- Portfolio can go negative if rent dramatically exceeds owner costs (no borrowing-rate floor)

## Development Notes

- `userInput` is stored as numbers in `Main.jsx` state. Form inputs coerce strings via `+value`.
- Validation runs on every render in `Main.jsx` via `validateUserInput()`. If errors exist, `Result.jsx` shows an "Incomplete inputs" alert instead of the chart.
- Both deterministic (`calculateNetWorthAtYearEnd`) and Monte Carlo (`runMonteCarlo`) are memoized in `NetWorthChart.jsx` with `userInput` as dependency.
- Deployed to GitHub Pages from `/build`. Homepage in `package.json` must remain the GitHub Pages URL.
- Simulation horizon = `amortizationPeriod` (not hardcoded 30).
