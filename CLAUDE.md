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

This is a React-based financial calculator that compares the financial outcomes of renting versus buying a home. Users input assumptions about their personal situation, and the app generates a 30-year comparison showing which option (rent or buy) results in higher net worth at the end of each year.

## Architecture

The application has three main layers:

### 1. UI Layer (components/)
- **Main.jsx**: Manages application state. Contains default assumptions and handles input changes from the form. Uses `userInput` state object passed to form and results components.
- **UserInputForm.jsx**: Renders form with 13 configurable inputs covering rent, property, mortgage, tax, and investment assumptions.
- **UserInputFormItem.jsx**: Reusable form input component with labels, validation feedback, and currency/percentage formatting.
- **Result.jsx**: Validates user input and renders the 30-year net worth chart via NetWorthChart.
- **Header.jsx / Footer.jsx**: Static UI components.

### 2. Calculation Layer (utils/math.jsx)
The exported function `calculateNetWorthAtYearEnd()` is the public API. It returns `{ year, renterNetWorth, ownerNetWorth, difference }` for a given year, accounting for:

- **Renter side**: Initial investment (down payment + closing costs), annual rent paid, portfolio growth with tax on investment gains
- **Owner side**: Mortgage payments (amortizing principal + interest with semi-annual compounding), property taxes, maintenance, home price appreciation, equity from mortgage payoff

Key helper functions:
- `calculateFutureValue()`: Compound growth calculator
- `calculateMonthlyMortgagePayment()`: Standard loan formula
- `calculateMortgageBalanceAtYearEnd()`: Iterates month-by-month through the amortization period
- `calculateRentersPortfolioValue()`: Assumes surplus (difference between owner's cost and renter's cost) is invested annually
- `calculateOwnersEquityAtYearEnd()`: Home value minus mortgage balance

### 3. Styling
Uses Bootstrap via react-scripts and bootstrap-icons for visual presentation. Layout is a two-column grid: inputs on left, results on right.

## Key Assumptions Built Into the Math

1. Renter invests the monthly surplus (difference between owner's annual cost and renter's rent) in a portfolio earning the specified investment return rate.
2. Investment gains are taxed at the configured rate (not capital gains for the house, which is untaxed as principal residence).
3. Mortgage interest compounds semi-annually.
4. Surplus investments are invested mid-year and earn half the annual return in year of investment.
5. Calculations run for a fixed 30 years regardless of mortgage term.

## Development Notes

- All user input is stored as numbers in Main.jsx's state object. Form inputs coerce strings to numbers.
- The form validates only on result display (in Result.jsx), not as the user types.
- The Result component re-renders and recalculates all 30 years whenever any input changes.
- The app is deployed to GitHub Pages from the `/build` directory. Homepage in package.json must remain set to the GitHub Pages URL.
