import {
  calculateMonthlyMortgageInterestRate,
  calculateMonthlyMortgagePayment,
  calculateMortgagePrincipal,
} from "./math";

function normalRandom() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function percentile(sorted, p) {
  const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1);
  return sorted[idx];
}

// Annual volatility — represents year-to-year noise, not user-tunable.
// User-facing sigmas in presets.js capture uncertainty about the long-run mean;
// these constants capture realized volatility around that mean.
// Note: maintenance has no independent annual vol — it inherits rent's annual
// vol (via the inflation common factor) because both are operating-cost-driven.
const ANNUAL_VOL = {
  inflation: 1.0, // hidden common factor σ
  homePriceIdio: 4.0, // idiosyncratic real housing σ
  investment: 14.0, // equity lognormal σ (annual)
  rentIdio: 1.0,
  propertyTax: 0.1,
  dividend: 0.2,
  mortgageRenewal: 1.0, // shock at each 5-year renewal
};

// Loadings of the hidden inflation factor on observable variables.
const INFLATION_BETA = {
  homePrice: 0.8,
  rent: 0.8,
  mortgageRate: 0.5,
};

const MORTGAGE_TERM_YEARS = 5;

function drawScenario(userInput) {
  return {
    homePriceGrowthMean:
      userInput.homePriceGrowthRate +
      normalRandom() * userInput.homePriceGrowthSigma,
    investmentReturnMean:
      userInput.investmentReturnRate +
      normalRandom() * userInput.investmentReturnSigma,
    rentIncreaseMean:
      userInput.rentIncreaseRate +
      normalRandom() * userInput.rentIncreaseSigma,
    mortgageRateMean:
      userInput.annualMortgageInterestRate +
      normalRandom() * userInput.mortgageRateSigma,
    // Maintenance baseline is a known user input (today's % of home value);
    // its long-run path uncertainty is already captured by rent growth, which
    // maintenance inherits in drawPath. No anchor sigma.
    maintenanceMean: Math.max(0, userInput.maintenanceCostPercentage),
    // Mill rates are publicly known per municipality; no anchor sigma.
    // ANNUAL_VOL.propertyTax still captures small year-to-year budget noise.
    propertyTaxMean: Math.max(0, userInput.propertyTaxRate),
    dividendYieldMean: Math.max(
      0,
      userInput.dividendYield + normalRandom() * userInput.dividendYieldSigma,
    ),
  };
}

// Year-by-year rate realizations and the mortgage rate path for one scenario.
function drawPath(scenario, horizon) {
  const annual = [];
  const inflationShocks = [];

  for (let y = 0; y < horizon; y++) {
    const inflShock = normalRandom() * ANNUAL_VOL.inflation;
    inflationShocks.push(inflShock);

    const homePriceGrowth =
      scenario.homePriceGrowthMean +
      INFLATION_BETA.homePrice * inflShock +
      normalRandom() * ANNUAL_VOL.homePriceIdio;

    // Lognormal draw preserves the scenario arithmetic mean.
    const muArith = scenario.investmentReturnMean / 100;
    const sigma = ANNUAL_VOL.investment / 100;
    const logMean = Math.log(1 + muArith) - 0.5 * sigma * sigma;
    const investmentReturn =
      (Math.exp(logMean + normalRandom() * sigma) - 1) * 100;

    const rentIncrease =
      scenario.rentIncreaseMean +
      INFLATION_BETA.rent * inflShock +
      normalRandom() * ANNUAL_VOL.rentIdio;

    const propertyTax = Math.max(
      0,
      scenario.propertyTaxMean + normalRandom() * ANNUAL_VOL.propertyTax,
    );
    const dividendYield = Math.max(
      0,
      Math.min(
        scenario.dividendYieldMean + normalRandom() * ANNUAL_VOL.dividend,
        Math.max(scenario.investmentReturnMean, 0),
      ),
    );

    annual.push({
      homePriceGrowth,
      investmentReturn,
      rentIncrease,
      propertyTax,
      dividendYield,
    });
  }

  // Mortgage rate: redrawn at each 5-year renewal, with inflation pressure.
  const mortgageRates = [];
  let currentRate =
    scenario.mortgageRateMean + normalRandom() * ANNUAL_VOL.mortgageRenewal;
  for (let y = 0; y < horizon; y++) {
    if (y > 0 && y % MORTGAGE_TERM_YEARS === 0) {
      currentRate =
        scenario.mortgageRateMean +
        INFLATION_BETA.mortgageRate * inflationShocks[y] +
        normalRandom() * ANNUAL_VOL.mortgageRenewal;
    }
    mortgageRates.push(Math.max(0, currentRate));
  }

  return { annual, mortgageRates };
}

// Walk one year-by-year wealth path for owner and renter.
function simulatePath(userInput, annual, mortgageRates, scenario) {
  const horizon = annual.length;
  const capGainTaxFrac = userInput.capitalGainTaxRate / 100;
  const dividendTaxFrac = userInput.dividendTaxRate / 100;
  const netOfSellingFees = 1 - userInput.sellersClosingCostPercentage / 100;

  const initialPrincipal = calculateMortgagePrincipal(
    userInput.initialHomePrice,
    userInput.downPaymentPercentage,
  );
  const initialPortfolio =
    (userInput.initialHomePrice *
      (userInput.downPaymentPercentage +
        userInput.buyersClosingCostPercentage)) /
    100;

  let homePrice = userInput.initialHomePrice;
  let mortgageBalance = initialPrincipal;
  let portfolioValue = initialPortfolio;
  let bookValue = initialPortfolio;
  let annualRent = userInput.monthlyRent * 12;
  // Year-0 anchored operating costs. Each grows with realized rent inflation,
  // matching the empirical pattern that labor / insurance / utilities track CPI.
  let annualMaintenance =
    (userInput.initialHomePrice * scenario.maintenanceMean) / 100;
  let monthlyCondoFees = userInput.condoFeesPerMonth ?? 0;
  let remainingYears = userInput.amortizationPeriod;
  let currentMortgageRate = mortgageRates[0];
  let monthlyPayment = calculateMonthlyMortgagePayment(
    mortgageBalance,
    currentMortgageRate,
    remainingYears,
  );

  const results = [];

  for (let y = 1; y <= horizon; y++) {
    const yr = annual[y - 1];

    // Re-amortize remaining balance at each renewal boundary.
    if (
      y > 1 &&
      (y - 1) % MORTGAGE_TERM_YEARS === 0 &&
      mortgageBalance > 0 &&
      remainingYears > 0
    ) {
      currentMortgageRate = mortgageRates[y - 1];
      monthlyPayment = calculateMonthlyMortgagePayment(
        mortgageBalance,
        currentMortgageRate,
        remainingYears,
      );
    }

    let annualMortgagePayment = 0;
    if (mortgageBalance > 0 && remainingYears > 0) {
      const monthlyRate =
        calculateMonthlyMortgageInterestRate(currentMortgageRate);
      for (let m = 0; m < 12; m++) {
        if (mortgageBalance <= 0) break;
        const interest = mortgageBalance * monthlyRate;
        let principalPay = monthlyPayment - interest;
        if (principalPay > mortgageBalance) principalPay = mortgageBalance;
        mortgageBalance -= principalPay;
        annualMortgagePayment += interest + principalPay;
      }
      remainingYears -= 1;
      if (mortgageBalance < 0.01) mortgageBalance = 0;
    }

    const ownersCashOutflow =
      annualMortgagePayment +
      (homePrice * yr.propertyTax) / 100 +
      annualMaintenance +
      monthlyCondoFees * 12;
    const surplus = ownersCashOutflow - annualRent;

    const r = yr.investmentReturn / 100;
    const grossDividends = (portfolioValue * yr.dividendYield) / 100;
    const afterTaxDividends = grossDividends * (1 - dividendTaxFrac);

    portfolioValue =
      portfolioValue * (1 + r) -
      grossDividends * dividendTaxFrac +
      surplus * (1 + r / 2);
    bookValue += surplus + afterTaxDividends;

    homePrice = homePrice * (1 + yr.homePriceGrowth / 100);
    const rentGrowth = 1 + yr.rentIncrease / 100;
    annualRent = annualRent * rentGrowth;
    annualMaintenance = annualMaintenance * rentGrowth;
    monthlyCondoFees = monthlyCondoFees * rentGrowth;

    const taxableGain = portfolioValue - Math.max(bookValue, 0);
    const renterNetWorth =
      taxableGain > 0
        ? portfolioValue - taxableGain * capGainTaxFrac
        : portfolioValue;
    const ownerNetWorth = homePrice * netOfSellingFees - mortgageBalance;

    results.push({ year: y, renterNetWorth, ownerNetWorth });
  }

  return results;
}

export function runMonteCarlo(userInput, numSimulations = 1000) {
  const horizon = userInput.amortizationPeriod;
  const renterByYear = Array.from({ length: horizon }, () => []);
  const ownerByYear = Array.from({ length: horizon }, () => []);
  const renterWinsByYear = Array.from({ length: horizon }, () => 0);

  for (let sim = 0; sim < numSimulations; sim++) {
    const scenario = drawScenario(userInput);
    const { annual, mortgageRates } = drawPath(scenario, horizon);
    const path = simulatePath(userInput, annual, mortgageRates, scenario);
    for (let y = 0; y < horizon; y++) {
      renterByYear[y].push(path[y].renterNetWorth);
      ownerByYear[y].push(path[y].ownerNetWorth);
      if (path[y].renterNetWorth > path[y].ownerNetWorth) {
        renterWinsByYear[y]++;
      }
    }
  }

  return renterByYear.map((renterVals, i) => {
    const ownerVals = ownerByYear[i];
    renterVals.sort((a, b) => a - b);
    ownerVals.sort((a, b) => a - b);
    return {
      year: i + 1,
      renterP25: percentile(renterVals, 0.25),
      renterMedian: percentile(renterVals, 0.5),
      renterP75: percentile(renterVals, 0.75),
      ownerP25: percentile(ownerVals, 0.25),
      ownerMedian: percentile(ownerVals, 0.5),
      ownerP75: percentile(ownerVals, 0.75),
      renterWinPct: renterWinsByYear[i] / numSimulations,
    };
  });
}
