export default function Result({ userInput }) {
  const calculateFairRent = ({
    price,
    propertyTax,
    maintenanceCost,
    downPayment,
    mortgageRate,
    investmentReturn,
    homePriceChange,
  }) => {
    const costOfOwning = calculateCostOfOwning(
      investmentReturn,
      downPayment,
      mortgageRate,
      propertyTax,
      maintenanceCost,
      homePriceChange
    );
    const fairRent = (price * costOfOwning) / 12;
    return fairRent;
  };

  const calculateFairPrice = ({
    rent,
    propertyTax,
    maintenanceCost,
    downPayment,
    mortgageRate,
    investmentReturn,
    homePriceChange,
  }) => {
    const costOfOwning = calculateCostOfOwning(
      investmentReturn,
      downPayment,
      mortgageRate,
      propertyTax,
      maintenanceCost,
      homePriceChange
    );
    const rentPerYear = rent * 12;
    const fairPrice = rentPerYear / costOfOwning;
    return fairPrice;
  };

  const calculateCostOfOwning = (
    opportunityCostOfDownPayment,
    downPayment,
    mortgageRate,
    propertyTax,
    maintenanceCost,
    homePriceChange
  ) => {
    const investmentReturn =
      (opportunityCostOfDownPayment / 100) * (downPayment / 100) +
      (mortgageRate / 100) * (1 - downPayment / 100) -
      homePriceChange / 100;
    const costOfOwning =
      investmentReturn + propertyTax / 100 + maintenanceCost / 100;
    return costOfOwning;
  };

  return (
    <>
      <div id="result">
        {userInput.isRentSelected ? (
          <p>
            If you can purchase a similar property for less than{" "}
            <strong>
              $
              {calculateFairPrice(userInput).toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}
            </strong>
            , then owning is likely better.
          </p>
        ) : (
          <p>
            If you can rent a similar property for less than{" "}
            <strong>
              $
              {calculateFairRent(userInput).toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}
            </strong>{" "}
            per month, then renting is likely better.
          </p>
        )}
      </div>
      <div id="method">
        <small>
          <p>
            When people decide to rent or buy a home, they often only compare
            mortgage payment with rent. This is useful but does not represent a
            complete picture because mortgage payments and the down payment have
            an opportunity cost as it could have been invested in similarly
            risky assets, such as stocks.
          </p>
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
            , although different base assumptions are made so the sum may not be
            5%. As you may see, the break-even point is senstive to these
            assumptions made.
          </p>
          <p>
            The calculator doesn't consider the fees for buying and selling a
            home nor taxes on investment gains. If you plan to stay in the
            property for only a few years before selling it, buying a home may
            not be a good financial decision.
          </p>
          <p>
            Overall, this calculator makes it easy to compare renting vs buying
            as you don't have to enter complicated financial assumptions. For a
            more accurate comparison considering investment length, the cash
            flow method is preferred. You can find a helpful spreadsheet{" "}
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
    </>
  );
}
