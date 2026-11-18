import Chart from '../../components/Chart';
import PanelNotice from '../../components/PanelNotice';

const CHARTS = [
  { title: 'CPU %', keys: ['cpu'], labels: { cpu: 'CPU %' } },
  { title: 'Memory MiB', keys: ['memoryMiB'], labels: { memoryMiB: 'Memory MiB' } },
  { title: 'Requests / second', keys: ['requestRate'], labels: { requestRate: 'req/s' } },
  { title: 'Latency ms', keys: ['averageMs', 'p95Ms'], labels: { averageMs: 'Average ms', p95Ms: 'p95 ms' } },
  { title: 'HTTP errors %', keys: ['errorPercent'], labels: { errorPercent: 'Error %' } },
  { title: 'Replica count', keys: ['replicaCount'], labels: { replicaCount: 'Replicas' } },
];

export default function MetricsSection({
  data,
  overview: o,
  history,
  refresh,
  onRefreshChange,
  windowMinutes,
  onWindowChange,
  paused,
  onTogglePaused,
  onRetry,
}) {
  const filtered = history.filter((r) => Number.isFinite(r.elapsedSeconds) && Date.parse(r.timestamp) >= Date.now() - windowMinutes * 60000);

  return (
    <div className="section">
      <h2>Live metrics</h2>
      <div className="controls">
        <label>
          Refresh
          <select value={refresh} onChange={(e) => onRefreshChange(Number(e.target.value))}>
            {[4000, 10000, 30000].map((v) => <option key={v} value={v}>{v / 1000} seconds</option>)}
          </select>
        </label>
        <label>
          Time range
          <select value={windowMinutes} onChange={(e) => onWindowChange(Number(e.target.value))}>
            {[5, 15, 30, 60].map((v) => <option key={v} value={v}>{v} minutes</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-secondary" onClick={onTogglePaused}>{paused ? 'Resume updates' : 'Pause metrics'}</button>
        <span className="status-text">{paused ? 'Paused' : 'Live measurements'}</span>
      </div>
      <p>
        {o.environment === 'AWS'
          ? 'CloudWatch 60-second backend target-group metrics. CPU/memory and request metrics may have different publication times. Errors count target HTTP 4xx/5xx; gateway failures are separate.'
          : 'Rolling 60 seconds, capped at 10,000 samples per replica; latency and errors unavailable when idle.'}
        {' '}Chart timestamps use Indian Standard Time (IST). History resets on monitoring restart.
      </p>

      <PanelNotice panel="history" data={data} onRetry={() => onRetry(['history'])} />
      <div className="charts">
        {CHARTS.map(({ title, keys, labels }) => (
          <Chart key={title} title={title} rows={filtered} xKey="elapsedSeconds" yKeys={keys} labels={labels} />
        ))}
      </div>
    </div>
  );
}
