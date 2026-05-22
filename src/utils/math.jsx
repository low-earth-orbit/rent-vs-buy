function calculateFutureValue(baseValue, growthRatePercentage, years) {
  if (years < 0) {
    throw new Error("Number of compounding periods must not be negative.");
  }
  return baseValue * Math.pow(1 + growthRatePercentage / 100, years);
}

// home price at the end of the given year
function getHomePriceAtYearEnd(
  initialHomePrice,
  homePriceGrowthRate,
  yearNumber,
) {
  return calculateFutureValue(
    initialHomePrice,
    homePriceGrowthRate,
    yearNumber,
  );
}

// rent of the given year
function getAnnualRent(monthlyRent, rentIncreaseRate, yearNumber) {
  return calculateFutureValue(
    monthlyRent * 12,
    rentIncreaseRate,
    yearNumber - 1,
  );
}

// monthly interest rate, semi-annual compounding
export function calculateMonthlyMortgageInterestRate(annualMortgageInterestRate) {
  const rate =
    Math.pow(Math.pow(annualMortgageInterestRate / 2 / 100 + 1, 2), 1 / 12) - 1;
  return rate;
}

// monthly mortgage payment
export function calculateMonthlyMortgagePayment(
  mortgagePrincipal,
  annualMortgageInterestRate,
  amortizationPeriod,
) {
  if (amortizationPeriod <= 0) {
    throw new Error("Amortization period must be greater than zero.");
  }

  if (mortgagePrincipal <= 0) return 0;

  if (annualMortgageInterestRate === 0) {
    return mortgagePrincipal / (amortizationPeriod * 12);
  }

  const monthlyRate = calculateMonthlyMortgageInterestRate(
    annualMortgageInterestRate,
  );

  const totalPayments = amortizationPeriod * 12;

  if (monthlyRate === 0) {
    return mortgagePrincipal / totalPayments;
  }

  const monthlyPayment =
    (mortgagePrincipal * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -totalPayments));

  return monthlyPayment;
}

// Annual mortgage payment of the given year
function getAnnualMortgagePayment(
  mortgagePrincipal,
  annualMortgageInterestRate,
  amortizationPeriod,
  yearNumber,
) {
  if (yearNumber > amortizationPeriod) return 0;

  return (
    calculateMonthlyMortgagePayment(
      mortgagePrincipal,
      annualMortgageInterestRate,
      amortizationPeriod,
    ) * 12
  );
}

// mortgage balance at the end of the given year
function calculateMortgageBalanceAtYearEnd(
  mortgagePrincipal,
  annualMortgageInterestRate,
  amortizationPeriod,
  yearNumber,
) {
  if (amortizationPeriod <= 0 || yearNumber <= 0) {
    throw new Error("Invalid input values.");
  }

  if (yearNumber > amortizationPeriod || mortgagePrincipal <= 0) {
    return 0;
  }

  const monthlyPayment = calculateMonthlyMortgagePayment(
    mortgagePrincipal,
    annualMortgageInterestRate,
    amortizationPeriod,
  );

  const monthlyRate = calculateMonthlyMortgageInterestRate(
    annualMortgageInterestRate,
  );

  const totalMonths = yearNumber * 12;

  let remainingBalance = mortgagePrincipal;

  for (let month = 1; month <= totalMonths; month++) {
    const interestPayment = remainingBalance * monthlyRate;

    const mortgagePrincipalPayment = monthlyPayment - interestPayment;

    remainingBalance -= mortgagePrincipalPayment;
  }

  return remainingBalance;
}

function calculateOwnersEquityAtYearEnd({
  initialHomePrice,
  homePriceGrowthRate,
  yearNumber,
  mortgagePrincipal,
  annualMortgageInterestRate,
  amortizationPeriod,
  sellersClosingCostPercentage,
}) {
  const homeValue =
    getHomePriceAtYearEnd(initialHomePrice, homePriceGrowthRate, yearNumber) *
    (1 - sellersClosingCostPercentage / 100);

  const mortgageBalance = calculateMortgageBalanceAtYearEnd(
    mortgagePrincipal,
    annualMortgageInterestRate,
    amortizationPeriod,
    yearNumber,
  );

  return homeValue - mortgageBalance;
}

// Owner's cash outflow of a given year, including mortgage, property tax,
// maintenance/insurance, condo fees — but not the initial down payment /
// closing costs. Recurring owner costs are passed in as year-start dollar
// amounts so their growth is independent of home price appreciation.
function calculateOwnersCashOutflow(
  mortgagePaymentOfYear,
  propertyTaxAtYearStart,
  maintenanceAtYearStart,
  condoFeesAtYearStart,
) {
  return (
    mortgagePaymentOfYear +
    propertyTaxAtYearStart +
    maintenanceAtYearStart +
    condoFeesAtYearStart * 12
  );
}

// Renter's surplus for a given year
function calculateRentersSurplus({
  monthlyRent,
  rentIncreaseRate,
  ownerCostGrowthRate = 2.5,
  mortgagePrincipal,
  annualMortgageInterestRate,
  amortizationPeriod,
  yearNumber,
  propertyTaxRate,
  maintenanceCostPercentage,
  condoFeesPerMonth,
  initialHomePrice,
}) {
  const annualMortgagePayment = getAnnualMortgagePayment(
    mortgagePrincipal,
    annualMortgageInterestRate,
    amortizationPeriod,
    yearNumber,
  );
  // Anchor owner costs in year-0 dollars, then compound them independently
  // from both rent growth and home price appreciation.
  const ownerCostCompound = Math.pow(
    1 + ownerCostGrowthRate / 100,
    yearNumber - 1,
  );
  const propertyTaxAtYearStart =
    ((propertyTaxRate / 100) * initialHomePrice) * ownerCostCompound;
  const maintenanceAtYearStart =
    ((maintenanceCostPercentage / 100) * initialHomePrice) *
    ownerCostCompound;
  const condoFeesAtYearStart =
    (condoFeesPerMonth ?? 0) * ownerCostCompound;
  const ownersCashOutflow = calculateOwnersCashOutflow(
    annualMortgagePayment,
    propertyTaxAtYearStart,
    maintenanceAtYearStart,
    condoFeesAtYearStart,
  );
  const annualRent = getAnnualRent(monthlyRent, rentIncreaseRate, yearNumber);
  return ownersCashOutflow - annualRent;
}

// Renter's portfolio value at the end of the given year
function calculateRentersPortfolioValue({
  monthlyRent,
  rentIncreaseRate,
  ownerCostGrowthRate = 2.5,
  mortgagePrincipal,
  annualMortgageInterestRate,
  amortizationPeriod,
  yearNumber,
  investmentReturnRate,
  downPaymentPercentage,
  buyersClosingCostPercentage,
  propertyTaxRate,
  maintenanceCostPercentage,
  condoFeesPerMonth,
  initialHomePrice,
  capitalGainTaxRate,
  dividendYield,
  dividendTaxRate,
}) {
  const initialInvestment =
    (initialHomePrice * (downPaymentPercentage + buyersClosingCostPercentage)) /
    100;

  let portfolioValue = initialInvestment;
  let bookValue = initialInvestment;

  // assume surplus are invested in the middle of each year, i.e. surplus gains 1/2 year investment return within the given year.
  // use a simple calculation for the half-year investment return rate.
  const halfYearReturnFactor = 1 + investmentReturnRate / 100 / 2;
  const dividendYieldRate = dividendYield / 100;
  const dividendTaxFraction = dividendTaxRate / 100;

  for (var i = 1; i <= yearNumber; i++) {
    const surplus = calculateRentersSurplus({
      monthlyRent,
      rentIncreaseRate,
      ownerCostGrowthRate,
      mortgagePrincipal,
      annualMortgageInterestRate,
      amortizationPeriod,
      yearNumber: i,
      propertyTaxRate,
      maintenanceCostPercentage,
      condoFeesPerMonth,
      initialHomePrice,
    });

    // Dividends earned on start-of-year balance, taxed annually.
    const grossDividends = portfolioValue * dividendYieldRate;
    const afterTaxDividends = grossDividends * (1 - dividendTaxFraction);

    // Portfolio grows at full gross rate, dividend tax paid out, surplus added mid-year.
    portfolioValue =
      portfolioValue * (1 + investmentReturnRate / 100) -
      grossDividends * dividendTaxFraction +
      surplus * halfYearReturnFactor;

    // After-tax dividends reinvested increase cost basis to prevent double-taxation at terminal sale.
    bookValue += surplus + afterTaxDividends;
  }

  // Cost basis cannot go negative, and investment losses do not generate a
  // tax credit, so only positive gains are taxed.
  const taxableGain = portfolioValue - Math.max(bookValue, 0);
  const afterTaxValue =
    taxableGain > 0
      ? portfolioValue - taxableGain * (capitalGainTaxRate / 100)
      : portfolioValue;

  return afterTaxValue;
}

export function calculateMortgagePrincipal(
  initialHomePrice,
  downPaymentPercentage,
) {
  return initialHomePrice * (1 - downPaymentPercentage / 100);
}

// Renter's and owner's absolute net worth at the end of the given year
export function calculateNetWorthAtYearEnd({
  monthlyRent,
  rentIncreaseRate,
  ownerCostGrowthRate = 2.5,
  annualMortgageInterestRate,
  amortizationPeriod,
  yearNumber,
  investmentReturnRate,
  downPaymentPercentage,
  buyersClosingCostPercentage,
  propertyTaxRate,
  maintenanceCostPercentage,
  condoFeesPerMonth,
  initialHomePrice,
  homePriceGrowthRate,
  sellersClosingCostPercentage,
  capitalGainTaxRate,
  dividendYield,
  dividendTaxRate,
}) {
  const mortgagePrincipal = calculateMortgagePrincipal(
    initialHomePrice,
    downPaymentPercentage,
  );

  const renterNetWorth = calculateRentersPortfolioValue({
    monthlyRent,
    rentIncreaseRate,
    ownerCostGrowthRate,
    mortgagePrincipal,
    annualMortgageInterestRate,
    amortizationPeriod,
    yearNumber,
    investmentReturnRate,
    downPaymentPercentage,
    buyersClosingCostPercentage,
    propertyTaxRate,
    maintenanceCostPercentage,
    condoFeesPerMonth,
    initialHomePrice,
    capitalGainTaxRate,
    dividendYield,
    dividendTaxRate,
  });

  const ownerNetWorth = calculateOwnersEquityAtYearEnd({
    initialHomePrice,
    homePriceGrowthRate,
    yearNumber,
    mortgagePrincipal,
    annualMortgageInterestRate,
    amortizationPeriod,
    sellersClosingCostPercentage,
  });

  return {
    year: yearNumber,
    renterNetWorth,
    ownerNetWorth,
    difference: renterNetWorth - ownerNetWorth,
  };
}
