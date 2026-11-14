// Returns basic service health information for the monitoring API itself.
// This is separate from the AWS metrics it will later report on.
function getHealth(req, res) {
  res.json({
    status: 'ok',
    service: 'monitoring-api',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };
