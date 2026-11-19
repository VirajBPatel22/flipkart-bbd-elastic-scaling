import RunningTestPanel from '../../components/RunningTestPanel';
import Chart from '../../components/Chart';
import StatCard from '../../components/StatCard';
import { fmt, ist, shortId } from '../../utils/format';

function testHistory(history, job) {
  const started = Date.parse(job?.startedAt);
  const finished = Date.parse(job?.finishedAt);
  const validStart = Number.isFinite(started);
  const lower = validStart ? started - 60000 : Date.now() - 30 * 60000;
  const upper = Number.isFinite(finished) ? finished + 6 * 60000 : Date.now();
  const rows = history.filter((row) => {
    const at = Date.parse(row.timestamp);
    return Number.isFinite(at) && at >= lower && at <= upper;
  });
  const origin = validStart ? started : Date.parse(rows[0]?.timestamp);
  return rows.map((row) => ({
    ...row,
    elapsedSeconds: Number.isFinite(origin) ? (Date.parse(row.timestamp) - origin) / 1000 : null,
    errorPercent: row.errorRate == null ? null : row.errorRate * 100,
  }));
}

function instanceCpuRows(rows) {
  const ids = [...new Set(rows.flatMap((row) => (row.instances || []).map((instance) => instance.id)))];
  const chartRows = rows.map((row) => {
    const point = { timestamp: row.timestamp, elapsedSeconds: row.elapsedSeconds };
    for (const instance of row.instances || []) {
      if (Number.isFinite(instance.cpu)) point[`cpu__${instance.id}`] = instance.cpu;
    }
    return point;
  });
  return {
    rows: chartRows,
    keys: ids.map((id) => `cpu__${id}`),
    labels: Object.fromEntries(ids.map((id) => [`cpu__${id}`, shortId(id)])),
  };
}

function probeRows(job) {
  const started = Date.parse(job?.startedAt);
  return (job?.samples || []).map((sample, index) => ({
    ...sample,
    request: index + 1,
    elapsedSeconds: Number.isFinite(started) && Number.isFinite(Date.parse(sample.timestamp))
      ? (Date.parse(sample.timestamp) - started) / 1000
      : index + 1,
  }));
}

export default function LoadTestsSection({ job, onStop, onOpenStartModal, cpuEnabled, environment, overview, history }) {
  const isAws = environment === 'AWS';
  const runRows = testHistory(history, job);
  const hasRunHistory = !job?.startedAt || runRows.length > 0;
  const rows = job?.startedAt && !runRows.length ? testHistory(history, null) : runRows;
  const instanceCpu = instanceCpuRows(rows);
  const samples = probeRows(job);
  const hasJobSamples = samples.length > 0;

  return (
    <div className="section">
      <div className="load-test-heading">
        <div>
          <h2>{isAws ? 'AWS load tests & scaling' : 'Load tests & live system metrics'}</h2>
          <p>
            {isAws
              ? 'Follow the test and the AWS response together: EC2 CPU, Auto Scaling capacity, target health and Application Load Balancer metrics.'
              : 'Follow the bounded API probe together with live backend and container measurements.'}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onOpenStartModal}>Start Test Now</button>
      </div>

      {isAws ? (
        <>
          <div className="metrics load-test-summary">
            <StatCard label="ASG desired" value={overview.desiredCapacity ?? 'Unavailable'} caption={`Range ${overview.minimumCapacity ?? '—'}–${overview.maximumCapacity ?? '—'} instances`} />
            <StatCard label="In service / healthy" value={`${overview.replicaCount ?? '—'} / ${overview.healthyCount ?? '—'}`} caption="Healthy registered EC2 targets" warning={overview.healthyCount != null && overview.healthyCount < (overview.desiredCapacity ?? 0)} />
            <StatCard label="EC2 average CPU" value={fmt(overview.cpu, '%')} caption={`CloudWatch ${ist(overview.metricTimestamp || overview.timestamp)}`} />
            <StatCard label="ALB requests / sec" value={fmt(overview.requestRate)} caption={`Latest request-bearing 60-second CloudWatch window${overview.metricTimestamp ? ` · ${ist(overview.metricTimestamp)}` : ''}`} />
            <StatCard label="Target response p95" value={fmt(overview.p95Ms, ' ms')} caption="CloudWatch TargetResponseTime at that request window" />
            <StatCard label="Target error rate" value={overview.errorRate == null ? 'Unavailable' : fmt(overview.errorRate * 100, '%')} caption="Target 4xx + 5xx at that window; ALB-generated failures excluded" warning={overview.errorRate > 0} />
          </div>
          <p className="hint-text load-test-aws-note">
            AWS metrics arrive in 60-second CloudWatch periods. The six-minute CPU observation also sends bounded read-only ALB probes (1–50 req/s) so request, latency and target-error charts receive samples. CPU pressure, not probe traffic, drives Auto Scaling. A second EC2 backend may incur charges; automatic scale-in follows the longer low-CPU evaluation window.
          </p>
        </>
      ) : (
        <div className="metrics load-test-summary">
          <StatCard label="Backend replicas" value={overview.replicaCount ?? 'Unavailable'} caption={`${overview.healthyCount ?? '—'} healthy`} />
          <StatCard label="Container CPU" value={fmt(overview.cpu, '%')} caption="Docker Engine sample" />
          <StatCard label="Requests / sec" value={fmt(overview.requestRate)} caption="Completed backend requests" />
          <StatCard label="Average latency" value={fmt(overview.averageMs, ' ms')} caption="Rolling request sample" />
        </div>
      )}

      {!cpuEnabled && isAws && (
        <p className="hint-text">CPU scaling observation is unavailable until this AWS deployment enables the bounded SSM control.</p>
      )}

      <h2>Current run</h2>
      <RunningTestPanel job={job} onStop={onStop} />

      <h2>{job?.startedAt && hasRunHistory ? 'Infrastructure during this run' : 'Recent infrastructure'}</h2>
      <p className="hint-text">
        {job?.startedAt && hasRunHistory
          ? `Run started ${ist(job.startedAt)}. Samples are matched by their recorded timestamps.`
          : job?.startedAt
            ? 'This run predates the current monitoring history. Showing recent live infrastructure samples; older samples are not available in this session.'
            : 'Showing monitoring history from the current dashboard session.'}
        {isAws ? ' AWS samples can arrive one or more minutes after the test because CloudWatch publishes in 60-second periods.' : ''}
      </p>
      <div className="charts">
        <Chart
          title={isAws ? 'EC2 CPU by instance' : 'Backend CPU by replica'}
          subtitle={isAws ? 'CloudWatch CPUUtilization · one series per instance' : 'Docker CPU · one series per container'}
          rows={instanceCpu.rows}
          xKey="elapsedSeconds"
          yKeys={instanceCpu.keys}
          labels={instanceCpu.labels}
          emptyHint="No per-instance CPU samples overlap this run yet. Check back after the next monitoring update."
        />
        <Chart
          title={isAws ? 'Auto Scaling capacity & healthy targets' : 'Backend replicas & healthy containers'}
          subtitle={isAws ? 'Desired capacity, InService instances and healthy ALB targets' : 'Observed running and healthy containers'}
          rows={rows}
          xKey="elapsedSeconds"
          yKeys={isAws ? ['desiredCapacity', 'replicaCount', 'healthyCount'] : ['replicaCount', 'healthyCount']}
          labels={{ desiredCapacity: 'Desired', replicaCount: isAws ? 'In service' : 'Running', healthyCount: 'Healthy' }}
          emptyHint="Capacity history will appear after the monitoring collector records its next sample."
        />
        <Chart
          title={isAws ? 'ALB request rate' : 'Backend request rate'}
          subtitle={isAws ? 'Application Load Balancer RequestCount ÷ 60s' : 'Completed requests per second'}
          rows={rows}
          xKey="elapsedSeconds"
          yKeys={['requestRate']}
          labels={{ requestRate: 'Requests / sec' }}
          emptyHint="Request-rate samples are not available for this interval yet."
        />
        <Chart
          title={isAws ? 'ALB target response time' : 'Backend response time'}
          subtitle={isAws ? 'CloudWatch average and p95 TargetResponseTime' : 'Live request sample average and p95'}
          rows={rows}
          xKey="elapsedSeconds"
          yKeys={['averageMs', 'p95Ms']}
          labels={{ averageMs: 'Average ms', p95Ms: 'p95 ms' }}
          emptyHint="Latency samples are not available for this interval yet."
        />
        <Chart
          title={isAws ? 'EC2 memory usage' : 'Backend memory usage'}
          subtitle={isAws ? 'CloudWatch Agent · average instance memory %' : 'Docker container memory %'}
          rows={rows}
          xKey="elapsedSeconds"
          yKeys={['memoryPercent']}
          labels={{ memoryPercent: 'Memory %' }}
          emptyHint={isAws ? 'CloudWatch Agent memory metrics are unavailable for this interval.' : 'Memory samples are not available for this interval yet.'}
        />
        <Chart
          title={isAws ? 'ALB target errors' : 'Backend HTTP errors'}
          subtitle={isAws ? 'Target 4xx + 5xx as a percentage of requests' : 'Failed completed requests'}
          rows={rows}
          xKey="elapsedSeconds"
          yKeys={['errorPercent']}
          labels={{ errorPercent: 'Errors %' }}
          emptyHint="Error-rate samples are not available for this interval yet."
        />
        {hasJobSamples && (
          <Chart
            title={job?.type === 'cpu' ? 'CPU during the test' : 'Probe response time'}
            subtitle={job?.type === 'cpu' ? 'Direct samples from the bounded scaling observation' : `${job.completed ?? samples.length} requests · ${job.success ?? 0} successful · ${job.failed ?? 0} failed`}
            rows={samples}
            xKey="elapsedSeconds"
            yKeys={job?.type === 'cpu' ? ['cpu'] : ['latency']}
            labels={job?.type === 'cpu' ? { cpu: 'CPU %' } : { latency: 'Latency ms' }}
            emptyHint="Test-specific samples will appear as the test runs."
          />
        )}
      </div>

      {isAws && Array.isArray(overview.instances) && overview.instances.length > 0 && (
        <>
          <h2>EC2 instance status</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Instance</th><th>Lifecycle</th><th>Target health</th><th>CPU</th><th>AZ</th><th>Metric time</th></tr></thead>
              <tbody>{overview.instances.map((instance) => (
                <tr key={instance.id}>
                  <td>{instance.id}</td><td>{instance.lifecycle || 'Unavailable'}</td><td>{instance.health || 'Unavailable'}</td>
                  <td>{fmt(instance.cpu, '%')}</td><td>{instance.availabilityZone || 'Unavailable'}</td>
                  <td>{ist(instance.metricTimestamp)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
