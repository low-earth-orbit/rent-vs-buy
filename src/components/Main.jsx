import { useState } from "react";
import Result from "./Result";
import UserInputForm from "./UserInputForm";

const Main = () => {
  const [userInput, setUserInput] = useState({
    monthlyRent: 5000,
    rentIncreaseRate: 3.2,
    initialHomePrice: 1000000,
    homePriceGrowthRate: 3.2,
    buyersClosingCostPercentage: 2,
    sellersClosingCostPercentage: 5,
    propertyTaxRate: 1,
    maintenanceCostPercentage: 2.5,
    downPaymentPercentage: 20,
    annualMortgageInterestRate: 4.75,
    loanTermYears: 25,
    investmentReturnRate: 6.4,
    capitalGainTaxOnInvestment: 20,
  });

  function handleChange(inputIdentifier, newValue) {
    setUserInput((prevUserInput) => {
      return {
        ...prevUserInput,
        [inputIdentifier]: newValue ? +newValue : newValue,
      }; // + converts string to number
    });
  }

  return (
    <div className="container">
      <div className="row">
        <div className="col-6">
          <UserInputForm userInput={userInput} handleChange={handleChange} />
        </div>
        <div className="col">
          <Result userInput={userInput} />
        </div>
      </div>
    </div>
  );
};

export default Main;
