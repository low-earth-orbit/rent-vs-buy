function getMonthlyCompoundInterestRate(annualInterestRate) {
  return Math.pow(1 + annualInterestRate / 100, 1 / 12) - 1;
}

function ordinaryAnnuity(pmt, r, n) {
  return pmt * ((Math.pow(1 + r / 100, n) - 1) / (r / 100));
}

console.log(
  "getMonthlyCompoundInterestRate = ",
  getMonthlyCompoundInterestRate(6.4) * 100
);
console.log(
  "ordinaryAnnuity = ",
  ordinaryAnnuity(1000, getMonthlyCompoundInterestRate(6.4) * 100, 12)
);
