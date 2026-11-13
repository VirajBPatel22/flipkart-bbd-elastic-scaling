function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <p className="error-state__title">We couldn't reach the backend API.</p>
      <p className="error-state__message">
        {message || 'An unexpected error occurred while loading products.'}
      </p>
      {onRetry && (
        <button type="button" className="error-state__retry" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorState;
