import StatCard from '../../components/StatCard';
import Chart from '../../components/Chart';
import PanelNotice from '../../components/PanelNotice';
import { fmt, ist, shortId } from '../../utils/format';

function buildInstanceCpuRows(history) {
  const ids = [...new Set(history.flatMap((r) => (r.instances || []).map((i) => i.id)))];
  const rows = history.map((r) => {
    const row = { timestamp: r.timestamp, elapsedSeconds: r.elapsedSeconds };
    for (const inst of r.instances || []) {
      if (Number.isFinite(inst.cpu)) row[`cpu__${inst.id}`] = inst.cpu;
    }
    return row;
  });
  const yKeys = ids.map((id) => `cpu__${id}`);
  const labels = Object.fromEntries(ids.map((id) => [`cpu__${id}`, shortId(id)]));
  return { rows, yKeys, labels };
}

export default function OverviewSection({ data, overview: o, history, onRetry }) {
  const total = o.instances?.length ?? null;
  const healthy = o.healthyCount ?? null;
  const unhealthy = total != null && healthy != null ? Math.max(0, total - healthy) : null;
  const isAws = o.environment === 'AWS';
  const { rows: cpuRows, yKeys: cpuKeys, labels: cpuLabels } = buildInstanceCpuRows(history);

  return (
    <div className="section">
      <PanelNotice panel="overview" data={data} onRetry={() => onRetry(['overview'])} />
      {o.unavailable && <p role="status" className="warning">{o.unavailable}</p>}

      <div className="metrics">
        <StatCard
          label="Active backend instances"
          value={o.replicaCount != null ? o.replicaCount : 'Awaiting sample'}
          caption={isAws
            ? `Desired ${o.desiredCapacity ?? '—'} · Min ${o.minimumCapacity ?? '—'} · Max ${o.maximumCapacity ?? '—'}`
            : 'Local Docker manual scaling (no ASG bounds apply)'}
        />
        <StatCard
          label="Healthy targets"
          value={healthy != null ? `${healthy} healthy` : 'Awaiting sample'}
          caption={unhealthy != null ? `${unhealthy} unhealthy / unregistered` : 'Unavailable'}
          warning={unhealthy > 0}
        />
        <StatCard
          label={isAws ? 'EC2 average CPU %' : 'Mean CPU % (one core = 100%)'}
          value={fmt(o.cpu, '%')}
          caption={`As of ${ist(o.metricTimestamp || o.timestamp)}`}
        />
        <StatCard
          label={isAws ? 'Memory usage (instance-level, CWAgent)' : 'Memory usage (container-level, Docker)'}
          value={o.memoryPercent != null ? fmt(o.memoryPercent, '%') : fmt(o.memoryBytes == null ? null : o.memoryBytes / 1048576, ' MiB')}
          caption={isAws ? 'Requires the CloudWatch Agent; unavailable otherwise' : 'Mean % of each container memory limit'}
        />
        <StatCard
          label="Requests per second"
          value={fmt(o.requestRate)}
          caption={isAws ? 'ALB RequestCount ÷ 60s window' : 'Completed app requests ÷ up to 60s window'}
        />
        <StatCard
          label="Average latency"
          value={fmt(o.averageMs, ' ms')}
          caption={isAws ? 'ALB target response time (not k6 client latency)' : 'Mean of completed request samples'}
        />
        <StatCard
          label="p95 latency"
          value={fmt(o.p95Ms, ' ms')}
          caption="True p95 statistic; never derived from the average"
        />
        <StatCard
          label="Error rate"
          value={o.errorRate != null ? `${(o.errorRate * 100).toFixed(2)}%` : 'N/A'}
          caption={isAws ? 'Target 4xx+5xx ÷ requests (excludes ALB-generated errors)' : 'Failed ÷ completed samples in window'}
          warning={o.errorRate > 0}
        />
      </div>

      {isAws && (
        <p className="hint-text">
          CloudWatch data minute: {ist(o.metricTimestamp)} · Queries exclude the latest minute to allow publication.
          Missing metrics remain unavailable rather than estimated.
        </p>
      )}

      <PanelNotice panel="history" data={data} onRetry={() => onRetry(['history'])} />
      <div className="charts">
        <Chart
          title="Response Time Over Time"
          subtitle={isAws ? 'Source: ALB TargetResponseTime (CloudWatch)' : 'Source: dashboard collector (live request samples)'}
          rows={history}
          xKey="elapsedSeconds"
          yKeys={['averageMs', 'p95Ms']}
          labels={{ averageMs: 'Average ms', p95Ms: 'p95 ms' }}
          emptyHint="No response-time samples in this window. Run a test or wait for CloudWatch publication."
        />
        <Chart
          title="CPU Usage by Instance"
          subtitle={isAws ? 'Source: CloudWatch CPUUtilization per instance' : 'Source: Docker stats per container'}
          rows={cpuRows}
          xKey="elapsedSeconds"
          yKeys={cpuKeys}
          labels={cpuLabels}
          emptyHint="No per-instance CPU samples yet."
        />
      </div>
    </div>
  );
}
