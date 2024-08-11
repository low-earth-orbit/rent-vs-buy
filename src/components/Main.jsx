import { useState } from "react";
import Result from "./Result";

const Main = () => {
  const [userInput, setUserInput] = useState({
    isRentSelected: true,
    price: 1000000,
    rent: 3000,
    propertyTax: 1,
    maintenanceCost: 2,
    downPayment: 20,
    mortgageRate: 4.75,
    investmentReturn: 6.4,
    homePriceChange: 3,
  });

  function handleChange(inputIdentifier, newValue) {
    if (inputIdentifier === "selectRent") {
      setUserInput((prevUserInput) => {
        return { ...prevUserInput, isRentSelected: true };
      });
    } else if (inputIdentifier === "selectPrice") {
      setUserInput((prevUserInput) => {
        return { ...prevUserInput, isRentSelected: false };
      });
    } else {
      setUserInput((prevUserInput) => {
        return { ...prevUserInput, [inputIdentifier]: +newValue }; // + converts string to number
      });
    }
  }

  return (
    <main className="container">
      <div className="row gx-5">
        <div className="col-6">
          <div
            id="start"
            className="btn-group btn-group-sm"
            role="group"
            aria-label="Select an option to start with"
          >
            <input
              type="radio"
              className="btn-check"
              name="btnradio"
              id="rentOption"
              autoComplete="off"
              onClick={() => {
                handleChange("selectRent", null);
              }}
              checked={userInput.isRentSelected}
              title="Select this option if you know the monthly rent of the property. You can also estimate the amount of rent by properties with similar conditions."
              readOnly
            />
            <label className="btn btn-outline-dark" htmlFor="rentOption">
              Monthly Rent
            </label>

            <input
              type="radio"
              className="btn-check"
              name="btnradio"
              id="priceOption"
              autoComplete="off"
              onClick={() => {
                handleChange("selectPrice", null);
              }}
              checked={!userInput.isRentSelected}
              title="Select this option if you know the property price. You can also estimate the price by similar units nearby."
              readOnly
            />
            <label className="btn btn-outline-dark" htmlFor="priceOption">
              Property Price
            </label>
          </div>
          <form id="form">
            {userInput.isRentSelected ? (
              <div className="form-group">
                <label htmlFor="rent">Monthly Rent</label>
                <div className="input-group mb-3">
                  <div className="input-group-prepend">
                    <span className="input-group-text">$</span>
                  </div>
                  <input
                    id="rent"
                    type="number"
                    min="0"
                    className="form-control"
                    onChange={(event) => {
                      handleChange("rent", event.target.value);
                    }}
                    value={userInput.rent}
                    placeholder="Enter the monthly rent"
                    aria-label="Enter the amount of monthly rent to the nearest dollar"
                    step="100"
                    required
                  />
                  <div className="input-group-append">
                    <span className="input-group-text">.00</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="price">Property Price</label>
                <div className="input-group mb-3">
                  <div className="input-group-prepend">
                    <span className="input-group-text">$</span>
                  </div>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    className="form-control"
                    onChange={(event) => {
                      handleChange("price", event.target.value);
                    }}
                    value={userInput.price}
                    placeholder="Enter the property price"
                    aria-label="Enter the price of the property to the nearest dollar"
                    step="10000"
                  />
                  <div className="input-group-append">
                    <span className="input-group-text">.00</span>
                  </div>
                </div>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="propertyTax">Property Tax Rate</label>
              <div className="input-group mb-3">
                <input
                  id="propertyTax"
                  type="number"
                  min="0"
                  className="form-control"
                  onChange={(event) => {
                    handleChange("propertyTax", event.target.value);
                  }}
                  value={userInput.propertyTax}
                  placeholder="Enter the property tax rate"
                  aria-label="Enter the property tax rate"
                  step="0.1"
                />
                <div className="input-group-append">
                  <span className="input-group-text">%</span>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="maintenanceCost">Maintenance Cost</label>
              <div id="maintenanceCostHelp" className="form-text">
                Include depreciation, repairs, condo fees, insurance premiums,
                etc. The default value is based on an estimated depreciation of
                1.5% plus additional expenditures.
              </div>
              <div className="input-group mb-3">
                <input
                  id="maintenanceCost"
                  type="number"
                  min="0"
                  className="form-control"
                  onChange={(event) => {
                    handleChange("maintenanceCost", event.target.value);
                  }}
                  value={userInput.maintenanceCost}
                  placeholder="Enter maintenance cost as a percentage of property price"
                  aria-label="Enter maintenance cost as a percentage of property price"
                  step="0.1"
                />
                <div className="input-group-append">
                  <span className="input-group-text">%</span>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="downPayment">Down Payment</label>
              <div className="input-group mb-3">
                <input
                  id="downPayment"
                  type="number"
                  min="0"
                  max="100"
                  className="form-control"
                  onChange={(event) => {
                    handleChange("downPayment", event.target.value);
                  }}
                  value={userInput.downPayment}
                  placeholder="Enter the percentage of down payment"
                  aria-label="Enter the percentage of down payment"
                  step="1"
                />
                <div className="input-group-append">
                  <span className="input-group-text">%</span>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="mortgageRate">Mortgage Rate</label>
              <div id="mortgageRateHelp" className="form-text">
                The default value is based on a 2.75% neutral rate plus a 2%
                spread.
              </div>
              <div className="input-group mb-3">
                <input
                  id="mortgageRate"
                  type="number"
                  className="form-control"
                  onChange={(event) => {
                    handleChange("mortgageRate", event.target.value);
                  }}
                  value={userInput.mortgageRate}
                  placeholder="Enter the mortgage rate"
                  aria-label="Enter the mortgage rate"
                  step="0.1"
                />
                <div className="input-group-append">
                  <span className="input-group-text">%</span>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="opportunityCostOfDownPayment">
                Opportunity Cost of Down Payment
              </label>
              <div id="opportunityCostOfDownPayment" className="form-text">
                Enter the expected return of your investment portfolio if you
                use the down payment amount for investing. The default value is
                projected return of an 80/20 growth portfolio.
              </div>
              <div className="input-group mb-3">
                <input
                  id="investmentReturn"
                  type="number"
                  className="form-control"
                  onChange={(event) => {
                    handleChange("investmentReturn", event.target.value);
                  }}
                  value={userInput.investmentReturn}
                  placeholder="Enter the opportunity cost of down payment"
                  aria-label="Enter the opportunity cost of down payment"
                  step="0.1"
                />
                <div className="input-group-append">
                  <span className="input-group-text">%</span>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="homePriceChange">Home Price Growth</label>
              <div id="homePriceChange" className="form-text">
                The default value is 3%, assuming 1% real price change.
              </div>
              <div className="input-group mb-3">
                <input
                  id="homePriceChange"
                  type="number"
                  className="form-control"
                  onChange={(event) => {
                    handleChange("homePriceChange", event.target.value);
                  }}
                  value={userInput.homePriceChange}
                  placeholder="Enter the expected growth of home price"
                  aria-label="Enter the expected growth of home price"
                  step="0.1"
                />
                <div className="input-group-append">
                  <span className="input-group-text">%</span>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="col-5">
          <Result userInput={userInput} />
        </div>
      </div>
    </main>
  );
};

export default Main;
