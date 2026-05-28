// monthly interest rate, semi-annual compounding
export function calculateMonthlyMortgageInterestRate(
  annualMortgageInterestRate,
) {
  const rate =
    Math.pow(Math.pow(annualMortgageInterestRate / 2 / 100 + 1, 2), 1 / 12) - 1;
  return rate;
}

// monthly mortgage payment
export function calculateMonthlyMortgagePayment(
  mortgagePrincipal,
  annualMortgageInterestRate,
  amortization,
) {
  if (amortization <= 0) {
    throw new Error("Amortization period must be greater than zero.");
  }

  if (mortgagePrincipal <= 0) return 0;

  if (annualMortgageInterestRate === 0) {
    return mortgagePrincipal / (amortization * 12);
  }

  const monthlyRate = calculateMonthlyMortgageInterestRate(
    annualMortgageInterestRate,
  );

  const totalPayments = amortization * 12;

  if (monthlyRate === 0) {
    return mortgagePrincipal / totalPayments;
  }

  const monthlyPayment =
    (mortgagePrincipal * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -totalPayments));

  return monthlyPayment;
}

export function calculateMortgagePrincipal(
  initialHomePrice,
  downPaymentPercentage,
) {
  return initialHomePrice * (1 - downPaymentPercentage / 100);
}
