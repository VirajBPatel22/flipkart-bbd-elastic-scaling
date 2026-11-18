function getHealth(req, res) {
  res.json({
    status: 'ok',
    service: 'monitoring-api',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };
