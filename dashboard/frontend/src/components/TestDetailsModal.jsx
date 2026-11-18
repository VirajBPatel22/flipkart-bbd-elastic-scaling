import { useEffect, useState } from 'react';
import { getExperiment, getExperimentFiles, experimentDetailsUrl, experimentCsvUrl, experimentFileUrl } from '../services/monitoringApiClient';
import { fmt, ist } from '../utils/format';

export default function TestDetailsModal({ runId, onClose }) {
  const [run, setRun] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!runId) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([getExperiment(runId), getExperimentFiles(runId).catch(() => [])])
      .then(([runData, fileData]) => {
        if (!active) return;
        setRun(runData);
        setFiles(fileData);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [runId]);

  if (!runId) return null;

  const startedAt = run && Number.isFinite(run.durationSeconds) && Number.isFinite(Date.parse(run.timestamp))
    ? new Date(Date.parse(run.timestamp) - run.durationSeconds * 1000).toISOString()
    : null;

  return (
    <div className="modal-scrim" role="presentation" onClick={onClose}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="details-title" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2 id="details-title">{run?.testName || run?.id || 'Test details'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="modal-body">
          {loading && <p>Loading run details…</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {run && (
            <>
              <h3>Test summary</h3>
              <dl className="summary-list">
                <dt>Test name</dt><dd>{run.testName || 'Unnamed run'}</dd>
                <dt>Run ID</dt><dd>{run.id}</dd>
                <dt>Scenario</dt><dd>{run.scenario || 'Unknown'}</dd>
                <dt>Start time</dt><dd>{startedAt ? ist(startedAt) : 'Unavailable'}</dd>
                <dt>End time</dt><dd>{ist(run.timestamp)}</dd>
                <dt>Duration</dt><dd>{fmt(run.durationSeconds, 's')}</dd>
                <dt>Environment</dt><dd>{run.environment || 'Unknown'}</dd>
                <dt>Configured workload</dt>
                <dd>{run.rate ?? 'Unknown'} req/s{run.iterations != null ? `, ${run.iterations} iterations` : ''}</dd>
                <dt>Backend instance count</dt><dd>{run.replicas ?? 'Dynamic / unknown'}</dd>
                <dt>Final status</dt>
                <dd>{run.thresholdsPassed === false ? 'Failed thresholds' : run.thresholdsPassed === true ? 'Passed' : 'Unknown'}</dd>
              </dl>

              <h3>Performance metrics</h3>
              <dl className="summary-list">
                <dt>Total requests</dt><dd>{run.totalRequests ?? 'Unavailable'}</dd>
                <dt>Successful requests</dt><dd>{run.successfulRequests ?? 'Unavailable'}</dd>
                <dt>Failed requests</dt><dd>{run.failedRequests ?? 'Unavailable'}</dd>
                <dt>Average latency</dt><dd>{fmt(run.averageMs, ' ms')}</dd>
                <dt>Median latency (p50)</dt><dd>{fmt(run.p50Ms, ' ms')}</dd>
                <dt>p95 latency</dt><dd>{fmt(run.p95Ms, ' ms')}</dd>
                <dt>Throughput</dt><dd>{fmt(run.throughput, ' req/s')}</dd>
                <dt>Error rate</dt><dd>{run.failureRate != null ? `${(run.failureRate * 100).toFixed(1)}%` : 'Unavailable'}</dd>
                <dt>Dropped iterations</dt><dd>{run.droppedIterations ?? 'Not collected'}</dd>
              </dl>

              <h3>Infrastructure observations</h3>
              <dl className="summary-list">
                <dt>CPU utilization</dt><dd>{fmt(run.cpu, '%')}</dd>
                <dt>Memory</dt><dd>{run.memoryBytes != null ? fmt(run.memoryBytes / 1048576, ' MiB') : 'Unavailable'}</dd>
              </dl>
              {run.cpu == null && (
                <p className="chart-empty">
                  CPU/memory were not aligned with this run and are shown as unavailable rather than estimated.
                </p>
              )}
              {run.limitations && <p className="chart-subtitle">{run.limitations}</p>}

              <h3>Raw evidence</h3>
              {files.length === 0 && <p>No raw evidence files are available on this host for this run.</p>}
              {files.length > 0 && (
                <ul className="evidence-list">
                  {files.map((f) => (
                    <li key={f.name}>
                      <a href={experimentFileUrl(run.id, f.name)} target="_blank" rel="noreferrer">{f.name}</a>
                    </li>
                  ))}
                </ul>
              )}

              <h3>Export</h3>
              <div className="controls">
                <a className="btn btn-secondary" href={experimentDetailsUrl(run.id)} target="_blank" rel="noreferrer">Download JSON</a>
                <a className="btn btn-secondary" href={experimentCsvUrl(run.id)}>Download CSV</a>
              </div>
            </>
          )}
        </div>
        <footer className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}
