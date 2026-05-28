# CLAUDE.md

This file provides guidance to AI code agents when working with code in this repository.

## Quick Start

```bash
npm run dev          # Start dev server on http://localhost:3000/rent-vs-buy
npm run build        # Static export to ./out (output: "export")
npm run lint         # ESLint (flat config: next/core-web-vitals + typescript + prettier)
npm run typecheck    # tsc --noEmit
npm run format       # Prettier (format:check to verify only)
npm test             # Vitest unit + React Testing Library component tests
npm run test:e2e     # Playwright end-to-end tests (auto-starts the dev server)
```

The codebase is **TypeScript** (`.ts`/`.tsx`); shared domain types live in `src/types.ts`.

## CI / CD

- **`.github/workflows/ci.yml`** runs on every PR and on push to `main`: lint, typecheck,
  format check, unit tests, build, and Playwright e2e. Make these required status checks in the
  repo's branch protection so PRs cannot merge until they pass.
- **`.github/workflows/deploy.yml`** runs the same lint/typecheck/format/test gates before
  building and publishing `./out` to GitHub Pages, so `main` only ships if checks pass.

## Project Overview

A **Next.js (App Router)** financial calculator that compares the financial outcomes of renting versus buying a home in Canada. Users input assumptions about their personal situation, and the app generates a year-by-year net worth comparison over 50 years. Results include Monte Carlo confidence bands and a probability-based summary of which option is more likely to win.

The app is statically exported (`output: "export"`) and served from GitHub Pages under the `/rent-vs-buy` base path. React Compiler is enabled (`reactCompiler: true` in `next.config.ts`).

## Architecture

### 0. App Entry (`src/app/`)

- **layout.tsx** (server component): root `<html>`, Mantine `ColorSchemeScript`, favicon, Lato font (via `next/font/google`), page `metadata`/`viewport`. Wraps children in `Providers`.
- **providers.tsx** (`"use client"`): `MantineProvider` with the teal/Lato theme and a `localStorageColorSchemeManager` (key `rent-vs-buy-color-scheme`).
- **page.tsx** (`"use client"`): renders `Header` + `Footer`, and lazy-loads `Main` with `next/dynamic({ ssr: false })` so localStorage-backed state never causes a hydration mismatch.
- **globals.css**: Tailwind v4 + Mantine, ordered via CSS `@layer` (`tailwind-base, mantine, tailwind-utilities`) so Tailwind's preflight never overrides Mantine.

### 1. UI Layer (`src/components/`)

- **Main.tsx**: Top-level state container. Holds `userInput`, `expandedFields` (which rate fields show the uncertainty input), `customPresets`, `hiddenBuiltins`, and `activePresetId`. Passes handlers to the form and result components. All state is persisted to localStorage via `storage.ts`.
- **UserInputForm.tsx**: Form organized into Accordion sections (Rent, Property, Mortgage, Investment & Tax, Transaction Costs). Preset buttons at the top let users apply, save, or delete scenarios. Rate fields can expand inline to reveal a sigma (uncertainty) input.
- **UserInputFormItem.tsx**: Thin wrapper around Mantine `NumberInput` with a `FieldLabel`.
- **CurrencyPercentItem.tsx**: Recurring-cost input that toggles between a dollar amount (per year) and a percentage of today's home price. Shared by Property Tax and Maintenance (extracted to remove duplicated $/% conversion logic).
- **UserInputRangeItem.tsx**: Form control for rate fields that support uncertainty. Shows a base value `NumberInput` with a toggle to expand an inline `±2σ` input and a live range readout (`low% to high%`). The sigma input displays `2σ` (the full ±spread) and converts back to `σ` on change.
- **FieldLabel.tsx**: Label with optional helper text popover.
- **Result.tsx**: Validates input, then renders `NetWorthChart` (always with MC bands).
- **NetWorthChart.tsx**: Dispatches Monte Carlo work to a Web Worker, receives per-year percentiles, and renders the chart. Also renders a `Summary` Alert with probability-tiered language, a collapsible data table, and a CSV download button.
- **Header.tsx / Footer.tsx**: Static UI.

### 2. Calculation Layer (`src/utils/`)

- **math.ts**: Math utilities.
- **monteCarlo.ts**: Stochastic simulation. `runMonteCarlo()` runs `NUM_SIMULATIONS` simulations and returns per-year percentiles (P25, median, P75) for both renter and owner, plus `renterWinPct` (fraction of simulations where renter > owner at that year).
- **presets.ts**: `DEFAULTS` (input values), `INPUT_UNCERTAINTIES` (default sigmas), `PRESETS` (built-in scenario presets), and `getActivePreset()` (matches current input to a preset by value).
- **validation.ts**: `FIELD_CONSTRAINTS` (per-field min/max/step) and `validateUserInput()` (returns errors object).
- **format.ts**: `formatCAD()` and `formatCADCompact()` for currency display.
- **storage.ts**: localStorage helpers for persisting `userInput`, `expandedFields`, `customPresets`, `hiddenBuiltins`, and `activePresetId`. Also handles migration from the legacy `rvb_advanced` key via `consumeLegacyAdvanced()`.

Shared domain types (`UserInput`, `UserInputKey`, `SigmaKey`, `Preset`, `MonteCarloYear`, etc.) live in **`src/types.ts`**.

### 3. Web Worker

`src/workers/monteCarloWorker.ts` runs `runMonteCarlo()` off the main thread. `NetWorthChart` creates the worker on mount, sends a new message (with a `requestId`) whenever debounced `userInput` changes, and only applies results whose `requestId` matches the latest request — dropping stale responses automatically.

### 4. Styling

Uses **Mantine** UI components (`@mantine/core`) and **Recharts** for charts. Layout is a Mantine `Grid` — inputs on left, results on right. **Tailwind v4** is also available for utility-class styling; its preflight is layered below Mantine (see `src/app/globals.css`) so the two coexist without conflicts.

### 5. Testing

- **Vitest + React Testing Library** (`vitest.config.ts`, `vitest.setup.ts`): unit tests live next to source as `*.test.ts` (e.g. `src/utils/math.test.ts`) and component tests as `*.test.tsx` (e.g. `src/components/Footer.test.tsx`). Component tests render through `src/test-utils.tsx`, which wraps RTL's `render` in `MantineProvider`. The setup file mocks `matchMedia`/`ResizeObserver` (absent in jsdom).
- **Playwright** (`playwright.config.ts`): end-to-end specs in `e2e/`. The config auto-starts `npm run dev` and drives the app under the `/rent-vs-buy` base path.

### Memoization & React Compiler

React Compiler is on, so it auto-memoizes. Do **not** add `useMemo`/`useCallback`/`React.memo` for performance — write plain derivations and let the compiler handle it. (`useRef`/`useState`/`useEffect` and Mantine's `useDebouncedValue` are not memoization and stay.)

## Key Modeling Assumptions

1. **Renter invests the surplus**: Each year, the renter invests the difference between the owner's total cost (mortgage + property tax + maintenance) and the renter's rent. Surplus is added mid-year (earns half-year return).
2. **Mortgage**: The calculator only models conventional mortgages with at least 20% down and amortization up to 25 years. CMHC-insured high-ratio loans and 30-year insured eligibility are intentionally out of scope.
3. **Mortgage compounding**: Semi-annual compounding (Canadian convention).
4. **Mortgage renewal**: 5-year terms. Rate redrawn at each renewal in Monte Carlo.
5. **Tax treatment**:
   - **Dividends**: Taxed annually at `dividendTaxRate`. After-tax dividends increase cost basis to prevent double-taxation.
   - **Capital gains**: Tax applied at sale (year N) on `portfolioValue − bookValue`. No tax credit on losses.
   - **Principal residence**: Capital gains on the home are exempt (Canadian rule).
6. **Selling costs**: Owner's terminal net worth = `homePrice × (1 − sellerClosingCostsPct) − mortgageBalance`.
7. **Holding period vs simulation horizon**: `holdingPeriod` (default 12, matching the ~10–13y Canadian median tenure) is the year at which the owner sells and the renter–vs–buyer comparison is decided. The Summary's win % is computed at `holdingPeriod`. The simulation horizon `SIMULATION_HORIZON_YEARS` is hardcoded at 50 years.
8. **Independent growth assumptions**: `rentIncreaseRate` applies only to rent payments, `ownerCostGrowthRate` applies to recurring owner costs (maintenance/insurance, property tax, condo fees), and `homePriceGrowthRate` applies only to the home's market value.

## Monte Carlo Simulation Architecture

The MC simulation uses a **two-layer uncertainty model**:

### Layer 1: Long-run mean uncertainty (user-controllable)

User-facing sigmas in `INPUT_UNCERTAINTIES` capture uncertainty about the long-run expected value of each variable over the time horizon. Drawn once per simulation in `drawScenario()`:

| Sigma                   | Captures                                  |
| ----------------------- | ----------------------------------------- |
| `homePriceGrowthSigma`  | Long-run home price growth mean           |
| `investmentReturnSigma` | Long-run portfolio return mean            |
| `rentIncreaseSigma`     | Long-run rent growth mean                 |
| `ownerCostGrowthSigma`  | Long-run recurring owner cost growth mean |
| `mortgageRateSigma`     | Long-run mortgage rate mean               |
| `dividendYieldSigma`    | Long-run dividend yield mean              |

Note: `maintPct` and `propertyTaxRate` are user-known starting levels and intentionally have no anchor sigma. Their future dollar path is driven by `ownerCostGrowthRate` / `ownerCostGrowthSigma`, independent of rent growth and home price appreciation.

### Layer 2: Annual realized volatility (hardcoded)

`ANNUAL_VOL` constants in `monteCarlo.js` capture year-to-year noise around the long-run mean. Drawn each year in `drawPath()`:

| Constant        | Notes                        |
| --------------- | ---------------------------- |
| `inflation`     | Hidden common factor σ       |
| `homePriceIdio` | Idiosyncratic real housing σ |
| `investment`    | Equity lognormal σ (annual)  |

### Inflation common factor

`INFLATION_BETA` couples home prices, rents, recurring owner costs, and mortgage rates through a hidden inflation factor — so in high-inflation scenarios, all four rise together (realistic correlation structure).

### Investment returns

Drawn as **lognormal** to preserve the arithmetic mean: `logMean = log(1 + μ) − σ²/2`, then `R = exp(logMean + σ·Z) − 1`. This avoids volatility-drag bias that would result from naive normal sampling.

### Mortgage renewals

At year multiples of 5, the rate is redrawn (with current year's inflation shock factored in) and the remaining balance is re-amortized at the new rate over the remaining years. Models Canadian fixed-rate convention.

### Pairwise comparison

Renter and owner share the same scenario path in each simulation. This enables fair per-simulation comparison and the `renterWinPct` calculation (used in the Summary tier logic).

## Summary Tier Logic (NetWorthChart.jsx)

The `Summary` component picks language based on the final-year `renterWinPct`:

| Winner's win % | Title                            | Color         |
| -------------- | -------------------------------- | ------------- |
| ≥ 70%          | "{Renting/Buying} clearly leads" | teal / indigo |
| 60–70%         | "{Renting/Buying} likely leads"  | teal / indigo |
| < 60%          | "Too close to call"              | gray          |

The body always shows the actual win percentage and adds a sensitivity warning when close.

## Development Notes

- `userInput` is stored as numbers in `Main.jsx` state. Form inputs coerce strings via `+value`.
- Validation runs on every render in `Main.jsx` via `validateUserInput()`. If errors exist, `Result.jsx` shows an "Incomplete inputs" alert instead of the chart.
- Monte Carlo runs in a Web Worker (debounced 150 ms). `NetWorthChart` tracks a `requestId` counter to discard responses from superseded requests.
- Deployed to GitHub Pages from `/build`. Homepage in `package.json` must remain the GitHub Pages URL.
