export default function PanelNotice({ panel, data, onRetry }) {
  const error = data?.errors?.[panel];
  if (!error) return null;
  return (
    <p className="warning" role="alert">
      {error}
      {data?.[panel] ? ' Showing the last successful data.' : ' No data has been received yet.'}{' '}
      <button type="button" onClick={onRetry}>Retry this panel</button>
    </p>
  );
}
