import { ist } from '../utils/format';

export default function Header({
  environment,
  environmentSource,
  lastRefreshAt,
  refreshing,
  refreshError,
  onFetchLatest,
  onStartTest,
  onOpenMenu,
}) {
  const envLabel = environment === 'AWS' ? 'AWS' : environment === 'LOCAL_DOCKER' ? 'Local Docker' : 'Connecting…';
  const envVerified = environment === 'AWS' || environment === 'LOCAL_DOCKER';

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-left">
        <button type="button" className="menu-toggle" onClick={onOpenMenu} aria-label="Open navigation menu">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div>
          <h1>Flipkart BBD Monitoring Dashboard</h1>
          <p className="dashboard-subtitle">Elastic Scaling Demo</p>
        </div>
      </div>
      <div className="dashboard-header-right">
        <span className={`env-badge${envVerified ? ' env-badge-verified' : ''}`} title={environmentSource || ''}>
          <i aria-hidden="true" />
          {envLabel}
        </span>
        <button type="button" className="btn btn-secondary" onClick={onFetchLatest} disabled={refreshing}>
          {refreshing ? 'Fetching…' : 'Fetch Latest Metrics'}
        </button>
        <button type="button" className="btn btn-primary" onClick={onStartTest}>
          Start Test Now
        </button>
      </div>
      <div className="dashboard-header-status">
        {refreshError
          ? <span className="status-text status-text-warning" role="alert">{refreshError}</span>
          : <span className="status-text">Last refreshed: {lastRefreshAt ? ist(lastRefreshAt) : 'Not yet refreshed'}</span>}
      </div>
    </header>
  );
}
