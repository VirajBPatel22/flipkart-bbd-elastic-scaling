const { parentPort, workerData } = require('node:worker_threads');
const crypto = require('node:crypto');

function executeWorkload(iterations) {
  const startTime = Date.now();
  let currentHash = 'bbd-workload-seed';

  for (let i = 0; i < iterations; i++) {
    currentHash = crypto.createHash('sha256').update(`${currentHash}:${i}`).digest('hex');
  }

  const durationMs = Date.now() - startTime;
  return {
    durationMs,
    iterations,
    digestSample: currentHash.substring(0, 16),
  };
}

const { iterations = 100000 } = workerData || {};
const outcome = executeWorkload(iterations);

if (parentPort) {
  parentPort.postMessage(outcome);
}
