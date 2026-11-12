// Bounded rolling window; excludes health and collector probes. No request bodies/tokens.
const samples = [];
let requests = 0;
function middleware(req, res, next) {
  if (req.path === '/api/health' || req.path === '/internal/metrics') return next();
  const start = performance.now();
  res.on('finish', () => {
    requests++;
    samples.push({ at: Date.now(), ms: performance.now() - start, error: res.statusCode >= 400 });
    if (samples.length > 10000) samples.shift();
  });
  next();
}
function snapshot() {
  const now = Date.now();
  while (samples.length && samples[0].at < now - 60000) samples.shift();
  return { requests, uptimeSeconds: process.uptime(), samples };
}
module.exports = { middleware, snapshot };
