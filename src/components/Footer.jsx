import githubLogo from "../assets/github-mark.svg";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="container" id="footer">
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
