import { useState } from "react";

const Main = () => {
  const [isRentSelected, setIsRentSelected] = useState(true);

  const [price, setPrice] = useState(500000);
  const [rent, setRent] = useState(2000);
  const [propertyTax, setPropertyTax] = useState(1.3386);
  const [maintenanceCost, setMaintenanceCost] = useState(1.5);
  const [downPayment, setDownPayment] = useState(20);
  const [mortgageRate, setMortgageRate] = useState(5.57);
  const [stockMarketReturn, setStockMarketReturn] = useState(6.82);
  const [realEstatePriceReturn, setRealEstatePriceReturn] = useState(1.61);

  const calculateFairPrice = (
    rent,
    propertyTax,
    maintenanceCost,
    downPayment,
    mortgageRate,
    stockMarketReturn,
    realEstatePriceReturn
  ) => {
    const yearlyRent = rent * 12;
    const opportunityCostOfDownPayment =
      (stockMarketReturn - realEstatePriceReturn) / 100;
    const capitalCost =
      (opportunityCostOfDownPayment * downPayment) / 100 +
      (mortgageRate / 100) * (1 - downPayment / 100);
    const costOfOwning =
      capitalCost + propertyTax / 100 + maintenanceCost / 100;
    const fairPrice = yearlyRent / costOfOwning;
    return fairPrice;
  };

  return (
    <main>
      <p>
        Start from{" "}
        <button
          onClick={() => {
            setIsRentSelected(true);
          }}
          className="btn btn-light"
          data-bs-toggle="tooltip"
          data-bs-placement="bottom"
          title="Select this option if you know the monthly rent of the property. You can also estimate the amount of rent by properties of similar conditions."
        >
          Monthly Rent
        </button>{" "}
        or{" "}
        <button
          onClick={() => {
            setIsRentSelected(false);
          }}
          className="btn btn-light"
          data-bs-toggle="tooltip"
          data-bs-placement="bottom"
          title="Select this option if you know the property price of the property. You can also estimate the price by similar units nearby."
        >
          Property Price
        </button>
      </p>
      <form>
        {isRentSelected ? (
          <div className="form-group">
            <label htmlFor="rent">Monthly rent</label>
            <div className="input-group mb-3">
              <div className="input-group-prepend">
                <span className="input-group-text">$</span>
              </div>
              <input
                id="rent"
                type="text"
                className="form-control"
                onChange={(event) => setRent(event.target.value)}
                value={rent}
                placeholder="Enter the monthly rent"
                aria-label="Enter the amount of monthly rent to the nearest dollar"
              />
              <div className="input-group-append">
                <span className="input-group-text">.00</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="rent">Property price</label>
            <div className="input-group mb-3">
              <div className="input-group-prepend">
                <span className="input-group-text">$</span>
              </div>
              <input
                id="price"
                type="text"
                className="form-control"
                onChange={(event) => setPrice(event.target.value)}
                value={price}
                placeholder="Enter the property price"
                aria-label="Enter the price of the property to the nearest dollar"
              />
              <div className="input-group-append">
                <span className="input-group-text">.00</span>
              </div>
            </div>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="propertyTax">Property tax</label>
          <div className="input-group mb-3">
            <input
              id="propertyTax"
              className="form-control"
              onChange={(event) => setPropertyTax(event.target.value)}
              value={propertyTax}
              placeholder="Enter the property tax rate"
              aria-label="Enter the property tax rate"
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="maintenanceCost">Maintenance cost</label>
          <div className="input-group mb-3">
            <input
              id="maintenanceCost"
              className="form-control"
              onChange={(event) => setMaintenanceCost(event.target.value)}
              value={maintenanceCost}
              placeholder="Enter maintenance cost as a percentage of property price"
              aria-label="Enter maintenance cost as a percentage of property price"
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="downPayment">Down payment</label>
          <div className="input-group mb-3">
            <input
              id="downPayment"
              className="form-control"
              onChange={(event) => setDownPayment(event.target.value)}
              value={downPayment}
              placeholder="Enter the percentage of down payment"
              aria-label="Enter the percentage of down payment"
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="mortgageRate">Mortgage rate</label>
          <div className="input-group mb-3">
            <input
              id="mortgageRate"
              className="form-control"
              onChange={(event) => setMortgageRate(event.target.value)}
              value={mortgageRate}
              placeholder="Enter the mortgage rate in percentage"
              aria-label="Enter the mortgage rate in percentage"
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="stockMarketReturn">Stock market return</label>
          <div className="input-group mb-3">
            <input
              id="stockMarketReturn"
              className="form-control"
              onChange={(event) => setStockMarketReturn(event.target.value)}
              value={stockMarketReturn}
              placeholder="Enter the return rate of stock market"
              aria-label="Enter the return rate of stock market"
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="realEstatePriceReturn">
            Real estate price return
          </label>
          <div className="input-group mb-3">
            <input
              id="realEstatePriceReturn"
              className="form-control"
              onChange={(event) => setRealEstatePriceReturn(event.target.value)}
              value={realEstatePriceReturn}
              placeholder="Enter real estate price return"
              aria-label="Enter real estate price return"
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
      </form>

      {(isRentSelected &&
        price !== null &&
        rent &&
        propertyTax &&
        maintenanceCost &&
        downPayment,
      mortgageRate && stockMarketReturn && realEstatePriceReturn) && (
        <p>
          If you can purchase the property with less than $
          {Math.round(
            calculateFairPrice(
              rent,
              propertyTax,
              maintenanceCost,
              downPayment,
              mortgageRate,
              stockMarketReturn,
              realEstatePriceReturn
            )
          )}
          , owning is better than renting.
        </p>
      )}
    </main>
  );
};

export default Main;
