import githubLogo from "../assets/github-mark.svg";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="container" id="footer">
      <div id="method">
        <small>
          <p>
            When people decide to rent or buy a home, they often compare the
            mortgage payment with rent. This is useful but does not represent a
            complete picture, because: (a) unlike rent payments, capital
            investment in a home is partially recoverable upon selling the
            house; and (b) the down payment and subsequent mortgage payments
            have opportunity costs, as they could have been invested in
            similarly risky assets, such as stocks. The opportunity cost for a
            mortgage may be less or greater than the APR of the mortgage. Many
            people understand the first point but not the second one. Indeed, it
            is more complicated than comparing monthly rent vs. mortgage
            payment. This Rent vs Buy calculator helps with this.
          </p>
          <p>
            In the previous version of this app, I used the{" "}
            <a
              target="_blank"
              href="https://www.pwlcapital.com/rent-or-own-your-home-5-rule/"
              rel="noreferrer"
            >
              5% Rule by Ben Felix
            </a>
            . However, it didn't consider the fees for buying and selling a home
            nor taxes on investment gains. There was also an inaccuracy in
            calculating the capital cost — as the mortgage was paid, the owner
            no longer benefited from the leveraging effect. How many years the
            owner "holds" the property, matters. In the latest version,
            therefore, the cash-flow method, similar to{" "}
            <a
              target="_blank"
              href="http://www.holypotato.net/?p=1235"
              rel="noreferrer"
            >
              This One By Dr. Potato
            </a>{" "}
            (my implementation slightly differs), is used to give a more
            accurate comparison.
          </p>
          <p>
            {`Disclaimer: This tool is provided as-is. It's not financial advice.`.toUpperCase()}
          </p>
        </small>
      </div>

      <a
        id="profile-link"
        href="https://github.com/low-earth-orbit/rent-vs-buy"
        target="_blank"
        rel="noreferrer"
        title="This app's Github repo"
      >
        <img id="github-logo" src={githubLogo} alt="Github logo" />
      </a>
      <p>Copyright © 2023–{currentYear} Leo Hong</p>
    </footer>
  );
};

export default Footer;
