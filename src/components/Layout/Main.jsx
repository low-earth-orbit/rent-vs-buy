import { useState } from "react";

const Main = () => {
  const [isRentSelected, setIsRentSelected] = useState(true);

  const [price, setPrice] = useState(500000);
  const [rent, setRent] = useState(2000);
  const [propertyTax, setPropertyTax] = useState(1.3386);
  const [maintenanceCosts, setMaintenanceCosts] = useState(1.5);
  const [downPayment, setDownPayment] = useState(20);
  const [mortgageRate, setMortgageRate] = useState(5.57);
  const [stockMarketReturn, setStockMarketReturn] = useState(6.82);
  const [realEstatePriceReturn, setRealEstatePriceReturn] = useState(1.61);

  const calculateFairPrice = (
    rent,
    propertyTax,
    maintenanceCosts,
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
      capitalCost + propertyTax / 100 + maintenanceCosts / 100;
    const fairPrice = yearlyRent / costOfOwning;
    return fairPrice;
  };

  const calculateFairRent = (
    price,
    propertyTax,
    maintenanceCosts,
    downPayment,
    mortgageRate,
    stockMarketReturn,
    realEstatePriceReturn
  ) => {
    const opportunityCostOfDownPayment =
      (stockMarketReturn - realEstatePriceReturn) / 100;
    const capitalCost =
      (opportunityCostOfDownPayment * downPayment) / 100 +
      (mortgageRate / 100) * (1 - downPayment / 100);
    const costOfOwning =
      capitalCost + propertyTax / 100 + maintenanceCosts / 100;
    const fairRent = (price * costOfOwning) / 12;
    return fairRent;
  };
  return (
    <main>
      <p>
        Start with{" "}
        <button
          onClick={() => {
            setIsRentSelected(true);
          }}
          className="btn btn-primary"
          title="Select this option if you know the monthly rent of the property. You can also estimate the amount of rent by properties with similar conditions."
        >
          Monthly Rent
        </button>{" "}
        or{" "}
        <button
          onClick={() => {
            setIsRentSelected(false);
          }}
          className="btn btn-primary"
          title="Select this option if you know the property price. You can also estimate the price by similar units nearby."
        >
          Property Price
        </button>
      </p>
      <form>
        {isRentSelected ? (
          <div className="form-group">
            <label
              htmlFor="rent"
              title="Monthly rent cost refers to the amount of money paid by a tenant to the landlord on a monthly basis for the use of a property."
            >
              Monthly rent <i className="bi bi-question-circle"></i>
            </label>
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
                required
              />
              <div className="input-group-append">
                <span className="input-group-text">.00</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label
              htmlFor="price"
              title="Property price refers to the monetary value of a real estate property. It is the amount that a buyer is willing to pay for a property, or the amount that a seller is asking for the property."
            >
              Property price <i className="bi bi-question-circle"></i>
            </label>
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
                required="required"
              />
              <div className="input-group-append">
                <span className="input-group-text">.00</span>
              </div>
            </div>
          </div>
        )}
        <div className="form-group">
          <label
            htmlFor="propertyTax"
            title="Property tax is a tax imposed by the government on real estate property and is typically based on the value of the property."
          >
            Property tax <i className="bi bi-question-circle"></i>
          </label>
          <div id="propertyTaxHelp" className="form-text">
            Enter the property tax rate for the area where the property is
            located. Tax rates can vary depending on the jurisdiction.
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
              required="required"
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label
            htmlFor="maintenanceCosts"
            title="Maintenance costs of a real estate property refers to the expenses incurred in keeping the property in good condition, such as condo fees, renovation, home insurance, among others."
          >
            Maintenance costs <i className="bi bi-question-circle"></i>
          </label>
          <div id=" maintenanceCostsHelp" className="form-text">
            As a rough estimate, you can use 1% of the property value for homes
            worth over $500,000, or 1.5% for homes worth less.
          </div>
          <div className="input-group mb-3">
            <input
              id=" maintenanceCosts"
              type="number"
              min="0"
              className="form-control"
              onChange={(event) => setMaintenanceCosts(event.target.value)}
              value={maintenanceCosts}
              placeholder="Enter maintenance cost as a percentage of property price"
              aria-label="Enter maintenance cost as a percentage of property price"
              required="required"
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label
            htmlFor="downPayment"
            title="Down payment is money you pay right away when you buy a home. The rest of the cost is paid later with monthly mortgage payments."
          >
            Down payment <i className="bi bi-question-circle"></i>
          </label>
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
              required="required"
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label
            htmlFor="mortgageRate"
            title="Mortgage rate is the interest rate charged on a mortgage loan, which is a type of loan used to finance the purchase of a property."
          >
            Mortgage rate <i className="bi bi-question-circle"></i>
          </label>
          <div id="mortgageRateHelp" className="form-text">
            As a suggestion, enter the annual percentage rate (APR) for a 5-year
            fixed mortgage rate.
          </div>
          <div className="input-group mb-3">
            <input
              id="mortgageRate"
              type="number"
              className="form-control"
              onChange={(event) => setMortgageRate(event.target.value)}
              value={mortgageRate}
              placeholder="Enter the mortgage rate in percentage"
              aria-label="Enter the mortgage rate in percentage"
              required="required"
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label
            htmlFor="stockMarketReturn"
            title="The stock market return is the rate of profit or loss on investments in the stock market. Investing your down payment in stocks can be an option."
          >
            Stock market return <i className="bi bi-question-circle"></i>
          </label>
          <div id="stockMarketReturnRateHelp" className="form-text">
            The long-term real return on stocks from 1870-2015 is 6.82%.
          </div>
          <div className="input-group mb-3">
            <input
              id="stockMarketReturn"
              type="number"
              className="form-control"
              onChange={(event) => setStockMarketReturn(event.target.value)}
              value={stockMarketReturn}
              placeholder="Enter the return rate of stock market"
              aria-label="Enter the return rate of stock market"
              required="required"
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label
            htmlFor="realEstatePriceReturn"
            title="The home price growth rate is how much the value of a home increases over time. It's usually shown as a percentage."
          >
            Home price growth rate <i className="bi bi-question-circle"></i>
          </label>
          <div id="realEstatePriceReturnHelp" className="form-text">
            The long-term real capital return on real estate investments from
            1870-2015 is 1.61%.
          </div>
          <div className="input-group mb-3">
            <input
              id="realEstatePriceReturn"
              type="number"
              className="form-control"
              onChange={(event) => setRealEstatePriceReturn(event.target.value)}
              value={realEstatePriceReturn}
              placeholder="Enter real estate price return"
              aria-label="Enter real estate price return"
              required="required"
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label
            htmlFor="opportunityCosts"
            title="The opportunity cost of the down payment not being invested in similarly risky assets such as stocks."
          >
            Opportunity costs of buying{" "}
            <i className="bi bi-question-circle"></i>
          </label>
          <div id="opportunityCosts" className="form-text">
            Automatically calculated.
          </div>
          <div className="input-group mb-3">
            <input
              id="opportunityCosts"
              type="number"
              className="form-control"
              value={(stockMarketReturn - realEstatePriceReturn).toFixed(2)}
              placeholder="Enter real estate price return"
              aria-label="Enter real estate price return"
              required="required"
              disabled
            />
            <div className="input-group-append">
              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>
      </form>
      <div id="result">
        <h2>Result</h2>
        {isRentSelected ? (
          <p>
            If you can purchase a similar property for less than{" "}
            <strong>
              $
              {Math.round(
                calculateFairPrice(
                  rent,
                  propertyTax,
                  maintenanceCosts,
                  downPayment,
                  mortgageRate,
                  stockMarketReturn,
                  realEstatePriceReturn
                )
              )}
            </strong>
            , then owning is better.
          </p>
        ) : (
          <p>
            If you can rent a similar property for less than $
            <strong>
              {Math.round(
                calculateFairRent(
                  price,
                  propertyTax,
                  maintenanceCosts,
                  downPayment,
                  mortgageRate,
                  stockMarketReturn,
                  realEstatePriceReturn
                )
              )}
            </strong>{" "}
            per month, then renting is better.
          </p>
        )}
      </div>
      <div id="Method">
        <h2>Methodology</h2>
        <p>
          This calculator is based on the{" "}
          <a
            href="https://www.pwlcapital.com/rent-or-own-your-home-5-rule/"
            title="Learn more about the Five Percent Rule by Ben Felix"
            target="_blank"
            rel="noreferrer"
          >
            Five Percent Rule by Ben Felix
          </a>
          . Although the results may not always be 5%. When people decide to
          rent or buy a home, they often only compare the monthly mortgage
          payment with the monthly rent. This is not a complete picture because
          because mortgage payments contribute to the value of the property and
          the down payment has an opportunity cost as it could have been
          invested in stocks.
        </p>
        <p>
          It's important to know that the Five Percent Rule has its limits.
          Taking a mortgage means borrowing money to invest and can lead to
          long-term returns as long as the mortgage interest rate is lower than
          the return from real estate investments. The calculator also doesn't
          include the fees for buying and selling the home. So, it may
          incorrectly state that renting is better even if you plan to stay for
          more than 10 years.
        </p>
        <p>
          However, if you're not planning a long stay, this calculator makes it
          easy to compare renting vs buying. You don't have to enter complicated
          financial assumptions. For a more accurate comparison considering
          investment length, the cash flow method is more accurate. You can find
          a helpful spreadsheet{" "}
          <a
            href="http://www.holypotato.net/?p=1073"
            title="A rent vs buy spreadsheet based on cash flow method"
            target="_blank"
            rel="noreferrer"
          >
            here
          </a>
          .
        </p>
      </div>
    </main>
  );
};

export default Main;
