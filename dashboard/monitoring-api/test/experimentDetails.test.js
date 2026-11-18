const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const express=require('express');

async function withApp(dir, fn) {
  process.env.RESULTS_DIR = dir;
  process.env.UI_RESULTS_DIR = dir;
  delete require.cache[require.resolve('../src/monitoring')];
  delete require.cache[require.resolve('../src/uiTests')];
  const { install } = require('../src/monitoring');
  const app = express();
  app.use(express.json());
  install(app);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.on('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
}

test('a saved run can be fetched, exported and its evidence listed and downloaded', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bbd-details-'));
  try {
    const id = '20260101T000000Z-fixture-compute-1';
    const row = { id, testName: 'Baseline Test', environment: 'LOCAL_DOCKER', timestamp: '2026-01-01T00:00:10Z', scenario: 'compute', replicas: 1, rate: 1, totalRequests: 24, successfulRequests: 24, failedRequests: 0, throughput: 1, averageMs: 100, p95Ms: 150, failureRate: 0, valid: true };
    await fs.writeFile(path.join(dir, `${id}.summary.json`), JSON.stringify(row));
    await fs.writeFile(path.join(dir, `${id}.log`), 'run log output');
    await fs.writeFile(path.join(dir, `${id}.k6.json`), JSON.stringify({ ok: true }));

    await withApp(dir, async (base) => {
      const detail = await (await fetch(`${base}/api/experiments/${id}`)).json();
      assert.equal(detail.testName, 'Baseline Test');

      const missing = await fetch(`${base}/api/experiments/does-not-exist`);
      assert.equal(missing.status, 404);

      const csv = await fetch(`${base}/api/experiments/${id}/csv`);
      assert.equal(csv.status, 200);
      const csvText = await csv.text();
      assert.ok(csvText.includes('Baseline Test'));
      assert.ok(csvText.includes('testName'));

      const files = await (await fetch(`${base}/api/experiments/${id}/files`)).json();
      const names = files.map(f => f.name).sort();
      assert.deepEqual(names, [`${id}.k6.json`, `${id}.log`, `${id}.summary.json`]);

      const log = await fetch(`${base}/api/experiments/${id}/files/${id}.log`);
      assert.equal(log.status, 200);
      assert.equal(await log.text(), 'run log output');

      const traversal = await fetch(`${base}/api/experiments/${id}/files/..%2F..%2Fetc%2Fpasswd`);
      assert.ok([400, 404].includes(traversal.status), `expected traversal attempt to be rejected, got ${traversal.status}`);
      assert.notEqual(traversal.status, 200);

      const missingOnDisk = await fetch(`${base}/api/experiments/${id}/files/${id}.metrics.jsonl`);
      assert.equal(missingOnDisk.status, 404);

      const disallowedSuffix = await fetch(`${base}/api/experiments/${id}/files/${id}.exe`);
      assert.equal(disallowedSuffix.status, 400);
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
