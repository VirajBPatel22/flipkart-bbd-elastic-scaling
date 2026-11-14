function notFound(req, res) {
  res.status(404).json({
    status: 'error',
    message: 'Route not found.',
  });
}

module.exports = notFound;
