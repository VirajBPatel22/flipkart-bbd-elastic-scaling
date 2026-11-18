import { useEffect, useState } from 'react';
import Chart from './Chart';
import { ist, statusLabel, elapsedLabel } from '../utils/format';

export default function RunningTestPanel({ job, onStop }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (job?.status !== 'running') return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [job?.status]);

  if (!job || !job.id) {
    return (
      <section className="card">
        <h3>Running test</h3>
        <p>No test has been started in this session. Use &ldquo;Start Test Now&rdquo; to begin a bounded test.</p>
      </section>
    );
  }

  const isCpu = job.type === 'cpu';
  const elapsedSeconds = job.startedAt && Number.isFinite(Date.parse(job.startedAt))
    ? (now - Date.parse(job.startedAt)) / 1000
    : null;
  const progress = !isCpu && job.duration && elapsedSeconds != null
    ? Math.min(100, (elapsedSeconds / job.duration) * 100)
    : null;

  return (
    <section className="card running-test-card">
      <header className="chart-card-header">
        <h3>{job.name || (isCpu ? 'CPU scaling observation' : 'API probe test')}</h3>
        <span className={`run-status run-status-${job.status}`}>{statusLabel(job.status)}</span>
      </header>
      <dl className="summary-list">
        <dt>Run ID</dt><dd>{job.id}</dd>
        <dt>Scenario</dt><dd>{isCpu ? 'CPU scaling observation (SSM bounded load)' : 'API probe (read-only)'}</dd>
        <dt>Started</dt><dd>{ist(job.startedAt)}</dd>
        <dt>Elapsed</dt><dd>{elapsedLabel(job.startedAt, now)}</dd>
        <><dt>Configured duration</dt><dd>{job.duration ? `${isCpu ? Math.round(job.duration / 60) + ' min' : job.duration + 's'}` : 'Unavailable'}</dd></>
        <><dt>{isCpu ? 'ALB probe rate' : 'Configured rate'}</dt><dd>{job.rate ? `${job.rate} req/s` : 'Unavailable'}</dd></>
        <><dt>Completed requests</dt><dd>{job.completed ?? 0}{isCpu ? ` (${job.success ?? 0} ok, ${job.failed ?? 0} failed)` : ''}</dd></>
        {!isCpu && (
          <>
            <dt>Failure rate</dt>
            <dd>{job.completed ? `${((job.failed / job.completed) * 100).toFixed(1)}%` : 'Unavailable'}</dd>
          </>
        )}
        {isCpu && <><dt>Phase</dt><dd>{job.phase}</dd></>}
      </dl>
      {progress != null && (
        <div className="progress-track" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
      {job.saveError && <p className="form-error" role="alert">{job.saveError}</p>}
      {job.samples?.length > 0 && (
        <Chart
          title={isCpu ? 'CPU during observation (%)' : 'Response time during this test (ms)'}
          rows={job.samples.map((r, i) => ({ ...r, request: i + 1 }))}
          xKey="request"
          yKeys={isCpu ? ['cpu'] : ['latency']}
          labels={isCpu ? { cpu: 'CPU %' } : { latency: 'Latency ms' }}
        />
      )}
      {isCpu && job.probeSamples?.length > 0 && (
        <Chart
          title="ALB probe response time (ms)"
          rows={job.probeSamples.map((r, i) => ({ ...r, request: i + 1 }))}
          xKey="request"
          yKeys={['latency']}
          labels={{ latency: 'Latency ms' }}
        />
      )}
      {job.status === 'running' && (
        <button type="button" className="btn btn-secondary" onClick={onStop}>Stop Test</button>
      )}
    </section>
  );
}
