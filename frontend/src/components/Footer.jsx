import { DASHBOARD_URL } from '../services/config';

function Footer() {
  return (
    <footer className="site-footer">
      <p>
        Educational cloud-computing proof of concept built for IT457 (Flipkart
        Big Billion Days — Elastic Scaling). Not affiliated with Flipkart.
        All products shown are fictional demo data.
      </p>
      <p>
        <a href={DASHBOARD_URL} target="_blank" rel="noreferrer">
          View monitoring dashboard ↗
        </a>
      </p>
    </footer>
  );
}

export default Footer;
