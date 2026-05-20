function calculateFutureValue(baseValue, growthRatePercentage, years) {
  if (years < 0) {
    throw new Error("Number of compounding periods must not be negative.");
  }
  return baseValue * Math.pow(1 + growthRatePercentage / 100, years);
}

// home price at the start of the given year
function getHomePriceAtYearStart(
  initialHomePrice,
  homePriceGrowthRate,
  yearNumber,
) {
  return calculateFutureValue(
    initialHomePrice,
    homePriceGrowthRate,
    yearNumber - 1,
  );
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
function calculateMonthlyMortgageInterestRate(annualMortgageInterestRate) {
  const rate =
    Math.pow(Math.pow(annualMortgageInterestRate / 2 / 100 + 1, 2), 1 / 12) - 1;
  return rate;
}

// monthly mortgage payment
function calculateMonthlyMortgagePayment(
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

// Owner's cash outflow of a given year, including mortgage, property tax, maintenance, but not including initial payment, i.e. down payment, closing fees.
function calculateOwnersCashOutflow(
  homePriceAtYearStart,
  mortgagePaymentOfYear,
  propertyTaxRate,
  maintenanceCostPercentage,
) {
  return (
    mortgagePaymentOfYear +
    (homePriceAtYearStart * (propertyTaxRate + maintenanceCostPercentage)) / 100
  );
}

// Renter's surplus for a given year
function calculateRentersSurplus({
  monthlyRent,
  rentIncreaseRate,
  mortgagePrincipal,
  annualMortgageInterestRate,
  amortizationPeriod,
  yearNumber,
  propertyTaxRate,
  maintenanceCostPercentage,
  initialHomePrice,
  homePriceGrowthRate,
}) {
  const annualMortgagePayment = getAnnualMortgagePayment(
    mortgagePrincipal,
    annualMortgageInterestRate,
    amortizationPeriod,
    yearNumber,
  );
  const homePriceAtYearStart = getHomePriceAtYearStart(
    initialHomePrice,
    homePriceGrowthRate,
    yearNumber,
  );
  const ownersCashOutflow = calculateOwnersCashOutflow(
    homePriceAtYearStart,
    annualMortgagePayment,
    propertyTaxRate,
    maintenanceCostPercentage,
  );
  const annualRent = getAnnualRent(monthlyRent, rentIncreaseRate, yearNumber);
  return ownersCashOutflow - annualRent;
}

// Renter's portfolio value at the end of the given year
function calculateRentersPortfolioValue({
  monthlyRent,
  rentIncreaseRate,
  mortgagePrincipal,
  annualMortgageInterestRate,
  amortizationPeriod,
  yearNumber,
  investmentReturnRate,
  downPaymentPercentage,
  buyersClosingCostPercentage,
  propertyTaxRate,
  maintenanceCostPercentage,
  initialHomePrice,
  homePriceGrowthRate,
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
      mortgagePrincipal,
      annualMortgageInterestRate,
      amortizationPeriod,
      yearNumber: i,
      propertyTaxRate,
      maintenanceCostPercentage,
      initialHomePrice,
      homePriceGrowthRate,
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

// CMHC default insurance is mandatory in Canada for down payments under 20%.
// Premium is a % of the base loan, tiered by LTV, and capitalized into principal.
function getCmhcPremiumRate(downPaymentPercentage) {
  if (downPaymentPercentage >= 20) return 0;
  if (downPaymentPercentage >= 15) return 2.8;
  if (downPaymentPercentage >= 10) return 3.1;
  return 4.0;
}

function calculateMortgagePrincipal(initialHomePrice, downPaymentPercentage) {
  const baseLoan = initialHomePrice * (1 - downPaymentPercentage / 100);
  return baseLoan * (1 + getCmhcPremiumRate(downPaymentPercentage) / 100);
}

// Renter's and owner's absolute net worth at the end of the given year
export function calculateNetWorthAtYearEnd({
  monthlyRent,
  rentIncreaseRate,
  annualMortgageInterestRate,
  amortizationPeriod,
  yearNumber,
  investmentReturnRate,
  downPaymentPercentage,
  buyersClosingCostPercentage,
  propertyTaxRate,
  maintenanceCostPercentage,
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
    mortgagePrincipal,
    annualMortgageInterestRate,
    amortizationPeriod,
    yearNumber,
    investmentReturnRate,
    downPaymentPercentage,
    buyersClosingCostPercentage,
    propertyTaxRate,
    maintenanceCostPercentage,
    initialHomePrice,
    homePriceGrowthRate,
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

