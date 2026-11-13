import { useApiHealth } from '../hooks/useApiHealth';

const LABELS = {
  checking: 'Checking backend…',
  online: 'Backend online',
  offline: 'Backend unavailable',
};

/**
 * Small reusable connectivity indicator backed by GET /api/health.
 *
 * NOTE: This only proves the Node.js API process is responding. It does
 * NOT prove the Supabase/database connection works — that is a separate
 * concern checked by the product list itself (GET /api/products).
 */
function ApiStatus() {
  const status = useApiHealth();

  return (
    <span
      className={`api-status api-status--${status}`}
      title="Live status of GET /api/health (not a database health check)"
    >
      <span className="api-status__dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}

export default ApiStatus;
