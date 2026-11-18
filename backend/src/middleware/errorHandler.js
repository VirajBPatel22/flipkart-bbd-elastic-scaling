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
