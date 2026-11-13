/**
 * Simple reusable banner used to communicate project/build status.
 * This is intentionally minimal during the initial setup phase.
 */
function StatusBanner({ title, message }) {
  return (
    <div className="card">
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  );
}

export default StatusBanner;
