import { useApiHealth } from '../hooks/useApiHealth';

const LABELS = {
  checking: 'Checking backend…',
  online: 'Backend online',
  offline: 'Backend unavailable',
};








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
