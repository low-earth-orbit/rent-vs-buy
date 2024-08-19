// home price at the start of the given year
function getHomePriceYearStart(homePrice, homePriceGrowthPercentage, yearNumber) {
  if (yearNumber <= 0) {
    throw new Error("Invalid yearNumber");
  }
  const price = homePrice * Math.pow(1 + homePriceGrowthPercentage / 100, yearNumber - 1);
  return price;
}

// home price at the end of the given year
function getHomePriceYearEnd(homePrice, homePriceGrowthPercentage, yearNumber) {
  if (yearNumber <= 0) {
    throw new Error("Invalid yearNumber");
  }
  const price = homePrice * Math.pow(1 + homePriceGrowthPercentage / 100, yearNumber);
  return price;
}

// rent of the given year
function getRentOfYear(monthlyRent, rentIncreasePercentage, yearNumber) {
  if (yearNumber <= 0) {
    throw new Error("Invalid yearNumber");
  }
  const rent =
    monthlyRent *
    Math.pow(1 + rentIncreasePercentage / 100, yearNumber - 1) *
    12;

  return rent;
}

// monthly interest rate, semi-annual compounding
function getMonthlyMortgageInterestRate(annualInterestRate) {
  const rate =
    Math.pow(Math.pow(annualInterestRate / 2 / 100 + 1, 2), 1 / 12) - 1;
  return rate;
}

// monthly mortgage payment
function getMonthlyMortgage(principal, annualInterestRate, years) {
  if (principal <= 0 || years <= 0) {
    throw new Error("Principal and years must be greater than zero.");
  }

  if (annualInterestRate === 0) {
    return principal / (years * 12);
  }

  const monthlyInterestRate =
    getMonthlyMortgageInterestRate(annualInterestRate);

  const totalPayments = years * 12;

  const monthlyPayment =
    (principal * monthlyInterestRate) /
    (1 - Math.pow(1 + monthlyInterestRate, -totalPayments));

  return monthlyPayment;
}

// Annual mortgage of the given year
function getMortgageOfYear(principal, annualInterestRate, years, yearNumber) {
  if (yearNumber > years) return 0;

  const monthlyPayment = getMonthlyMortgage(
    principal,
    annualInterestRate,
    years
  );
  const annualMortgage = monthlyPayment * 12;
  return annualMortgage;
}

// mortgage balance at the end of the given year
function getMortgageBalanceYearEnd(
  principal,
  annualInterestRate,
  years,
  yearNumber
) {
  if (principal <= 0 || years <= 0 || yearNumber <= 0) {
    throw new Error("Invalid data.");
  }

  if (yearNumber > years) {
    return 0;
  }

  // Get the monthly mortgage payment
  const monthlyPayment = getMonthlyMortgage(
    principal,
    annualInterestRate,
    years
  );

  const monthlyInterestRate =
    getMonthlyMortgageInterestRate(annualInterestRate);

  const totalMonths = yearNumber * 12;

  let mortgageBalance = principal;

  for (let month = 1; month <= totalMonths; month++) {
    const interestPayment = mortgageBalance * monthlyInterestRate;

    const principalPayment = monthlyPayment - interestPayment;

    mortgageBalance -= principalPayment;
  }

  // console.log(
  //   `mortgageBalance end of year ${yearNumber} = `,
  //   mortgageBalance.toFixed(0)
  // );

  return mortgageBalance;
}

function getOwnersValueYearEnd({
  homePrice,
  homePriceGrowthPercentage,
  yearNumber,
  principal,
  annualInterestRate,
  years,
  sellersClosingCostsPercentage,
}) {
  const ownersValue =
    getHomePriceYearEnd(homePrice, homePriceGrowthPercentage, yearNumber) *
      (1 - sellersClosingCostsPercentage / 100) -
    getMortgageBalanceYearEnd(principal, annualInterestRate, years, yearNumber);

  // console.log(
  //   `ownersValue end of year ${yearNumber} = `,
  //   ownersValue.toFixed(0)
  // );

  return ownersValue;
}

// cash outflow of the given year for the owning case, including mortgage, property tax, maintenance.
// not including initial payment, i.e. down payment, closing fees.
function getOwnersCashOutOfYear(
  homePriceOfYearStart,
  mortgagePaymentOfYear,
  propertyTaxPercentage,
  maintenanceCostsPercentage
) {
  return (
    mortgagePaymentOfYear +
    (homePriceOfYearStart *
      (propertyTaxPercentage + maintenanceCostsPercentage)) /
      100
  );
}

function getRentersSurplusOfYear(
  monthlyRent,
  rentIncreasePercentage,
  principal,
  annualInterestRate,
  years,
  yearNumber,
  propertyTaxPercentage,
  maintenanceCostsPercentage,
  homePrice,
  homePriceGrowthPercentage
) {
  const mortgage = getMortgageOfYear(
    principal,
    annualInterestRate,
    years,
    yearNumber
  );
  const homePriceOfYearStart = getHomePriceYearStart(
    homePrice,
    homePriceGrowthPercentage,
    yearNumber
  );
  const cashOut = getOwnersCashOutOfYear(
    homePriceOfYearStart,
    mortgage,
    propertyTaxPercentage,
    maintenanceCostsPercentage
  );
  // console.log(`owner's cash out of Year ${yearNumber} = `, cashOut.toFixed(0));

  const surplus =
    cashOut - getRentOfYear(monthlyRent, rentIncreasePercentage, yearNumber);

  // console.log(`renter's surplus of Year ${yearNumber} = `, surplus.toFixed(0));
  return surplus;
}

function getRentersValueYearEnd({
  monthlyRent,
  rentIncreasePercentage,
  principal,
  annualInterestRate,
  years,
  yearNumber,
  investmentReturnRate,
  downPayment,
  buyersClosingCostsPercentage,
  propertyTaxPercentage,
  maintenanceCostsPercentage,
  homePrice,
  homePriceGrowthPercentage,
  capitalGainTaxOnInvestment,
}) {
  const initialValue =
    downPayment + homePrice * (buyersClosingCostsPercentage / 100);

  let portfolioValue = initialValue;
  let bookValue = initialValue;

  // assume surplus are invested in the middle of each year, i.e. surplus gains 1/2 year investment return within the given year.
  // use a simple calculation for the half-year investment return rate.
  const halfYearReturnFactor = 1 + investmentReturnRate / 100 / 2;

  for (var i = 1; i <= yearNumber; i++) {
    const surplus = getRentersSurplusOfYear(
      monthlyRent,
      rentIncreasePercentage,
      principal,
      annualInterestRate,
      years,
      i,
      propertyTaxPercentage,
      maintenanceCostsPercentage,
      homePrice,
      homePriceGrowthPercentage
    );

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

function calculateRentMinusBuyYearEnd({
  monthlyRent,
  rentIncreasePercentage,
  principal,
  annualInterestRate,
  years,
  yearNumber,
  investmentReturnRate,
  downPayment,
  buyersClosingCostsPercentage,
  propertyTaxPercentage,
  maintenanceCostsPercentage,
  homePrice,
  homePriceGrowthPercentage,
  sellersClosingCostsPercentage,
  capitalGainTaxOnInvestment,
}) {
  const rentersValue = getRentersValueYearEnd({
    monthlyRent,
    rentIncreasePercentage,
    principal,
    annualInterestRate,
    years,
    yearNumber,
    investmentReturnRate,
    downPayment,
    buyersClosingCostsPercentage,
    propertyTaxPercentage,
    maintenanceCostsPercentage,
    homePrice,
    homePriceGrowthPercentage,
    sellersClosingCostsPercentage,
    capitalGainTaxOnInvestment,
  });
  // console.log(
  //   `renter's value at Year ${yearNumber} = `,
  //   rentersValue.toFixed(0)
  // );

  const ownersValue = getOwnersValueYearEnd({
    homePrice,
    homePriceGrowthPercentage,
    yearNumber,
    principal,
    annualInterestRate,
    years,
    sellersClosingCostsPercentage,
  });
  // console.log(`owner value at Year ${yearNumber} = `, ownerValue.toFixed(0));

  const result = rentersValue - ownersValue;

  console.log(
    `renter's advantage at the end of Year ${yearNumber} = `,
    result.toFixed(0)
  );

  return result;
}

/*
  Test
*/
const homePrice = 350000;
const monthlyRent = 2200;
const rentIncreasePercentage = 3;
const investmentReturnRate = 6.4;
const buyersClosingCostsPercentage = 2.5;
const propertyTaxPercentage = 1.5;
const maintenanceCostsPercentage = 3;
const homePriceGrowthPercentage = 3;
const principal = homePrice * 0.8;
const annualInterestRate = 4.75;
const years = 25;
const downPayment = homePrice * 0.2;
const sellersClosingCostsPercentage = 5;
const capitalGainTaxOnInvestment = 10;

calculateRentMinusBuyYearEnd({
  monthlyRent,
  rentIncreasePercentage,
  principal,
  annualInterestRate,
  years,
  yearNumber: 1,
  investmentReturnRate,
  downPayment,
  buyersClosingCostsPercentage,
  propertyTaxPercentage,
  maintenanceCostsPercentage,
  homePrice,
  homePriceGrowthPercentage,
  sellersClosingCostsPercentage,
  capitalGainTaxOnInvestment,
});

calculateRentMinusBuyYearEnd({
  monthlyRent,
  rentIncreasePercentage,
  principal,
  annualInterestRate,
  years,
  yearNumber: 2,
  investmentReturnRate,
  downPayment,
  buyersClosingCostsPercentage,
  propertyTaxPercentage,
  maintenanceCostsPercentage,
  homePrice,
  homePriceGrowthPercentage,
  sellersClosingCostsPercentage,
  capitalGainTaxOnInvestment,
});

calculateRentMinusBuyYearEnd({
  monthlyRent,
  rentIncreasePercentage,
  principal,
  annualInterestRate,
  years,
  yearNumber: 5,
  investmentReturnRate,
  downPayment,
  buyersClosingCostsPercentage,
  propertyTaxPercentage,
  maintenanceCostsPercentage,
  homePrice,
  homePriceGrowthPercentage,
  sellersClosingCostsPercentage,
  capitalGainTaxOnInvestment,
});

calculateRentMinusBuyYearEnd({
  monthlyRent,
  rentIncreasePercentage,
  principal,
  annualInterestRate,
  years,
  yearNumber: 10,
  investmentReturnRate,
  downPayment,
  buyersClosingCostsPercentage,
  propertyTaxPercentage,
  maintenanceCostsPercentage,
  homePrice,
  homePriceGrowthPercentage,
  sellersClosingCostsPercentage,
  capitalGainTaxOnInvestment,
});

calculateRentMinusBuyYearEnd({
  monthlyRent,
  rentIncreasePercentage,
  principal,
  annualInterestRate,
  years,
  yearNumber: 20,
  investmentReturnRate,
  downPayment,
  buyersClosingCostsPercentage,
  propertyTaxPercentage,
  maintenanceCostsPercentage,
  homePrice,
  homePriceGrowthPercentage,
  sellersClosingCostsPercentage,
  capitalGainTaxOnInvestment,
});

calculateRentMinusBuyYearEnd({
  monthlyRent,
  rentIncreasePercentage,
  principal,
  annualInterestRate,
  years,
  yearNumber: 25,
  investmentReturnRate,
  downPayment,
  buyersClosingCostsPercentage,
  propertyTaxPercentage,
  maintenanceCostsPercentage,
  homePrice,
  homePriceGrowthPercentage,
  sellersClosingCostsPercentage,
  capitalGainTaxOnInvestment,
});

calculateRentMinusBuyYearEnd({
  monthlyRent,
  rentIncreasePercentage,
  principal,
  annualInterestRate,
  years,
  yearNumber: 30,
  investmentReturnRate,
  downPayment,
  buyersClosingCostsPercentage,
  propertyTaxPercentage,
  maintenanceCostsPercentage,
  homePrice,
  homePriceGrowthPercentage,
  sellersClosingCostsPercentage,
  capitalGainTaxOnInvestment,
});
