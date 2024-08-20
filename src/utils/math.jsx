// Calculate the compounded growth over a number of loanTermYears
function calculateFutureValue(baseValue, growthRatePercentage, loanTermYears) {
  if (loanTermYears < 0) {
    throw new Error("Number of compounding periods must not be negative.");
  }
  return baseValue * Math.pow(1 + growthRatePercentage / 100, loanTermYears);
}

// home price at the start of the given year
function getHomePriceAtYearStart(
  initialHomePrice,
  homePriceGrowthRate,
  yearNumber
) {
  return calculateFutureValue(
    initialHomePrice,
    homePriceGrowthRate,
    yearNumber - 1
  );
}

// home price at the end of the given year
function getHomePriceAtYearEnd(
  initialHomePrice,
  homePriceGrowthRate,
  yearNumber
) {
  return calculateFutureValue(
    initialHomePrice,
    homePriceGrowthRate,
    yearNumber
  );
}

// rent of the given year
function getAnnualRent(monthlyRent, rentIncreaseRate, yearNumber) {
  return calculateFutureValue(
    monthlyRent * 12,
    rentIncreaseRate,
    yearNumber - 1
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
  loanTermYears
) {
  if (mortgagePrincipal <= 0 || loanTermYears <= 0) {
    throw new Error(
      "mortgagePrincipal and loan term must be greater than zero."
    );
  }

  if (annualMortgageInterestRate === 0) {
    return mortgagePrincipal / (loanTermYears * 12);
  }

  const monthlyRate = calculateMonthlyMortgageInterestRate(
    annualMortgageInterestRate
  );

  const totalPayments = loanTermYears * 12;

  const monthlyPayment =
    (mortgagePrincipal * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -totalPayments));

  return monthlyPayment;
}

// Annual mortgage payment of the given year
function getAnnualMortgagePayment(
  mortgagePrincipal,
  annualMortgageInterestRate,
  loanTermYears,
  yearNumber
) {
  if (yearNumber > loanTermYears) return 0;

  return (
    calculateMonthlyMortgagePayment(
      mortgagePrincipal,
      annualMortgageInterestRate,
      loanTermYears
    ) * 12
  );
}

// mortgage balance at the end of the given year
function calculateMortgageBalanceAtYearEnd(
  mortgagePrincipal,
  annualMortgageInterestRate,
  loanTermYears,
  yearNumber
) {
  if (mortgagePrincipal <= 0 || loanTermYears <= 0 || yearNumber <= 0) {
    throw new Error("Invalid input values.");
  }

  if (yearNumber > loanTermYears) {
    return 0;
  }

  const monthlyPayment = calculateMonthlyMortgagePayment(
    mortgagePrincipal,
    annualMortgageInterestRate,
    loanTermYears
  );

  const monthlyRate = calculateMonthlyMortgageInterestRate(
    annualMortgageInterestRate
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
  loanTermYears,
  sellersClosingCostPercentage,
}) {
  const homeValue =
    getHomePriceAtYearEnd(initialHomePrice, homePriceGrowthRate, yearNumber) *
    (1 - sellersClosingCostPercentage / 100);

  const mortgageBalance = calculateMortgageBalanceAtYearEnd(
    mortgagePrincipal,
    annualMortgageInterestRate,
    loanTermYears,
    yearNumber
  );

  return homeValue - mortgageBalance;
}

// Owner's cash outflow of a given year, including mortgage, property tax, maintenance, but not including initial payment, i.e. down payment, closing fees.
function calculateOwnersCashOutflow(
  homePriceAtYearStart,
  mortgagePaymentOfYear,
  propertyTaxRate,
  maintenanceCostPercentage
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
  loanTermYears,
  yearNumber,
  propertyTaxRate,
  maintenanceCostPercentage,
  initialHomePrice,
  homePriceGrowthRate,
}) {
  const annualMortgagePayment = getAnnualMortgagePayment(
    mortgagePrincipal,
    annualMortgageInterestRate,
    loanTermYears,
    yearNumber
  );
  const homePriceAtYearStart = getHomePriceAtYearStart(
    initialHomePrice,
    homePriceGrowthRate,
    yearNumber
  );
  const ownersCashOutflow = calculateOwnersCashOutflow(
    homePriceAtYearStart,
    annualMortgagePayment,
    propertyTaxRate,
    maintenanceCostPercentage
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
  loanTermYears,
  yearNumber,
  investmentReturnRate,
  downPaymentPercentage,
  buyersClosingCostPercentage,
  propertyTaxRate,
  maintenanceCostPercentage,
  initialHomePrice,
  homePriceGrowthRate,
  capitalGainTaxOnInvestment,
}) {
  const initialInvestment =
    (initialHomePrice * (downPaymentPercentage + buyersClosingCostPercentage)) /
    100;

  let portfolioValue = initialInvestment;
  let bookValue = initialInvestment;

  // assume surplus are invested in the middle of each year, i.e. surplus gains 1/2 year investment return within the given year.
  // use a simple calculation for the half-year investment return rate.
  const halfYearReturnFactor = 1 + investmentReturnRate / 100 / 2;

  for (var i = 1; i <= yearNumber; i++) {
    const surplus = calculateRentersSurplus({
      monthlyRent,
      rentIncreaseRate,
      mortgagePrincipal,
      annualMortgageInterestRate,
      loanTermYears,
      yearNumber: i,
      propertyTaxRate,
      maintenanceCostPercentage,
      initialHomePrice,
      homePriceGrowthRate,
    });

    bookValue += surplus;

    portfolioValue =
      portfolioValue * (1 + investmentReturnRate / 100) +
      surplus * halfYearReturnFactor;
  }

  const afterTaxValue =
    bookValue +
    (portfolioValue - bookValue) * (1 - capitalGainTaxOnInvestment / 100);

  return afterTaxValue;
}

// Calculate renter's advantage over buying at the end of the given year
export function calculateRentersAdvantageAtYearEnd({
  monthlyRent,
  rentIncreaseRate,
  annualMortgageInterestRate,
  loanTermYears,
  yearNumber,
  investmentReturnRate,
  downPaymentPercentage,
  buyersClosingCostPercentage,
  propertyTaxRate,
  maintenanceCostPercentage,
  initialHomePrice,
  homePriceGrowthRate,
  sellersClosingCostPercentage,
  capitalGainTaxOnInvestment,
}) {
  const mortgagePrincipal =
    initialHomePrice * (1 - downPaymentPercentage / 100);

  const rentersPortfolioValue = calculateRentersPortfolioValue({
    monthlyRent,
    rentIncreaseRate,
    mortgagePrincipal,
    annualMortgageInterestRate,
    loanTermYears,
    yearNumber,
    investmentReturnRate,
    downPaymentPercentage,
    buyersClosingCostPercentage,
    propertyTaxRate,
    maintenanceCostPercentage,
    initialHomePrice,
    homePriceGrowthRate,
    sellersClosingCostPercentage,
    capitalGainTaxOnInvestment,
  });

  const ownersEquity = calculateOwnersEquityAtYearEnd({
    initialHomePrice,
    homePriceGrowthRate,
    yearNumber,
    mortgagePrincipal,
    annualMortgageInterestRate,
    loanTermYears,
    sellersClosingCostPercentage,
  });

  const result = rentersPortfolioValue - ownersEquity;

  return result;
}