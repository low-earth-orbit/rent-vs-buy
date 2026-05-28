# rent-vs-buy

A simple and sensible calculator for comparing renting vs owning a home.

[![Deploy to GitHub Pages](https://github.com/low-earth-orbit/rent-vs-buy/actions/workflows/deploy.yml/badge.svg)](https://github.com/low-earth-orbit/rent-vs-buy/actions/workflows/deploy.yml)

Latest deployed version: [Click Me](https://low-earth-orbit.github.io/rent-vs-buy/)

## How It Works

This calculator compares the financial outcomes of renting versus owning a home. Enter your assumptions, and the app generates a year-by-year net worth comparison over your chosen amortization period. The underlying calculation uses a cash-flow method, assuming both the renter and the owner spend the same amount of money in each scenario — any savings the renter has over the owner's costs are invested in a portfolio.

Results include Monte Carlo confidence bands (1,000 simulations) showing the range of possible outcomes, and a probability-based summary indicating how confident you can be in the result.

## Development

Built with Next.js (App Router), React 19, TypeScript, Mantine, Tailwind CSS, Recharts, and the React Compiler. Statically exported and deployed to GitHub Pages. Tested with Vitest + React Testing Library (unit/component) and Playwright (e2e).

```bash
npm install
npm run dev        # dev server at http://localhost:3000/rent-vs-buy
npm run build      # static export to ./out
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest unit + component tests
npm run test:e2e   # Playwright end-to-end tests
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, format check, tests, build, and e2e on every PR and on `main`. Enable these as required status checks in branch protection to block merges until they pass.

## Assumptions

1.  Capital gains from selling the house are not taxed. This is a reasonable assumption for a principal residence in Canada.
2.  The owner does not use a HELOC for investment.
3.  The renter does not use margin or leverage for investment.

## Disclaimer

THIS TOOL IS PROVIDED AS-IS. IT'S NOT FINANCIAL ADVICE.
