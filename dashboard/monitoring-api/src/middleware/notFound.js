// Catches requests to unknown routes and forwards a 404 error.
function notFound(req, res, next) {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = notFound;
