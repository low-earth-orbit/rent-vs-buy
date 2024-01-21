import githubLogo from "../../images/github-mark.svg";

const Footer = () => {
  return (
    <footer className="container" id="footer">
      <a
        id="profile-link"
        href="https://github.com/low-earth-orbit"
        target="_blank"
        rel="noreferrer"
        title="Connect with me on Github"
      >
        <img id="github-logo" src={githubLogo} alt="Github logo" />
      </a>
      <p>Copyright © 2023 Leo Hong</p>
    </footer>
  );
};

export default Footer;
