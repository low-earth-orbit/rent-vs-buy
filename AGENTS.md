# CLAUDE.md

This file provides guidance to AI code agents when working with code in this repository.

## Quick Start

```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Static export to ./out (output: "export")
npm run lint         # ESLint (flat config: next/core-web-vitals + typescript + prettier)
npm run typecheck    # tsc --noEmit
npm run format       # Prettier (format:check to verify only)
npm test             # Vitest unit + React Testing Library component tests
npm run test:e2e     # Playwright end-to-end tests (auto-starts the dev server)
```

`dev` and `build` set `NODE_OPTIONS=--max-old-space-size=8192`. A one-shot build only needs
~700 MB, but the long-lived Turbopack dev server (HMR + React Compiler) grows over a session and
will OOM at Node's ~4 GB default — hence the 8 GB ceiling. If the dev server still climbs to the
limit after hours of editing, restart it. Always invoke via `npm run …` so the flag applies.

The codebase is **TypeScript** (`.ts`/`.tsx`); shared domain types live in `src/types.ts`.

## Multi-Agent Model Workflow

The user runs both Claude and Codex and mixes them by role. Split work by where the risk is, and
match the model to the task — the cheapest model that will get it right, not the default.

**Roles**

- **Claude (strong model) plans and reviews** where the risk is conceptual: product direction, UX
  and copy, finance / retirement / glide-path modeling assumptions, architecture, and edge cases.
  Ask Claude for a scoped plan or a diff review, not to grind out large mechanical edits.
- **Codex executes and verifies** where the risk is concrete: repository edits, multi-file
  refactors, tests, lint/typecheck/build fixes, and browser/Playwright checks.

**Default handoff:** Claude drafts the plan and names the risks → Codex implements it → Claude
reviews the diff for conceptual issues and out-of-scope changes → Codex applies valid findings and
runs the checks. **One writer at a time** — don't let both edit the working tree at once.

**Choosing the Codex model (pick it explicitly).** `~/.codex/config.toml` defaults to
`gpt-5.4-mini` at `low` reasoning — too weak for non-trivial work (it has changed unrelated files
and under-reported regressions). Override per invocation:

- Nuanced / multi-file / engine or modeling work → `gpt-5.5` at high reasoning.
- Bulk mechanical work (label casing, formatting, renames, repetitive edits) → `gpt-5.4`, or
  `gpt-5.5` at lower reasoning — cheaper than spending premium Claude turns on it.
- `gpt-5.4-mini` only for the most trivial, fully-specified edits.

Slugs: `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`. Run non-interactively as
`codex exec -m <model> -c model_reasoning_effort=<level> -s workspace-write -C <repo> "<task>" < /dev/null`
(close stdin or it hangs), and tell it not to commit/push unless asked.

**Always review the Codex diff before trusting it.** Out-of-scope edits (touching config, fonts, or
files outside the task), logic changes hidden inside a "mechanical" pass, and glossed-over
regressions are the failure mode to catch.

## CI / CD

- **`.github/workflows/ci.yml`** runs on every PR and on push to `main`: lint, typecheck,
  format check, unit tests, build, and Playwright e2e. Make these required status checks in the
  repo's branch protection so PRs cannot merge until they pass.
- **`.github/workflows/deploy.yml`** runs the same lint/typecheck/format/test gates before
  building and publishing `./out` to GitHub Pages, so `main` only ships if checks pass.

## Project Overview

A **Next.js (App Router)** site hosting a collection of personal finance calculators for Canada. The site is statically exported (`output: "export"`) and served from GitHub Pages under the `/personal-finance` base path. React Compiler is enabled (`reactCompiler: true` in `next.config.ts`).

A hub landing page at `/` links to each tool, and every tool lives at its own route:

- **Rent vs Buy** (`/rent-vs-buy`): compares the financial outcomes of renting versus buying a home. Users input assumptions, and the app generates a year-by-year net worth comparison over 50 years with Monte Carlo confidence bands and a probability-based summary of which option is more likely to win.
- **When can I retire?** (`/retirement`): a quick retirement reality check. Projects a single combined portfolio in real (today's) dollars, grows savings until retirement, then draws from the portfolio to top up guaranteed income (CPP/OAS/DB, entered as a flat taxable amount) to a target gross income (a % of current income). Reports the earliest feasible retirement age. Deterministic single-return for now; Monte Carlo planned. Engine in `src/utils/retirement/`, components in `src/components/retirement/`.
- **Lifetime Allocation Optimizer** (`/glide-path`): compares the welfare-maximizing equity allocation curve across the accumulation and decumulation phases with the best constant allocation. Uses Monte Carlo coordinate ascent to maximize expected discounted CRRA utility of retirement consumption, and separately scores the best constant allocation out of sample as a robust comparator. The raw optimized glide remains the returned/charted schedule; the UI lists both choices and applies a simplicity bias toward the constant comparator when its CE income is within 5%, either depletion rate is within 5 percentage points, or it wins all three comparable outcomes. Reports both full-path and drawdown-only income shortfall (the share of paths with a year the portfolio can't fund the targeted draw) — the latter from the expected retirement balance, matching the `/retirement` headline semantics. Guaranteed income (the pension) is paid every retirement year — a pre-pension bridge is intentionally out of scope (that funding-feasibility question belongs to `/retirement`). Supports leverage (equity weight > 1). Engine in `src/utils/glide-path/`, components in `src/components/glide-path/`.

When adding a new tool: add its route under `src/app/<tool>/`, put tool-specific components in `src/components/<tool>/`, and reuse shared chrome/primitives from `src/components/shared/` and shared logic from `src/utils/`. Cross-folder imports use the `@/` alias (`@/* → ./src/*`).

## Architecture

### 0. App Entry (`src/app/`)

- **layout.tsx** (server component): root `<html>`, Mantine `ColorSchemeScript`, favicon, Lato font (via `next/font/google`), site-level `metadata` (title template) / `viewport`. Wraps children in `Providers`.
- **providers.tsx** (`"use client"`): `MantineProvider` with the teal/Lato theme and a `localStorageColorSchemeManager` (key `personal-finance-color-scheme`).
- **page.tsx** (server component): the hub landing page — a `SimpleGrid` of `ToolCard`s linking to each tool.
- **rent-vs-buy/page.tsx** (server component): renders `Header` + `RentVsBuyApp` + `Methodology` + `Footer`. `RentVsBuyApp` is a `"use client"` wrapper that lazy-loads `Main` with `next/dynamic({ ssr: false })` (required: `ssr:false` must live inside a client component) so localStorage-backed state never causes a hydration mismatch.
- **globals.css**: Tailwind v4 + Mantine, ordered via CSS `@layer` (`tailwind-base, mantine, tailwind-utilities`) so Tailwind's preflight never overrides Mantine.

### 1. UI Layer (`src/components/`)

Components are split into **`shared/`** (reusable chrome and form primitives — `Header`, `Footer`, `DisclaimerModal`, `FieldLabel`, `UserInputFormItem`, `UserInputRangeItem`, `CurrencyPercentItem`) and per-tool folders (**`rent-vs-buy/`**). `Header` takes `title`/`subtitle`/`showHomeLink` props; `Footer` is the generic site footer (disclaimer + copyright + GitHub).

- **rent-vs-buy/Main.tsx**: Top-level state container for the rent-vs-buy tool. Holds `userInput`, `expandedFields` (which rate fields show the uncertainty input), `customPresets`, `hiddenBuiltins`, and `activePresetId`. Passes handlers to the form and result components. All state is persisted to localStorage via `storage.ts`.
- **UserInputForm.tsx**: Form organized into Accordion sections (Rent, Property, Mortgage, Investment & Tax, Transaction Costs). Preset buttons at the top let users apply, save, or delete scenarios. Rate fields can expand inline to reveal a sigma (uncertainty) input.
- **UserInputFormItem.tsx**: Thin wrapper around Mantine `NumberInput` with a `FieldLabel`.
- **CurrencyPercentItem.tsx**: Recurring-cost input that toggles between a dollar amount (per year) and a percentage of today's home price. Shared by Property Tax and Maintenance (extracted to remove duplicated $/% conversion logic).
- **UserInputRangeItem.tsx**: Form control for rate fields that support uncertainty. Shows a base value `NumberInput` with a toggle to expand an inline `±2σ` input and a live range readout (`low% to high%`). The sigma input displays `2σ` (the full ±spread) and converts back to `σ` on change.
- **FieldLabel.tsx**: Label with optional helper text popover.
- **Result.tsx**: Validates input, then renders `NetWorthChart` (always with MC bands).
- **NetWorthChart.tsx**: Dispatches Monte Carlo work to a Web Worker, receives per-year percentiles, and renders the chart. Also renders a `Summary` Alert with probability-tiered language, a collapsible data table, and a CSV download button.
- **rent-vs-buy/Methodology.tsx**: Static note explaining the cash-flow comparison method (rent-vs-buy-specific; rendered below the tool). The generic site `Footer` lives in `shared/`.

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

- **Vitest + React Testing Library** (`vitest.config.ts`, `vitest.setup.ts`): unit tests live next to source as `*.test.ts` (e.g. `src/utils/math.test.ts`) and component tests as `*.test.tsx` (e.g. `src/components/shared/Footer.test.tsx`). Component tests render through `src/test-utils.tsx`, which wraps RTL's `render` in `MantineProvider`. The setup file mocks `matchMedia`/`ResizeObserver` (absent in jsdom).
- **Playwright** (`playwright.config.ts`): end-to-end specs in `e2e/`. The config auto-starts `npm run dev` (which runs at the root, no base path) and drives the hub at `/` and each tool at its route (e.g. `/rent-vs-buy`).

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

Drawn as **lognormal** to preserve the arithmetic mean: `logMean = log(1 + μ) − σ²/2`, then `R = exp(logMean + σ·Z) − 1` with an **iid** standard-normal shock `Z` each year (no serial correlation). This avoids the volatility-drag bias of naive normal sampling. A previous version applied a mean-reverting AR(1) to `Z` to curb long-horizon fan-out, but it was removed: empirically real returns have at least as much multi-year dispersion as iid, so iid is the honest default (matching the `/retirement` engine — see `docs/retirement-swr-methodology.md`). Long-run-mean uncertainty (`investmentReturnSigma`, drawn once per sim) remains the dominant source of long-horizon spread; per-year noise is iid around that drawn mean.

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

- `userInput` is stored as numbers in `rent-vs-buy/Main.tsx` state. Form inputs coerce strings via `+value`.
- Validation runs on every render in `rent-vs-buy/Main.tsx` via `validateUserInput()`. If errors exist, `rent-vs-buy/Result.tsx` shows an "Incomplete inputs" alert instead of the chart.
- Monte Carlo runs in a Web Worker (debounced 150 ms). `NetWorthChart` tracks a `requestId` counter to discard responses from superseded requests.
- Deployed to GitHub Pages from `./out` (the static export). The `homepage` URL in `README.md`/deploy must stay the GitHub Pages URL.
