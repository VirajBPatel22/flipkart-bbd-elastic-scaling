const ICONS = {
  overview: (
    <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z" />
  ),
  instances: (
    <path d="M4 5h16v4H4V5Zm0 6h16v4H4v-4Zm0 6h16v4H4v-4Zm2-10.5h2m-2 6h2m-2 6h2" />
  ),
  metrics: (
    <path d="M4 20V10m6 10V4m6 16v-7m6 7V8" />
  ),
  'load-tests': (
    <path d="M9 3h6v4l4 9.5A2 2 0 0 1 17.2 19H6.8a2 2 0 0 1-1.8-2.5L9 7V3Zm-1 7h8" />
  ),
  results: (
    <path d="M6 3h9l3 3v15H6V3Zm3 9h6m-6 4h6m-6-8h2" />
  ),
};

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'instances', label: 'Instances' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'load-tests', label: 'Load Tests' },
  { id: 'results', label: 'Results' },
];

export default function Sidebar({ active, onSelect, open, onClose }) {
  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />}
      <nav className={`sidebar${open ? ' sidebar-open' : ''}`} aria-label="Dashboard sections">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">BBD</span>
          <span className="sidebar-brand-text">Elastic Scaling</span>
        </div>
        <ul>
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                className={section.id === active ? 'sidebar-link active' : 'sidebar-link'}
                onClick={() => {
                  onSelect(section.id);
                  onClose?.();
                }}
                aria-current={section.id === active ? 'page' : undefined}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {ICONS[section.id]}
                </svg>
                {section.label}
              </button>
            </li>
          ))}
        </ul>
        <a className="sidebar-storefront" href="/">Storefront ↗</a>
      </nav>
    </>
  );
}
