# rent-vs-buy

A simple and sensible calculator for comparing renting vs owning a home.

Latest deployed version: [Click Me](https://low-earth-orbit.github.io/rent-vs-buy/)

Disclaimer: THIS TOOL IS PROVIDED AS-IS. IT'S NOT FINANCIAL ADVICE.

## How It Works

This calculator compares the financial outcomes of renting versus owning a home. Enter your assumptions, and the app generates a year-by-year net worth comparison. The underlying calculation uses a cash-flow method, assuming both the renter and the owner spend the same amount of money in each scenario — any savings the renter has over the owner's costs are invested in a portfolio.

## Development

Built with Next.js (App Router), React 19 (with React Compiler), TypeScript, Mantine, Tailwind CSS and Recharts. Statically exported and deployed to GitHub Pages. Tested with Vitest + React Testing Library (unit/component) and Playwright (e2e/UI).

```bash
npm install
npm run dev        # dev server at http://localhost:3000/rent-vs-buy
npm run build      # static export to ./out
npm run format     # Prettier
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest unit + component tests
npm run test:e2e   # Playwright end-to-end tests
```
