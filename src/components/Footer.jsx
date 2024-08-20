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
            complete picture because mortgage payments and the down payment have
            an opportunity cost, as it could have been invested in similarly
            risky assets, such as stocks.
          </p>
          <p>
            In the previous version of this app, I used the{" "}
            <a
              href="https://www.pwlcapital.com/rent-or-own-your-home-5-rule/"
              title="Learn more about the 5% Rule by Ben Felix"
              target="_blank"
              rel="noreferrer"
              className="link-dark"
            >
              5% Rule by Ben Felix
            </a>
            . However, it didn't consider the fees for buying and selling a home
            nor taxes on investment gains. There was also an inaccuracy in
            calculating capital cost — as mortgage was paid, owner no longer
            benefited from the leveraging effect. How many years the owner
            "hold" the property, matters.
          </p>
          <p>
            In the latest version, therefore, the cashflow method is used to
            give a more accurate comparison. It's very similar to Dr. Potato's
            spreadsheet{" "}
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

      <a
        id="profile-link"
        href="https://github.com/low-earth-orbit"
        target="_blank"
        rel="noreferrer"
        title="Connect with the author on Github"
      >
        <img id="github-logo" src={githubLogo} alt="Github logo" />
      </a>
      <p>Copyright © 2023–{currentYear} Leo Hong</p>
    </footer>
  );
};

export default Footer;
