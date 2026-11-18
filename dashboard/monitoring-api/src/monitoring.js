const fs = require('node:fs/promises');
const path = require('node:path');
const history = [], events = [];
let current = { environment: process.env.ENVIRONMENT || 'LOCAL_DOCKER', unavailable: 'Waiting for collector', instances: [] };
let busy = false;
let awsAdapter;
const pollInterval = process.env.ENVIRONMENT === 'AWS' ? 30000 : 3000;
async function poll() {
  if (busy) return;
  busy = true;
  try {
    if (process.env.ENVIRONMENT === 'AWS') {
      awsAdapter ||= require('./adapters/aws').createAwsAdapter();
      const snapshot = await awsAdapter.snapshot();
      current = snapshot;
      events.splice(0, events.length, ...snapshot.events);
      const instanceSample = (snapshot.instances || []).map(i => ({ id: i.id, cpu: i.cpu, memoryPercent: i.memoryPercent }));
      history.push({ ...snapshot, instances: instanceSample, events: undefined });
      if (history.length > 120) history.shift();
      return;
    }
    const response = await fetch(process.env.COLLECTOR_URL || 'http://localhost:9100/snapshot', { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('Collector unavailable');
    const data = await response.json();
    if (data.unavailable || Date.now()/1000-data.timestamp > 30) throw new Error(data.unavailable || 'Collector data is stale');
    const instances = data.instances;
    const running = instances.filter(i => i.state === 'running');
    const samples = running.flatMap(i => i.samples || []).filter(s => s.at >= Date.now()-60000);
    const durations = samples.map(s => s.ms).sort((a,b)=>a-b);
    const mean = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
    const valid = key => running.map(i=>i[key]).filter(v=>v !== null && v !== undefined);
    const count = running.length;
    if (current.replicaCount !== undefined && count !== current.replicaCount) {
      events.push({ timestamp: new Date().toISOString(), message: `Observed manual/local replica change: ${current.replicaCount} → ${count}` });
      if (events.length > 100) events.shift();
    }
    current = { environment: 'LOCAL_DOCKER', source: data.source, timestamp: new Date(data.timestamp*1000).toISOString(), replicaCount: count,
      healthyCount: running.filter(i=>i.health==='healthy').length, cpu: mean(valid('cpu')), memoryBytes: valid('memoryBytes').reduce((a,b)=>a+b,0), memoryPercent: mean(valid('memoryPercent')),
      requestRate: samples.length / Math.min(60, Math.max(1, ...running.map(i=>i.uptimeSeconds || 1))),
      averageMs: mean(durations), p95Ms: durations.length ? durations[Math.ceil(durations.length*.95)-1] : null,
      errorRate: samples.length ? samples.filter(s=>s.error).length/samples.length : null,
      instances: instances.map(({samples,...item})=>item), windowSeconds: 60, sampleCount: samples.length,
      sampleLimitPerReplica: 10000 };
    const instanceSample = instances.map(i => ({ id: i.id, cpu: i.cpu, memoryPercent: i.memoryPercent }));
    history.push({...current, instances: instanceSample}); if (history.length>120) history.shift();
  } catch (e) {
    current = { environment: process.env.ENVIRONMENT || 'LOCAL_DOCKER', unavailable: e.message, instances: [], timestamp: new Date().toISOString() };
  } finally { busy = false; }
}
async function results() {
  const dir = process.env.RESULTS_DIR || path.resolve(__dirname, '../../../load-tests/results');
  const names = await fs.readdir(dir).catch(()=>[]);
  const runs = await Promise.all(names.filter(n=>n.endsWith('.summary.json')).map(async n=> {
    try { return JSON.parse(await fs.readFile(path.join(dir,n),'utf8')); } catch { return null; }
  }));
  const bundled = require('./data/verified-experiments.json');
  const saved = await fs.readdir(process.env.UI_RESULTS_DIR || '/tmp/it457-ui-results').catch(()=>[]);
  for(const name of saved.filter(n=>n.endsWith('.summary.json'))) {try {runs.push(JSON.parse(await fs.readFile(path.join(process.env.UI_RESULTS_DIR || '/tmp/it457-ui-results',name),'utf8')));}catch{}}
  const merged=[...new Map([...runs,...bundled].map(r=>[r?.id,r])).values()];
  return merged.filter(r => r && r.valid !== false && r.totalRequests > 0).sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp)));
}
const SAFE_RUN_ID = /^[A-Za-z0-9_.-]+$/;
const EVIDENCE_SUFFIXES = ['.summary.json', '.k6.json', '.csv', '.log', '.metrics.jsonl', '.identities.jsonl', '.aws.jsonl', '.activities.json'];
function evidenceDirs() {
  return [process.env.RESULTS_DIR || path.resolve(__dirname, '../../../load-tests/results'), process.env.UI_RESULTS_DIR || '/tmp/it457-ui-results'];
}
async function listEvidence(id) {
  if (!SAFE_RUN_ID.test(id)) return [];
  const found = new Map();
  for (const dir of evidenceDirs()) {
    for (const suffix of EVIDENCE_SUFFIXES) {
      const name = `${id}${suffix}`;
      if (found.has(name)) continue;
      try { await fs.access(path.join(dir, name)); found.set(name, { name, suffix }); } catch { /* not present on this host */ }
    }
  }
  return [...found.values()];
}
const EXPORT_KEYS = ['id','testName','timestamp','environment','scenario','experimentMode','replicas','rate','iterations','configuredDuration','k6ExitCode','thresholdsPassed','durationSeconds','totalRequests','successfulRequests','failedRequests','throughput','averageMs','p50Ms','p95Ms','failureRate','cpu','memoryBytes','droppedIterations','source'];
function install(app) {
  require('./uiTests').install(app,()=>current);
  app.get('/api/overview', (req,res)=>res.json(current));
  app.get('/api/history', (req,res)=>res.json(history));
  app.get('/api/events', (req,res)=>res.json(events));
  app.get('/api/experiments', async (req,res,next)=> { try { res.json(await results()); } catch(e) { next(e); } });
  app.get('/api/experiments.csv', async (req,res,next)=> {
    try { const runs = await results(); const keys=['timestamp','scenario','replicas','rate','iterations','configuredDuration','k6ExitCode','thresholdsPassed','durationSeconds','totalRequests','successfulRequests','failedRequests','throughput','averageMs','p50Ms','p95Ms','failureRate','cpu','memoryBytes','droppedIterations'];
      res.type('text/csv').send([keys.join(','),...runs.map(r=>keys.map(k=>JSON.stringify(r[k] ?? '')).join(','))].join('\n'));
    } catch(e) { next(e); }
  });
  app.get('/api/experiments/:id', async (req,res,next)=> {
    try { const run = (await results()).find(r=>r.id===req.params.id); if (!run) return res.status(404).json({error:'Test run not found'}); res.json(run); } catch(e) { next(e); }
  });
  app.get('/api/experiments/:id/csv', async (req,res,next)=> {
    try { const run = (await results()).find(r=>r.id===req.params.id); if (!run) return res.status(404).json({error:'Test run not found'});
      res.type('text/csv').set('Content-Disposition', `attachment; filename="${run.id}.csv"`).send([EXPORT_KEYS.join(','), EXPORT_KEYS.map(k=>JSON.stringify(run[k] ?? '')).join(',')].join('\n'));
    } catch(e) { next(e); }
  });
  app.get('/api/experiments/:id/files', async (req,res,next)=> {
    try { const run = (await results()).find(r=>r.id===req.params.id); if (!run) return res.status(404).json({error:'Test run not found'}); res.json(await listEvidence(req.params.id)); } catch(e) { next(e); }
  });
  app.get('/api/experiments/:id/files/:filename', async (req,res,next)=> {
    try {
      const { id, filename } = req.params;
      if (!SAFE_RUN_ID.test(id)) return res.status(400).json({error:'Invalid run id'});
      const run = (await results()).find(r=>r.id===id); if (!run) return res.status(404).json({error:'Test run not found'});
      const suffix = EVIDENCE_SUFFIXES.find(s=>filename===`${id}${s}`);
      if (!suffix) return res.status(400).json({error:"File is not part of this run's evidence"});
      for (const dir of evidenceDirs()) {
        try {
          const content = await fs.readFile(path.join(dir, filename));
          res.set('Content-Disposition', `attachment; filename="${filename}"`).type(suffix.endsWith('json') ? 'application/json' : 'text/plain').send(content);
          return;
        } catch { /* try next directory */ }
      }
      res.status(404).json({error:'Evidence file is not available on this host'});
    } catch(e) { next(e); }
  });
  poll(); const timer=setInterval(poll,pollInterval); timer.unref();
}
module.exports = { install, results };
