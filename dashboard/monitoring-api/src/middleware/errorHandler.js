function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  process.stderr.write(`Monitoring API error: ${error.message}\n`);
  return res.status(500).json({
    status: 'error',
    message: 'The monitoring request could not be completed.',
  });
}

module.exports = errorHandler;
