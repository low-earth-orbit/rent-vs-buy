import { calculateRentersAdvantageAtYearEnd } from "../utils/math";

function validateUserInput(input) {
  const errors = {};

  // Validate each input field
  if (!input.monthlyRent || input.monthlyRent <= 0)
    errors.monthlyRent = "Monthly rent must be greater than 0.";
  if (!input.rentIncreaseRate || input.rentIncreaseRate < 0)
    errors.rentIncreaseRate = "Rent increase rate must be non-negative.";
  if (!input.initialHomePrice || input.initialHomePrice <= 0)
    errors.initialHomePrice = "Home price must be greater than 0.";
  if (!input.homePriceGrowthRate || input.homePriceGrowthRate < 0)
    errors.homePriceGrowthRate = "Home price growth rate must be non-negative.";
  if (
    !input.buyersClosingCostPercentage ||
    input.buyersClosingCostPercentage < 0 ||
    input.buyersClosingCostPercentage > 100
  )
    errors.buyersClosingCostPercentage =
      "Buyers closing cost percentage must be between 0 and 100.";
  if (
    !input.sellersClosingCostPercentage ||
    input.sellersClosingCostPercentage < 0 ||
    input.sellersClosingCostPercentage > 100
  )
    errors.sellersClosingCostPercentage =
      "Sellers closing cost percentage must be between 0 and 100.";
  if (
    !input.propertyTaxRate ||
    input.propertyTaxRate < 0 ||
    input.propertyTaxRate > 100
  )
    errors.propertyTaxRate = "Property tax rate must be between 0 and 100.";
  if (
    !input.maintenanceCostPercentage ||
    input.maintenanceCostPercentage < 0 ||
    input.maintenanceCostPercentage > 100
  )
    errors.maintenanceCostPercentage =
      "Maintenance cost percentage must be between 0 and 100.";
  if (
    !input.downPaymentPercentage ||
    input.downPaymentPercentage <= 0 ||
    input.downPaymentPercentage > 100
  )
    errors.downPaymentPercentage =
      "Down payment percentage must be greater than 0 and less than or equal to 100.";
  if (!input.annualMortgageInterestRate || input.annualMortgageInterestRate < 0)
    errors.annualMortgageInterestRate =
      "Annual mortgage interest rate must be non-negative.";
  if (!input.loanTermYears || input.loanTermYears <= 0)
    errors.loanTermYears = "Loan term must be greater than 0 years.";
  if (!input.investmentReturnRate || input.investmentReturnRate < 0)
    errors.investmentReturnRate =
      "Investment return rate must be non-negative.";
  if (
    !input.capitalGainTaxOnInvestment ||
    input.capitalGainTaxOnInvestment < 0 ||
    input.capitalGainTaxOnInvestment > 100
  )
    errors.capitalGainTaxOnInvestment =
      "Capital gain tax on investment must be between 0 and 100.";

  return errors;
}

export default function Result({ userInput }) {
  const errors = validateUserInput(userInput);

  if (Object.keys(errors).length > 0) {
    return (
      <div className="error">
        <p>Valid user input is required:</p>
        <ul>
          {Object.keys(errors).map((field) => (
            <li key={field}>{errors[field]}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <>
      <p>Results are automatically generated below.</p>
      <table id="result" className="table table-sm table-hover">
        <thead>
          <tr>
            <th scope="col">End of Year</th>
            <th scope="col">Advantage</th>
            <th scope="col">Reference Amount</th>
          </tr>
        </thead>

        <tbody>
          {[...Array(30)].map((_, i) => {
            const yearNumber = i + 1;
            const rentersAdvantage = calculateRentersAdvantageAtYearEnd({
              ...userInput,
              yearNumber,
            });

            const amount = new Intl.NumberFormat("en-CA", {
              style: "currency",
              currency: "CAD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(Math.abs(rentersAdvantage));

            const isRentBetter = rentersAdvantage >= 0;
            const advantageText = isRentBetter ? "Rent" : "Buy";

            return (
              <tr
                key={yearNumber}
                className={isRentBetter ? "table-danger" : "table-success"}
              >
                <td>{yearNumber}</td>
                <td>{advantageText}</td>
                <td>{amount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
