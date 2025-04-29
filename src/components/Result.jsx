import { calculateRentersAdvantageAtYearEnd } from "../utils/math";

function validateUserInput(input) {
  const errors = {};

  if (!input.monthlyRent) {
    errors.monthlyRent = "Monthly rent is required";
  } else if (input.monthlyRent <= 0) {
    errors.monthlyRent = "Monthly rent must be greater than $0";
  }

  if (!input.initialHomePrice) {
    errors.initialHomePrice = "Property price is required";
  } else if (input.initialHomePrice <= 0) {
    errors.initialHomePrice = "Property price must be greater than $0";
  }

  if (!input.downPaymentPercentage) {
    errors.downPaymentPercentage = "Down payment percentage is required";
  } else if (
    input.downPaymentPercentage < 5 ||
    input.downPaymentPercentage > 100
  ) {
    errors.downPaymentPercentage = "Down payment must be between 5% and 100%";
  }

  if (!input.loanTermYears) {
    errors.loanTermYears = "Mortgage term is required";
  } else if (input.loanTermYears < 5 || input.loanTermYears > 30) {
    errors.loanTermYears = "Mortgage term must be between 5 and 30 years";
  }

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
            <th scope="col">Net Worth Difference</th>
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
