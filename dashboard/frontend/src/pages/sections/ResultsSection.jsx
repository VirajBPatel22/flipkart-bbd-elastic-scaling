import { useMemo, useState } from 'react';
import Chart from '../../components/Chart';
import PanelNotice from '../../components/PanelNotice';
import TestDetailsModal from '../../components/TestDetailsModal';
import { csvUrl } from '../../services/monitoringApiClient';
import { fmt, ist } from '../../utils/format';

const PAGE_SIZE = 10;

function statusOf(r) {
  if (r.thresholdsPassed === false) return 'Failed';
  if (r.thresholdsPassed === true) return 'Passed';
  return 'Unknown';
}

export default function ResultsSection({ data, onRetry, refreshing }) {
  const runs = useMemo(() => data?.experiments || [], [data?.experiments]);
  const [tab, setTab] = useState('results');
  const [search, setSearch] = useState('');
  const [scenarioFilter, setScenarioFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [viewRunId, setViewRunId] = useState(null);

  const scenarios = useMemo(() => [...new Set(runs.map((r) => r.scenario).filter(Boolean))], [runs]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = runs.filter((r) => {
      if (term && !(`${r.testName || ''} ${r.scenario || ''} ${r.id || ''}`.toLowerCase().includes(term))) return false;
      if (scenarioFilter !== 'all' && r.scenario !== scenarioFilter) return false;
      if (statusFilter !== 'all' && statusOf(r) !== statusFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const diff = String(a.timestamp).localeCompare(String(b.timestamp));
      return sortDir === 'desc' ? -diff : diff;
    });
    return list;
  }, [runs, search, scenarioFilter, statusFilter, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const key = (r) => `${r.environment || 'Unknown environment'} · ${r.scenario} · ${r.rate} req/s · ${r.iterations ?? 'unknown'} iterations`;
  const groups = [...new Set(runs.map(key))];
  const [compareGroup, setCompareGroup] = useState('');
  const selectedGroup = groups.includes(compareGroup)
    ? compareGroup
    : (groups.find((g) => new Set(runs.filter((r) => key(r) === g && Number.isFinite(r.replicas)).map((r) => r.replicas)).size > 1) || groups[0]);
  const comparison = runs.filter((r) => key(r) === selectedGroup);
  const hasCpu = comparison.some((r) => Number.isFinite(r.cpu));

  return (
    <div className="section">
      <div className="tab-row">
        <button type="button" className={tab === 'results' ? 'tab active' : 'tab'} onClick={() => setTab('results')}>Previous Test Results</button>
        <button type="button" className={tab === 'compare' ? 'tab active' : 'tab'} onClick={() => setTab('compare')}>Compare Experiments</button>
      </div>

      {tab === 'results' && (
        <>
          <div className="controls">
            <label>
              Search
              <input type="text" placeholder="Test name, scenario or ID" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </label>
            <label>
              Scenario
              <select value={scenarioFilter} onChange={(e) => { setScenarioFilter(e.target.value); setPage(1); }}>
                <option value="all">All</option>
                {scenarios.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>
              Status
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="all">All</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
                <option value="Unknown">Unknown</option>
              </select>
            </label>
            <label>
              Sort by date
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="desc">Most recent first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
            <button type="button" className="btn btn-secondary" onClick={() => onRetry(['experiments'])} disabled={refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh Results'}
            </button>
            <a className="btn btn-ghost" href={csvUrl}>Export all (CSV)</a>
          </div>

          <PanelNotice panel="experiments" data={data} onRetry={() => onRetry(['experiments'])} />

          {!runs.length ? (
            <p>No test results available. Run a test to see results here.</p>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {['Test name', 'Date / time', 'Scenario', 'Environment', 'Instances', 'Duration s', 'Avg latency ms', 'p95 ms', 'Throughput', 'Error %', 'Status', ''].map((h) => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.testName || 'Unnamed run'}</td>
                        <td>{ist(r.timestamp)}</td>
                        <td>{r.scenario}</td>
                        <td>{r.environment || 'Unknown'}</td>
                        <td>{r.replicas ?? 'Dynamic / unknown'}</td>
                        <td>{fmt(r.durationSeconds)}</td>
                        <td>{fmt(r.averageMs)}</td>
                        <td>{fmt(r.p95Ms)}</td>
                        <td>{fmt(r.throughput)}</td>
                        <td>{r.failureRate != null ? (r.failureRate * 100).toFixed(1) : 'Unavailable'}</td>
                        <td>{statusOf(r)}</td>
                        <td><button type="button" className="btn btn-ghost" onClick={() => setViewRunId(r.id)}>View</button></td>
                      </tr>
                    ))}
                    {!pageRows.length && <tr><td colSpan={12}>No results match these filters.</td></tr>}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="controls">
                  <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span className="status-text">Page {page} of {totalPages}</span>
                  <button type="button" className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === 'compare' && (
        <>
          <p>
            Comparisons group runs by matching environment, scenario, offered request rate and iteration count so
            mismatched configurations are never pooled together. Manually selected instance counts are never
            presented as evidence of automatic scaling.
          </p>
          {!!groups.length && (
            <label>
              Comparison workload
              <select value={selectedGroup} onChange={(e) => setCompareGroup(e.target.value)}>
                {groups.map((g) => <option key={g}>{g}</option>)}
              </select>
            </label>
          )}
          {!groups.length && <p>No saved runs yet to compare.</p>}
          <div className="charts">
            {[
              ['Instances vs average latency ms', 'replicas', 'averageMs'],
              ['Instances vs p95 latency ms', 'replicas', 'p95Ms'],
              ['Instances vs throughput req/s', 'replicas', 'throughput'],
              ...(hasCpu ? [['Instances vs mean CPU %', 'replicas', 'cpu']] : []),
              ['Offered requests/s vs latency ms', 'rate', 'averageMs'],
            ]
              .filter(([, x, y]) => comparison.some((r) => Number.isFinite(r[x]) && Number.isFinite(r[y])))
              .map(([title, x, y]) => (
                <Chart key={title} title={title} rows={[...comparison].sort((a, b) => a[x] - b[x])} xKey={x} yKeys={[y]} labels={{ [y]: title }} />
              ))}
          </div>
          {!hasCpu && <p>Historical runs in this group do not include aligned per-run CPU averages; none are estimated.</p>}
        </>
      )}

      {viewRunId && <TestDetailsModal runId={viewRunId} onClose={() => setViewRunId(null)} />}
    </div>
  );
}
