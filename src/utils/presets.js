export const UNCERTAINTIES = {
  homePriceGrowthSigma: 2.0,
  investmentReturnSigma: 3.0,
  rentIncreaseSigma: 0.75,
  ownerCostGrowthSigma: 0.75,
  mortgageRateSigma: 1.5,
  dividendYieldSigma: 0.3,
};

export const DEFAULTS = {
  monthlyRent: 3500,
  rentIncreaseRate: 2.5,
  ownerCostGrowthRate: 2.5,
  initialHomePrice: 1000000,
  homePriceGrowthRate: 3,
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
    label: "Starter condo @ Bay Street",
    values: {
      ...DEFAULTS,
      rentIncreaseRate: 2.5,
      ownerCostGrowthRate: 3,
      homePriceGrowthRate: 3.5,
      monthlyRent: 2700,
      initialHomePrice: 798000,
      downPaymentPercentage: 20,
      amortizationPeriod: 25,
      maintenanceCostPercentage: 0.5,
      condoFeesPerMonth: 600,
      propertyTaxRate: 0.49,
      holdingPeriod: 5,
      buyersClosingCostPercentage: 4,
      sellersClosingCostPercentage: 4,
    },
  },
  {
    id: "vancouver",
    label: "Raincouver townhouse",
    values: {
      ...DEFAULTS,
      rentIncreaseRate: 2.5,
      ownerCostGrowthRate: 3,
      homePriceGrowthRate: 3,
      monthlyRent: 4500,
      initialHomePrice: 1299900,
      maintenanceCostPercentage: 1,
      condoFeesPerMonth: 656,
      propertyTaxRate: 0.3,
      holdingPeriod: 10,
      buyersClosingCostPercentage: 2.5,
      sellersClosingCostPercentage: 4,
      amortizationPeriod: 25,
    },
  },
  {
    id: "calgary",
    label: "Calgary SFH",
    values: {
      ...DEFAULTS,
      rentIncreaseRate: 2.5,
      ownerCostGrowthRate: 2.5,
      homePriceGrowthRate: 3,
      monthlyRent: 2800,
      initialHomePrice: 714800,
      maintenanceCostPercentage: 1.5,
      propertyTaxRate: 0.6,
      holdingPeriod: 15,
      buyersClosingCostPercentage: 0.75,
      sellersClosingCostPercentage: 4,
    },
  },
  {
    id: "fred",
    label: "Freddy little home",
    values: {
      ...DEFAULTS,
      rentIncreaseRate: 2.5,
      ownerCostGrowthRate: 2.5,
      homePriceGrowthRate: 2.5,
      monthlyRent: 1800,
      initialHomePrice: 320000,
      maintenanceCostPercentage: 0.8,
      condoFeesPerMonth: 420,
      propertyTaxRate: 1.3,
      holdingPeriod: 8,
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
