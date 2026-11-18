import PanelNotice from '../../components/PanelNotice';
import { fmt, ist } from '../../utils/format';

export default function InstancesSection({ data, overview: o, onRetry }) {
  const isAws = o.environment === 'AWS';
  const pending = isAws && o.replicaCount != null && o.instances
    ? o.instances.filter((i) => i.lifecycle && i.lifecycle !== 'InService').length
    : null;

  return (
    <div className="section">
      <PanelNotice panel="overview" data={data} onRetry={() => onRetry(['overview'])} />
      {o.unavailable && <p role="status" className="warning">{o.unavailable}</p>}

      <h2>Capacity</h2>
      <div className="metrics metrics-compact">
        <div className="card stat-card"><p className="stat-label">Minimum</p><strong className="stat-value">{o.minimumCapacity ?? 'N/A'}</strong></div>
        <div className="card stat-card"><p className="stat-label">Desired</p><strong className="stat-value">{o.desiredCapacity ?? (o.replicaCount ?? 'N/A')}</strong></div>
        <div className="card stat-card"><p className="stat-label">Maximum</p><strong className="stat-value">{o.maximumCapacity ?? 'N/A'}</strong></div>
        <div className="card stat-card"><p className="stat-label">In service</p><strong className="stat-value">{o.replicaCount ?? 'N/A'}</strong></div>
        <div className="card stat-card"><p className="stat-label">Pending</p><strong className="stat-value">{pending ?? (isAws ? 0 : 'N/A')}</strong></div>
        <div className="card stat-card"><p className="stat-label">Healthy</p><strong className="stat-value">{o.healthyCount ?? 'N/A'}</strong></div>
      </div>

      <h2>Backend instances</h2>
      <p>
        {isAws
          ? 'EC2 instances behind the Auto Scaling Group and target group, from live AWS APIs. Docker container replicas are a separate, local-only concept and are never mixed with EC2 instances here.'
          : 'Local Docker container replicas with this Compose project\'s labels. These are containers, not EC2 instances.'}
        {' '}{isAws ? o.distributionUnavailable : 'Request counters are actual completed application requests since each replica started; health and metrics probes are excluded.'}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{isAws ? 'Instance ID' : 'Container'}</th>
              <th>State</th>
              {isAws && <th>Availability Zone</th>}
              {isAws && <th>ASG lifecycle</th>}
              <th>Target health</th>
              <th>CPU %</th>
              <th>Memory</th>
              <th>Metric timestamp</th>
              <th>Uptime s</th>
              <th>Requests</th>
            </tr>
          </thead>
          <tbody>
            {(o.instances || []).map((i) => (
              <tr key={i.id}>
                <td>{i.id}</td>
                <td>{i.state}</td>
                {isAws && <td>{i.availabilityZone || 'Unavailable'}</td>}
                {isAws && <td>{i.lifecycle || 'Unavailable'}</td>}
                <td>{i.health}</td>
                <td>{fmt(i.cpu)}</td>
                <td>{i.memoryPercent != null ? fmt(i.memoryPercent, '%') : fmt(i.memoryBytes == null ? null : i.memoryBytes / 1048576, ' MiB')}</td>
                <td>{i.metricTimestamp ? ist(i.metricTimestamp) : 'Unavailable'}</td>
                <td>{fmt(i.uptimeSeconds)}</td>
                <td>{i.requests ?? 'Unavailable'}</td>
              </tr>
            ))}
            {!(o.instances || []).length && (
              <tr><td colSpan={isAws ? 9 : 7}>No instances reported yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Scaling activity</h2>
      <PanelNotice panel="events" data={data} onRetry={() => onRetry(['events'])} />
      {!data?.events?.length && <p>No scaling activities available in this monitoring session.</p>}
      {!!data?.events?.length && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Timestamp</th><th>Status</th><th>Description</th><th>Cause / result</th></tr>
            </thead>
            <tbody>
              {data.events.map((e, i) => (
                <tr key={e.id || i}>
                  <td>{ist(e.timestamp)}</td>
                  <td>{e.status || 'Observed'}</td>
                  <td>{e.message}</td>
                  <td>{e.cause || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isAws && (
        <p className="hint-text">
          The original design planned a maximum of three backend instances; the account&rsquo;s EC2 vCPU quota only
          supports a maximum of two with the standalone web tier included. Failed or quota-blocked launch activities
          are shown above exactly as recorded, not hidden or replaced with a fabricated third healthy instance.
        </p>
      )}
    </div>
  );
}
