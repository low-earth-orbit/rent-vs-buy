export const UNCERTAINTIES = {
  homePriceGrowthSigma: 2.0,
  investmentReturnSigma: 3.0,
  rentIncreaseSigma: 0.75,
  mortgageRateSigma: 1.5,
  dividendYieldSigma: 0.3,
};

export const DEFAULTS = {
  monthlyRent: 3500,
  rentIncreaseRate: 2.5,
  initialHomePrice: 1000000,
  homePriceGrowthRate: 2.5,
  buyersClosingCostPercentage: 2.5,
  sellersClosingCostPercentage: 4,
  propertyTaxRate: 1,
  maintenanceCostPercentage: 1.5,
  condoFeesPerMonth: 0,
  downPaymentPercentage: 20,
  annualMortgageInterestRate: 4.5,
  amortizationPeriod: 25,
  holdingPeriod: 12,
  investmentReturnRate: 6,
  dividendYield: 1.5,
  dividendTaxRate: 30,
  capitalGainTaxRate: 15,
  ...UNCERTAINTIES,
};

export const PRESETS = [
  { id: "defaults", label: "Base Case", values: DEFAULTS },
  {
    id: "bay-street",
    label: "Bay Street starter condo",
    values: {
      ...DEFAULTS,
      monthlyRent: 2700,
      rentIncreaseRate: 2.5,
      initialHomePrice: 798000,
      homePriceGrowthRate: 3,
      downPaymentPercentage: 10,
      amortizationPeriod: 30,
      maintenanceCostPercentage: 0.5,
      condoFeesPerMonth: 600,
      propertyTaxRate: 0.49,
      buyersClosingCostPercentage: 4,
      sellersClosingCostPercentage: 4,
    },
  },
  {
    id: "vancouver",
    label: "Raincouver townhouse",
    values: {
      ...DEFAULTS,
      monthlyRent: 4000,
      rentIncreaseRate: 2.5,
      initialHomePrice: 1198000,
      homePriceGrowthRate: 3,
      maintenanceCostPercentage: 1.3,
      condoFeesPerMonth: 350,
      propertyTaxRate: 0.29,
      buyersClosingCostPercentage: 2.5,
      sellersClosingCostPercentage: 4,
      amortizationPeriod: 30,
    },
  },
  {
    id: "calgary",
    label: "Calgary SFH",
    values: {
      ...DEFAULTS,
      monthlyRent: 2800,
      rentIncreaseRate: 2,
      initialHomePrice: 625000,
      homePriceGrowthRate: 2.5,
      maintenanceCostPercentage: 1.5,
      propertyTaxRate: 0.62,
      buyersClosingCostPercentage: 0.75,
      sellersClosingCostPercentage: 4,
    },
  },
];

export function getActivePreset(userInput, allPresets) {
  return (
    allPresets.find((p) =>
      Object.keys(p.values).every((k) => p.values[k] === userInput[k]),
    ) ?? null
  );
}
