const unavailableOverview = Object.freeze({
  environment: process.env.ENVIRONMENT || 'LOCAL_DOCKER',
  source: 'unavailable',
  unavailable: 'No metrics provider is configured yet.',
  sampledAt: null,
  desiredCapacity: null,
  inServiceReplicas: null,
  healthyReplicas: null,
  cpuPercent: null,
  memoryMiB: null,
  memoryPercent: null,
  requestRate: null,
  averageLatencyMs: null,
  p95LatencyMs: null,
  httpErrorPercent: null,
});

async function getOverview() {
  return { ...unavailableOverview };
}

async function getHistory() {
  return [];
}

async function getEvents() {
  return [];
}

async function getExperiments() {
  return [];
}

module.exports = {
  getOverview,
  getHistory,
  getEvents,
  getExperiments,
};
