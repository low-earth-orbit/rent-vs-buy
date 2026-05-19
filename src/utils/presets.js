export const DEFAULTS = {
  monthlyRent: 5000,
  rentIncreaseRate: 2.5,
  initialHomePrice: 1000000,
  homePriceGrowthRate: 2,
  buyersClosingCostPercentage: 3,
  sellersClosingCostPercentage: 4,
  propertyTaxRate: 1,
  maintenanceCostPercentage: 2,
  downPaymentPercentage: 20,
  annualMortgageInterestRate: 4.5,
  mortgageTerm: 25,
  investmentReturnRate: 6,
  dividendYield: 1.5,
  dividendTaxRate: 30,
  investmentGainTax: 15,
};

export const PRESETS = [
  { label: "Defaults", values: DEFAULTS },
  {
    label: "Bay Street Condo",
    values: {
      ...DEFAULTS,
      monthlyRent: 3000,
      rentIncreaseRate: 3,
      initialHomePrice: 800000,
      homePriceGrowthRate: 3.5,
      downPaymentPercentage: 10,
      mortgageTerm: 30,
      maintenanceCostPercentage: 2.5,
      propertyTaxRate: 0.5,
    },
  },
  {
    label: "Calgary Townhouse",
    values: {
      ...DEFAULTS,
      monthlyRent: 2300,
      rentIncreaseRate: 2,
      initialHomePrice: 575000,
      homePriceGrowthRate: 2,
      maintenanceCostPercentage: 2.0,
      propertyTaxRate: 0.9,
    },
  },
  {
    label: "Ottawa Suburban SFH",
    values: {
      ...DEFAULTS,
      monthlyRent: 3100,
      rentIncreaseRate: 2,
      initialHomePrice: 750000,
      homePriceGrowthRate: 2.5,
      maintenanceCostPercentage: 2.0,
      propertyTaxRate: 1,
    },
  },
];
