// Centralized error-handling middleware. Keep this as the last
// middleware registered in app.js so Express routes errors to it.
//
// Only errors that were deliberately thrown by our own code (and therefore
// already set a safe, non-sensitive `statusCode`/`message`) are passed
// through to the client. Anything unexpected (a bug, a raw driver error,
// etc.) is reported as a generic 500 so stack traces and internal details
// never reach the frontend or dashboard.
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);

  const isKnownError = Boolean(err.statusCode);
  const statusCode = err.statusCode || 500;
  const message = isKnownError
    ? err.message || 'Request failed'
    : 'Internal server error';

  res.status(statusCode).json({
    status: 'error',
    message,
  });
}

module.exports = errorHandler;
