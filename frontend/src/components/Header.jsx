import ApiStatus from './ApiStatus';
import { DASHBOARD_URL } from '../services/config';

function Header({ searchTerm, onSearchChange }) {
  return (
    <header className="site-header">
      <div className="site-header__row">
        <a className="brand" href="/" aria-label="Flipkart BBD Elastic Scaling home">
          <span className="brand__mark">FK</span>
          <span className="brand__text">
            <span className="brand__name">Flipkart BBD</span>
            <span className="brand__tagline">Elastic Scaling Demo</span>
          </span>
        </a>

        <div className="search-bar">
          <label className="sr-only" htmlFor="product-search">
            Search demo products
          </label>
          <input
            id="product-search"
            type="search"
            placeholder="Search demo products…"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <nav className="site-nav" aria-label="Project navigation">
          <ApiStatus />
          <a
            className="site-nav__link"
            href={DASHBOARD_URL}
            target="_blank"
            rel="noreferrer"
          >
            Monitoring Dashboard ↗
          </a>
        </nav>
      </div>
    </header>
  );
}

export default Header;
