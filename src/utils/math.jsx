// home value at the start of the given year
function getHomePriceStartOfYear(homePrice, priceChange, yearNumber) {
  const price = homePrice * Math.pow(1 + priceChange / 100, yearNumber - 1);
  return price;
}

// home value at the end of the given year
function getHomePriceEndOfYear(homePrice, priceChange, yearNumber) {
  const price = homePrice * Math.pow(1 + priceChange / 100, yearNumber);
  return price;
}

// rent of the given year
function getRentOfTheYear(monthlyRent, rentIncrease, yearNumber) {
  if (yearNumber === 0) return 0;
  const rent =
    monthlyRent * Math.pow(1 + rentIncrease / 100, yearNumber - 1) * 12;
  // console.log("Rent of year ", yearNumber, " = ", rent.toFixed(0));

  return rent;
}

// Calculate the monthly interest rate using the semi-annual compounding formula
function getMonthlyMortgageInterestRate(annualInterestRate) {
  return Math.pow(Math.pow(annualInterestRate / 2 / 100 + 1, 2), 1 / 12) - 1;
}

// function getMonthlyCompoundInterestRate(annualInterestRate) {
//   return Math.pow(1 + annualInterestRate / 100, 1 / 12) - 1;
// }

// function ordinaryAnnuity(pmt, r, n) {
//   return pmt * ((Math.pow(1 + r / 100, n) - 1) / (r / 100));
// }

// console.log(
//   "getMonthlyCompoundInterestRate = ",
//   getMonthlyCompoundInterestRate(6.4) * 100
// );
// console.log(
//   "ordinaryAnnuity = ",
//   ordinaryAnnuity(1000, getMonthlyCompoundInterestRate(6.4) * 100, 12)
// );

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

  // console.log(`monthlyPayment  = `, monthlyPayment.toFixed(0));

  return monthlyPayment;
}

// Annual mortgage
function getAnnualMortgage(monthlyPayment) {
  return monthlyPayment > 0 ? monthlyPayment * 12 : 0;
}

// Annual mortgage of the given year
function getMortgageOfTheYear(
  principal,
  annualInterestRate,
  years,
  yearNumber
) {
  if (yearNumber > years) return 0;

  const monthlyPayment = getMonthlyMortgage(
    principal,
    annualInterestRate,
    years
  );
  const annualMortgage = getAnnualMortgage(monthlyPayment);
  return annualMortgage;
}

// mortgage balance at the end of the given year
function getMortgageBalanceEndOfYear(
  principal,
  annualInterestRate,
  years,
  yearNumber
) {
  if (principal < 0 || years < 0 || yearNumber < 0) {
    throw new Error("Invalid data.");
  }

  if (yearNumber === 0) return principal;

  if (yearNumber > years || principal === 0) {
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

    if (mortgageBalance < 0) {
      mortgageBalance = 0;
      break;
    }
  }

  return mortgageBalance;
}

function getOwnerValueEndOfYear({
  homePrice,
  priceChange,
  yearNumber,
  principal,
  annualInterestRate,
  years,
}) {
  const ownerValue =
    getHomePriceEndOfYear(homePrice, priceChange, yearNumber) -
    getMortgageBalanceEndOfYear(
      principal,
      annualInterestRate,
      years,
      yearNumber
    );
    
  return ownerValue;
}

// cash outflow of the given year for the owning case, including mortgage, property tax, maintenance.
function getCashOutOfTheYear(
  homePriceOfTheYear,
  mortgagePaymentOfTheYear,
  propertyTax,
  maintenanceCost
) {
  return (
    mortgagePaymentOfTheYear +
    (homePriceOfTheYear * (propertyTax + maintenanceCost)) / 100
  );
}

function getRenterSurplus(
  monthlyRent,
  rentIncrease,
  principal,
  annualInterestRate,
  years,
  yearNumber,
  propertyTax,
  maintenanceCost,
  homePrice,
  priceChange
) {
  const mortgage = getMortgageOfTheYear(
    principal,
    annualInterestRate,
    years,
    yearNumber
  );
  const homePriceOfTheYear = getHomePriceStartOfYear(
    homePrice,
    priceChange,
    yearNumber
  );
  const cashOut = getCashOutOfTheYear(
    homePriceOfTheYear,
    mortgage,
    propertyTax,
    maintenanceCost
  );
  const surplus =
    cashOut - getRentOfTheYear(monthlyRent, rentIncrease, yearNumber);
  return surplus;
}

function getRenterValueEndOfYear({
  monthlyRent,
  rentIncrease,
  principal,
  annualInterestRate,
  years,
  yearNumber,
  investmentReturnRate,
  downPayment,
  buyerClosingFeePercentage,
  propertyTax,
  maintenanceCost,
  homePrice,
  priceChange,
}) {
  let value = downPayment + homePrice * (buyerClosingFeePercentage / 100);

  // assume surplus are invested in the middle of each year, i.e. surplus gains 1/2 year investment return within the given year.
  // use a simple calculation for the half-year investment return rate.
  const halfYearReturnFactor = 1 + investmentReturnRate / 100 / 2;

  for (var i = 1; i <= yearNumber; i++) {
    const surplus = getRenterSurplus(
      monthlyRent,
      rentIncrease,
      principal,
      annualInterestRate,
      years,
      i,
      propertyTax,
      maintenanceCost,
      homePrice,
      priceChange
    );

    if (i === 1) {
      value += surplus * halfYearReturnFactor;
    } else {
      value =
        value * (1 + investmentReturnRate / 100) +
        surplus * halfYearReturnFactor;
    }
    // console.log(`renter value at Year ${i} = `, value.toFixed(0));
  }

  return value;
}

function rentMinusBuyEndOfYear({
  monthlyRent,
  rentIncrease,
  principal,
  annualInterestRate,
  years,
  yearNumber,
  investmentReturnRate,
  downPayment,
  buyerClosingFeePercentage,
  propertyTax,
  maintenanceCost,
  homePrice,
  priceChange,
}) {
  const renterValue = getRenterValueEndOfYear({
    monthlyRent,
    rentIncrease,
    principal,
    annualInterestRate,
    years,
    yearNumber,
    investmentReturnRate,
    downPayment,
    buyerClosingFeePercentage,
    propertyTax,
    maintenanceCost,
    homePrice,
    priceChange,
  });

  // console.log(`renter value at Year ${yearNumber} = `, renterValue.toFixed(0));

  const ownerValue = getOwnerValueEndOfYear(
    homePrice,
    priceChange,
    yearNumber,
    principal,
    annualInterestRate,
    years
  );
  // console.log(`owner value at Year ${yearNumber} = `, ownerValue.toFixed(0));

  const result = renterValue - ownerValue;

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
const rentIncrease = 3;
const investmentReturnRate = 6.4;
const buyerClosingFeePercentage = 2.5;
const propertyTax = 1.5;
const maintenanceCost = 3;
const priceChange = 3;
const principal = homePrice * 0.8;
const annualInterestRate = 4.75;
const years = 25;
const yearNumber = 30; // Year number to calculate ending principal
const downPayment = homePrice * 0.2;

rentMinusBuyEndOfYear({
  monthlyRent,
  rentIncrease,
  principal,
  annualInterestRate,
  years,
  yearNumber: 0,
  investmentReturnRate,
  downPayment,
  buyerClosingFeePercentage,
  propertyTax,
  maintenanceCost,
  homePrice,
  priceChange,
});

rentMinusBuyEndOfYear({
  monthlyRent,
  rentIncrease,
  principal,
  annualInterestRate,
  years,
  yearNumber: 1,
  investmentReturnRate,
  downPayment,
  buyerClosingFeePercentage,
  propertyTax,
  maintenanceCost,
  homePrice,
  priceChange,
});

rentMinusBuyEndOfYear({
  monthlyRent,
  rentIncrease,
  principal,
  annualInterestRate,
  years,
  yearNumber: 2,
  investmentReturnRate,
  downPayment,
  buyerClosingFeePercentage,
  propertyTax,
  maintenanceCost,
  homePrice,
  priceChange,
});

rentMinusBuyEndOfYear({
  monthlyRent,
  rentIncrease,
  principal,
  annualInterestRate,
  years,
  yearNumber: 5,
  investmentReturnRate,
  downPayment,
  buyerClosingFeePercentage,
  propertyTax,
  maintenanceCost,
  homePrice,
  priceChange,
});

rentMinusBuyEndOfYear({
  monthlyRent,
  rentIncrease,
  principal,
  annualInterestRate,
  years,
  yearNumber: 10,
  investmentReturnRate,
  downPayment,
  buyerClosingFeePercentage,
  propertyTax,
  maintenanceCost,
  homePrice,
  priceChange,
});

rentMinusBuyEndOfYear({
  monthlyRent,
  rentIncrease,
  principal,
  annualInterestRate,
  years,
  yearNumber: 20,
  investmentReturnRate,
  downPayment,
  buyerClosingFeePercentage,
  propertyTax,
  maintenanceCost,
  homePrice,
  priceChange,
});

rentMinusBuyEndOfYear({
  monthlyRent,
  rentIncrease,
  principal,
  annualInterestRate,
  years,
  yearNumber: 25,
  investmentReturnRate,
  downPayment,
  buyerClosingFeePercentage,
  propertyTax,
  maintenanceCost,
  homePrice,
  priceChange,
});

rentMinusBuyEndOfYear({
  monthlyRent,
  rentIncrease,
  principal,
  annualInterestRate,
  years,
  yearNumber: 30,
  investmentReturnRate,
  downPayment,
  buyerClosingFeePercentage,
  propertyTax,
  maintenanceCost,
  homePrice,
  priceChange,
});

console.log(
  getRenterValueEndOfYear({
    monthlyRent,
    rentIncrease,
    principal,
    annualInterestRate,
    years,
    yearNumber,
    investmentReturnRate,
    downPayment,
    buyerClosingFeePercentage,
    propertyTax,
    maintenanceCost,
    homePrice,
    priceChange,
  })
);
