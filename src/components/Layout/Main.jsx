import { useState } from "react";

const Main = () => {
  const [isRentSelected, setIsRentSelected] = useState(true);

  const [price, setPrice] = useState(500000);
  const [rent, setRent] = useState(2000);
  const [propertyTax, setPropertyTax] = useState(1.0);
  const [maintenanceCosts, setMaintenanceCosts] = useState(1.0);
  const [downPayment, setDownPayment] = useState(20);
  const [mortgageRate, setMortgageRate] = useState(4.75);
  const [opportunityCostOfDownPayment, setOpportunityCostOfDownPayment] =
    useState(6.4);
  const [homePriceGrowth, setHomePriceGrowth] = useState(3);

  const calculateFairPrice = (
    rent,
    propertyTax,
    maintenanceCosts,
    downPayment,
    mortgageRate,
    opportunityCostOfDownPayment
  ) => {
    const costOfOwning = calculateCostOfOwning(
      opportunityCostOfDownPayment,
      downPayment,
      mortgageRate,
      propertyTax,
      maintenanceCosts
    );
    const rentPerYear = rent * 12;
    const fairPrice = rentPerYear / costOfOwning;
    return fairPrice;
  };

  const calculateFairRent = (
    price,
    propertyTax,
    maintenanceCosts,
    downPayment,
    mortgageRate,
    opportunityCostOfDownPayment
  ) => {
    const costOfOwning = calculateCostOfOwning(
      opportunityCostOfDownPayment,
      downPayment,
      mortgageRate,
      propertyTax,
      maintenanceCosts
    );
    const fairRent = (price * costOfOwning) / 12;
    return fairRent;
  };

  const calculateCostOfOwning = (
    opportunityCostOfDownPayment,
    downPayment,
    mortgageRate,
    propertyTax,
    maintenanceCosts
  ) => {
    const capitalCost =
      (opportunityCostOfDownPayment / 100) * (downPayment / 100) +
      (mortgageRate / 100) * (1 - downPayment / 100) -
      homePriceGrowth / 100;
    const costOfOwning =
      capitalCost + propertyTax / 100 + maintenanceCosts / 100;
    return costOfOwning;
  };

  return (
    <main className="container">
      <div className="row gx-5">
        <div className="col-7">
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
              onClick={() => setIsRentSelected(true)}
              checked={isRentSelected}
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
              onClick={() => setIsRentSelected(false)}
              checked={!isRentSelected}
              title="Select this option if you know the property price. You can also estimate the price by similar units nearby."
              readOnly
            />
            <label className="btn btn-outline-dark" htmlFor="priceOption">
              Property Price
            </label>
          </div>
          <form id="form">
            {isRentSelected ? (
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
                    onChange={(event) => setRent(event.target.value)}
                    value={rent ? rent : ""}
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
                    onChange={(event) => setPrice(event.target.value)}
                    value={price}
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
              <label htmlFor="propertyTax">Property Tax</label>
              <div id="propertyTaxHelp" className="form-text">
                Enter the property tax rate for the area where the property is
                located.
              </div>
              <div className="input-group mb-3">
                <input
                  id="propertyTax"
                  type="number"
                  min="0"
                  className="form-control"
                  onChange={(event) => setPropertyTax(event.target.value)}
                  value={propertyTax}
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
              <label htmlFor="maintenanceCosts">Maintenance Costs</label>
              <div id="maintenanceCostsHelp" className="form-text">
                Include cost of repair, depreciation, condo fees, insurance
                premium, etc. As a rough estimate, you can use 1%.
              </div>
              <div className="input-group mb-3">
                <input
                  id="maintenanceCosts"
                  type="number"
                  min="0"
                  className="form-control"
                  onChange={(event) => setMaintenanceCosts(event.target.value)}
                  value={maintenanceCosts}
                  placeholder="Enter maintenance costs as a percentage of property price"
                  aria-label="Enter maintenance costs as a percentage of property price"
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
                  onChange={(event) => setDownPayment(event.target.value)}
                  value={downPayment}
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
                  onChange={(event) => setMortgageRate(event.target.value)}
                  value={mortgageRate}
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
                  id="opportunityCostOfDownPayment"
                  type="number"
                  className="form-control"
                  onChange={(event) =>
                    setOpportunityCostOfDownPayment(event.target.value)
                  }
                  value={opportunityCostOfDownPayment}
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
              <label htmlFor="homePriceGrowth">Home Price Growth</label>
              <div id="homePriceGrowth" className="form-text">
                The default value is 3%, assuming 1% real price change.
              </div>
              <div className="input-group mb-3">
                <input
                  id="homePriceGrowth"
                  type="number"
                  className="form-control"
                  onChange={(event) => setHomePriceGrowth(event.target.value)}
                  value={homePriceGrowth}
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
          <div id="result">
            {isRentSelected ? (
              <p>
                If you can purchase a similar property for less than{" "}
                <strong>
                  $
                  {calculateFairPrice(
                    rent,
                    propertyTax,
                    maintenanceCosts,
                    downPayment,
                    mortgageRate,
                    opportunityCostOfDownPayment
                  ).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </strong>
                , then owning is likely better.
              </p>
            ) : (
              <p>
                If you can rent a similar property for less than{" "}
                <strong>
                  $
                  {calculateFairRent(
                    price,
                    propertyTax,
                    maintenanceCosts,
                    downPayment,
                    mortgageRate,
                    opportunityCostOfDownPayment
                  ).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </strong>{" "}
                per month, then renting is likely better.
              </p>
            )}
          </div>
          <div id="Method">
            <small>
              <p>
                This calculator is inspired by the{" "}
                <a
                  href="https://www.pwlcapital.com/rent-or-own-your-home-5-rule/"
                  title="Learn more about the 5% Rule by Ben Felix"
                  target="_blank"
                  rel="noreferrer"
                  className="link-dark"
                >
                  5% Rule by Ben Felix
                </a>
                , although the sum may not always be 5%. When people decide to
                rent or buy a home, they often only compare the monthly mortgage
                payment with the monthly rent. This is not a complete picture
                because mortgage payments can be recovered when the property is
                sold and the down payment has an opportunity cost as it could
                have been invested in stocks.
              </p>
              <p>
                The calculator doesn't consider the fees for buying and selling
                a home. If you plan to stay in the property for only a few years
                before selling it, buying a home may not be a good financial
                decision.
              </p>
              <p>
                Overall, this calculator makes it easy to compare renting vs
                buying as you don't have to enter complicated financial
                assumptions. For a more accurate comparison considering
                investment length, the cash flow method is preferred. You can
                find a helpful spreadsheet{" "}
                <a
                  href="http://www.holypotato.net/?p=1073"
                  title="A rent vs buy spreadsheet based on cash flow method"
                  target="_blank"
                  rel="noreferrer"
                  className="link-dark"
                >
                  here
                </a>
                .
              </p>
            </small>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Main;
