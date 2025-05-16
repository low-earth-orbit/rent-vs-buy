# rent-vs-buy

A simple and sensible calculator for comparing renting vs owning a home.

Latest deployed version: [Click Me](https://low-earth-orbit.github.io/rent-vs-buy/)

## How It Works

This calculator compares the financial outcomes of renting versus owning a home. Enter your assumptions, and the results will be automatically generated in a time-series table. The table shows, at the end of each year, whether renting or owning is more advantageous, based on net worth. The underlying calculation uses a cash-flow method, assuming both the renter and the owner spend the same amount of money in each scenario.

## Input Fields

### Required Inputs

- **Monthly Rent:** The monthly rent. To be more accurate, include tenant insurance, parking and out-of-pocket repairs. Exclude utility bills (assume home owners and renters pay the same amount for utility).

- **Property Price:** The fair value/market price of the property. Note that the seller's listing price may not reflect the true market value. For both monthly rent and property price, consider equivalent living conditions for renting and owning.

- **Property Tax Rate:** The property tax rate in the municipality where the property is located. Since the assessed value may differ from the market price, calculate the tax rate as a percentage of the market price.

- **Investment Return:** The expected pre-tax return of your investment portfolio.

### Default Inputs

Unless you're fairly confident about these base assumptions, I recommend keeping them as default.

- **Maintenance Cost:** Include annual costs for repairs, home insurance, condo fees (if applicable), and an estimate of net depreciation. This represents the total cost of maintaining the property.

- **Down Payment:** The down payment percentage.

- **Mortgage Rate:** Mortgage rates fluctuate. I've provided an estimate of the long-term mortgage rate as the default value. You can also use the 5-year fixed-rate mortgage APR. Remember, the APR is slightly higher than the nominal mortgage rate.

- **Mortgage Terms:** The number of years you plan to pay off the mortgage. The typical term is 25 years.

- **Capital Gain Tax:** Typically, this is half of your marginal income tax rate when selling the property. The amount may be lower if you use tax-advantaged accounts like TFSA or RRSP.

- **Rent Increase:** The expected annual rent increase. Historically, rent increases have kept pace with or slightly exceeded CPI inflation.

- **Home Price Appreciation:** The expected annual home price growth. Historically, home prices have grown about 1% faster than CPI inflation.

- **Buyer's Closing Cost & Seller's Closing Cost:** The transactional costs for buying and selling a home.

## Assumptions

1.  Capital gains from selling the house are not taxed. This is a reasonable assumption for a principal residence.
2.  The owner does not use a HELOC for investment.

## Disclaimer

**This tool is provided as-is. It's not financial advice.**
