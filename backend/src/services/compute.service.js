const path = require('path');
const { Worker } = require('node:worker_threads');
const {
  enableDemoCompute,
  loadTestToken,
  maxConcurrentComputeJobs,
} = require('../config/env');
const { resolveInstanceId } = require('./instance.service');

const MIN_ITERATIONS = 10000;
const DEFAULT_ITERATIONS = 100000;
const MAX_ITERATIONS = 5000000;
const JOB_TIMEOUT_MS = 5000;

let activeJobs = 0;

function parseWorkload(body = {}) {
  // Accept either explicit "iterations" or a normalized "workload" scale (1-100)
  if (body.workload !== undefined) {
    const rawWorkload = Number(body.workload);
    if (!Number.isInteger(rawWorkload) || rawWorkload < 1 || rawWorkload > 100) {
      const err = new Error('Invalid "workload" parameter. Expected an integer between 1 and 100.');
      err.statusCode = 400;
      throw err;
    }
    return rawWorkload * 50000;
  }

  if (body.iterations !== undefined) {
    const rawIterations = Number(body.iterations);
    if (
      !Number.isInteger(rawIterations) ||
      rawIterations < MIN_ITERATIONS ||
      rawIterations > MAX_ITERATIONS
    ) {
      const err = new Error(
        `Invalid "iterations" parameter. Expected an integer between ${MIN_ITERATIONS} and ${MAX_ITERATIONS}.`,
      );
      err.statusCode = 400;
      throw err;
    }
    return rawIterations;
  }

  return DEFAULT_ITERATIONS;
}

function verifyToken(req) {
  if (!enableDemoCompute) {
    const err = new Error('Demo compute endpoint is currently disabled.');
    err.statusCode = 403;
    throw err;
  }

  const customHeader = req.headers['x-load-test-token'];
  const authHeader = req.headers.authorization;
  let providedToken = null;

  if (customHeader) {
    providedToken = String(customHeader).trim();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    providedToken = authHeader.slice(7).trim();
  }

  if (!providedToken || providedToken !== loadTestToken) {
    const err = new Error('Unauthorized: missing or invalid load-test token.');
    err.statusCode = 401;
    throw err;
  }
}

function runWorkerTask(iterations) {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, '../workers/computeWorker.js');
    const worker = new Worker(workerPath, { workerData: { iterations } });

    let isCompleted = false;

    const timeoutId = setTimeout(async () => {
      if (!isCompleted) {
        isCompleted = true;
        await worker.terminate();
        const err = new Error('Compute workload timed out before completion.');
        err.statusCode = 504;
        reject(err);
      }
    }, JOB_TIMEOUT_MS);

    worker.on('message', (result) => {
      if (!isCompleted) {
        isCompleted = true;
        clearTimeout(timeoutId);
        resolve(result);
      }
    });

    worker.on('error', (err) => {
      if (!isCompleted) {
        isCompleted = true;
        clearTimeout(timeoutId);
        reject(err);
      }
    });

    worker.on('exit', (code) => {
      if (!isCompleted && code !== 0) {
        isCompleted = true;
        clearTimeout(timeoutId);
        const err = new Error(`Worker stopped with non-zero exit code: ${code}`);
        err.statusCode = 500;
        reject(err);
      }
    });
  });
}

async function executeComputeJob(req) {
  verifyToken(req);

  const iterations = parseWorkload(req.body);

  if (activeJobs >= maxConcurrentComputeJobs) {
    const err = new Error(
      `Server compute capacity reached (${activeJobs}/${maxConcurrentComputeJobs} active jobs). Please retry shortly.`,
    );
    err.statusCode = 429;
    throw err;
  }

  activeJobs += 1;
  try {
    const result = await runWorkerTask(iterations);
    const instanceId = await resolveInstanceId();

    return {
      status: 'ok',
      message: 'Compute workload completed successfully',
      workload: {
        iterations: result.iterations,
      },
      durationMs: result.durationMs,
      digestSample: result.digestSample,
      activeJobsSnapshot: activeJobs,
      instanceId,
    };
  } finally {
    activeJobs = Math.max(0, activeJobs - 1);
  }
}

module.exports = {
  executeComputeJob,
  parseWorkload,
  verifyToken,
  MIN_ITERATIONS,
  MAX_ITERATIONS,
  DEFAULT_ITERATIONS,
};
