export const FIELD_CONSTRAINTS = {
  monthlyRent: { min: 1, max: undefined, step: 100 },
  rentIncreaseRate: {
    min: undefined,
    max: undefined,
    step: 0.5,
    allowNegative: true,
  },
  initialHomePrice: { min: 1, max: undefined, step: 10000 },
  homePriceGrowthRate: {
    min: undefined,
    max: undefined,
    step: 0.5,
    allowNegative: true,
  },
  buyersClosingCostPercentage: { min: 0, max: undefined, step: 0.25 },
  sellersClosingCostPercentage: { min: 0, max: undefined, step: 0.25 },
  propertyTaxRate: { min: 0, max: undefined, step: 0.1 },
  maintenanceCostPercentage: { min: 0, max: undefined, step: 0.1 },
  downPaymentPercentage: { min: 5, max: 100, step: 5 },
  annualMortgageInterestRate: { min: 0, max: undefined, step: 0.25 },
  mortgageTerm: { min: 5, max: 30, step: 5 },
  investmentReturnRate: {
    min: 0,
    max: undefined,
    step: 0.5,
  },
  dividendYield: { min: 0, max: undefined, step: 0.5 },
  dividendTaxRate: { min: 0, max: undefined, step: 1 },
  investmentGainTax: { min: 0, max: undefined, step: 1 },
};

function isEmpty(value) {
  return (
    value === "" ||
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isNaN(value))
  );
}

export function validateUserInput(input) {
  const errors = {};
  const mortgageDisabled = input.downPaymentPercentage === 100;

  for (const [field, { min, max }] of Object.entries(FIELD_CONSTRAINTS)) {
    if (
      mortgageDisabled &&
      (field === "annualMortgageInterestRate" || field === "mortgageTerm")
    ) {
      continue;
    }

    const value = input[field];

    if (isEmpty(value)) {
      errors[field] = "Required";
      continue;
    }

    if (value < min || value > max) {
      errors[field] = `Must be between ${min} and ${max}`;
    }
  }

  if (
    !errors.dividendYield &&
    !isEmpty(input.dividendYield) &&
    !isEmpty(input.investmentReturnRate) &&
    input.dividendYield > input.investmentReturnRate
  ) {
    errors.dividendYield = "Cannot exceed total portfolio return";
  }

  return errors;
}
