import { useEffect, useState } from 'react';
import { getMonitoring, testRequest } from '../services/monitoringApiClient';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import StartTestModal from '../components/StartTestModal';
import OverviewSection from './sections/OverviewSection';
import InstancesSection from './sections/InstancesSection';
import MetricsSection from './sections/MetricsSection';
import LoadTestsSection from './sections/LoadTestsSection';
import ResultsSection from './sections/ResultsSection';

function mergePanelResults(previous, results) {
  const next = {
    ...(previous || {}),
    errors: {},
    updatedAt: { ...(previous?.updatedAt || {}) },
  };
  for (const [panel, result] of Object.entries(results)) {
    if (result.ok) {
      next[panel] = result.data;
      next.updatedAt[panel] = new Date().toISOString();
    } else {
      next.errors[panel] = result.error;
    }
  }
  return next;
}

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Shared monitoring data (overview/history/events/experiments).
  const [data, setData] = useState(null);
  const [refresh, setRefresh] = useState(4000);
  const [windowMinutes, setWindowMinutes] = useState(30);
  const [paused, setPaused] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [headerError, setHeaderError] = useState('');

  async function refreshPanels(selectedRoutes) {
    const results = await getMonitoring(selectedRoutes);
    setData((current) => mergePanelResults(current, results));
    return results;
  }

  async function fetchLatest() {
    setRefreshing(true);
    try {
      const results = await refreshPanels(['overview', 'history', 'events', 'experiments']);
      if (results.overview?.ok) {
        setHeaderError('');
        setLastRefreshAt(new Date().toISOString());
      } else {
        setHeaderError(results.overview.error);
      }
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function update() {
      const results = await getMonitoring();
      if (!active) return;
      setData((current) => mergePanelResults(current, results));
      if (results.overview?.ok) setLastRefreshAt(new Date().toISOString());
    }
    update();
    if (paused) return () => { active = false; };
    const t = setInterval(update, refresh);
    return () => { active = false; clearInterval(t); };
  }, [refresh, paused]);

  // Load-test control state, shared between the header button, the modal and the Load Tests section.
  const [test, setTest] = useState(null);
  const [testError, setTestError] = useState('');
  const [testName, setTestName] = useState('');
  const [mode, setMode] = useState('probe');
  const [rate, setRate] = useState(2);
  const [duration, setDuration] = useState(20);
  const [confirmCpu, setConfirmCpu] = useState(false);
  const [startModalOpen, setStartModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const update = () => testRequest('status').then((v) => { if (active) setTest(v); }).catch(() => {});
    update();
    const t = setInterval(update, 2000);
    return () => { active = false; clearInterval(t); };
  }, []);

  async function handleStartSubmit() {
    setTestError('');
    try {
      await testRequest('start', {
        rate,
        duration,
        name: testName,
        ...(mode === 'cpu' ? { type: 'cpu', confirmScaling: confirmCpu } : {}),
      });
      setTest(await testRequest('status'));
      setStartModalOpen(false);
    } catch (e) {
      setTestError(e.message);
    }
  }

  async function handleStop() {
    try {
      await testRequest('stop');
      setTest(await testRequest('status'));
    } catch (e) {
      setTestError(e.message);
    }
  }

  const o = data?.overview || {};
  const rawHistory = Array.isArray(data?.history) ? data.history : [];
  const firstTimestamp = Date.parse(rawHistory[0]?.timestamp);
  const history = rawHistory.map((r) => ({
    ...r,
    memoryMiB: r.memoryBytes == null ? null : r.memoryBytes / 1048576,
    errorPercent: r.errorRate == null ? null : r.errorRate * 100,
    elapsedSeconds: Number.isFinite(firstTimestamp) && Number.isFinite(Date.parse(r.timestamp))
      ? (Date.parse(r.timestamp) - firstTimestamp) / 1000
      : null,
  }));

  const job = test?.job || null;

  return (
    <div className="app-shell">
      <Sidebar active={activeSection} onSelect={setActiveSection} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="dashboard-main">
        <Header
          environment={o.environment}
          environmentSource={o.source}
          lastRefreshAt={lastRefreshAt}
          refreshing={refreshing}
          refreshError={headerError}
          onFetchLatest={fetchLatest}
          onStartTest={() => setStartModalOpen(true)}
          onOpenMenu={() => setSidebarOpen(true)}
        />

        <main className="dashboard-content">
          {activeSection === 'overview' && <OverviewSection data={data} overview={o} history={history} onRetry={refreshPanels} />}
          {activeSection === 'instances' && <InstancesSection data={data} overview={o} onRetry={refreshPanels} />}
          {activeSection === 'metrics' && (
            <MetricsSection
              data={data}
              overview={o}
              history={history}
              refresh={refresh}
              onRefreshChange={setRefresh}
              windowMinutes={windowMinutes}
              onWindowChange={setWindowMinutes}
              paused={paused}
              onTogglePaused={() => setPaused((v) => !v)}
              onRetry={refreshPanels}
            />
          )}
          {activeSection === 'load-tests' && (
            <LoadTestsSection
              job={job}
              onStop={handleStop}
              onOpenStartModal={() => setStartModalOpen(true)}
              cpuEnabled={test?.cpuEnabled}
              environment={o.environment}
              overview={o}
              history={history}
            />
          )}
          {activeSection === 'results' && <ResultsSection data={data} onRetry={refreshPanels} refreshing={refreshing} />}
        </main>
      </div>

      <StartTestModal
        open={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        environment={o.environment}
        overview={o}
        mode={mode}
        onModeChange={setMode}
        name={testName}
        onNameChange={setTestName}
        rate={rate}
        onRateChange={setRate}
        duration={duration}
        onDurationChange={setDuration}
        confirmCpu={confirmCpu}
        onConfirmCpuChange={setConfirmCpu}
        cpuEnabled={!!test?.cpuEnabled}
        jobRunning={job?.status === 'running'}
        testError={testError}
        onStart={handleStartSubmit}
      />
    </div>
  );
}
