import { calculateNetWorthAtYearEnd } from "./math";

function normalRandom() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function percentile(sorted, p) {
  const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1);
  return sorted[idx];
}

export function runMonteCarlo(userInput, numSimulations = 500) {
  const {
    homePriceGrowthSigma = 1.5,
    investmentReturnSigma = 2,
    rentIncreaseSigma = 0.75,
    mortgageRateSigma = 0.5,
    maintenanceSigma = 0.4,
    propertyTaxSigma = 0.15,

    dividendYieldSigma = 0.3,
  } = userInput;

  const horizon = 30;
  const yearlyRenter = Array.from({ length: horizon }, () => []);
  const yearlyOwner = Array.from({ length: horizon }, () => []);

  for (let sim = 0; sim < numSimulations; sim++) {
    const scenario = {
      ...userInput,
      homePriceGrowthRate:
        userInput.homePriceGrowthRate + normalRandom() * homePriceGrowthSigma,
      investmentReturnRate: Math.max(
        0,
        userInput.investmentReturnRate + normalRandom() * investmentReturnSigma,
      ),
      rentIncreaseRate:
        userInput.rentIncreaseRate + normalRandom() * rentIncreaseSigma,
      annualMortgageInterestRate: Math.max(
        0.1,
        userInput.annualMortgageInterestRate +
          normalRandom() * mortgageRateSigma,
      ),
      maintenanceCostPercentage: Math.max(
        0,
        userInput.maintenanceCostPercentage + normalRandom() * maintenanceSigma,
      ),
      propertyTaxRate: Math.max(
        0,
        userInput.propertyTaxRate + normalRandom() * propertyTaxSigma,
      ),

    };
    // dividendYield must not exceed investmentReturnRate after both are perturbed
    scenario.dividendYield = Math.min(
      Math.max(0, userInput.dividendYield + normalRandom() * dividendYieldSigma),
      scenario.investmentReturnRate,
    );

    for (let year = 1; year <= horizon; year++) {
      const { renterNetWorth, ownerNetWorth } = calculateNetWorthAtYearEnd({
        ...scenario,
        yearNumber: year,
      });
      yearlyRenter[year - 1].push(renterNetWorth);
      yearlyOwner[year - 1].push(ownerNetWorth);
    }
  }

  return Array.from({ length: horizon }, (_, i) => {
    const renter = [...yearlyRenter[i]].sort((a, b) => a - b);
    const owner = [...yearlyOwner[i]].sort((a, b) => a - b);

    return {
      year: i + 1,
      renterP25: percentile(renter, 0.25),
      renterMedian: percentile(renter, 0.5),
      renterP75: percentile(renter, 0.75),
      ownerP25: percentile(owner, 0.25),
      ownerMedian: percentile(owner, 0.5),
      ownerP75: percentile(owner, 0.75),
    };
  });
}
