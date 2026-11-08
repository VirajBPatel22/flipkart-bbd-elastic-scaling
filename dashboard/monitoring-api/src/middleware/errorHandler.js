// Centralized error-handling middleware. Keep this as the last
// middleware registered in app.js so Express routes errors to it.
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
