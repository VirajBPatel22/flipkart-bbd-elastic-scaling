const base = import.meta.env.VITE_MONITORING_API_BASE_URL ?? 'http://localhost:5001';
const routes = ['overview', 'history', 'events', 'experiments'];

export async function getMonitoring(selectedRoutes = routes) {
  const results = await Promise.all(
    selectedRoutes.map(async (route) => {
      try {
        const response = await fetch(`${base}/api/${route}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) {
          throw new Error(`Monitoring request failed: ${response.status}`);
        }
        return [route, { ok: true, data: await response.json() }];
      } catch (error) {
        return [route, { ok: false, error: error.message }];
      }
    }),
  );

  return Object.fromEntries(results);
}

export const csvUrl = `${base}/api/experiments.csv`;

export function experimentDetailsUrl(id) {
  return `${base}/api/experiments/${encodeURIComponent(id)}`;
}

export function experimentCsvUrl(id) {
  return `${base}/api/experiments/${encodeURIComponent(id)}/csv`;
}

export function experimentFileUrl(id, filename) {
  return `${base}/api/experiments/${encodeURIComponent(id)}/files/${encodeURIComponent(filename)}`;
}

export async function getExperiment(id) {
  const response = await fetch(experimentDetailsUrl(id), { signal: AbortSignal.timeout(8000) });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Could not load this test run');
  }
  return data;
}

export async function getExperimentFiles(id) {
  const response = await fetch(`${base}/api/experiments/${encodeURIComponent(id)}/files`, {
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Could not load evidence files for this test run');
  }
  return data;
}

export async function testRequest(action, settings) {
  const response = await fetch(
    `${base}/api/test${action === 'stop' ? '/stop' : ''}`,
    {
      method: action === 'status' ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-it457-test': '1',
      },
      ...(action === 'start' ? { body: JSON.stringify(settings) } : {}),
    },
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Test request failed');
  }
  return data;
}
