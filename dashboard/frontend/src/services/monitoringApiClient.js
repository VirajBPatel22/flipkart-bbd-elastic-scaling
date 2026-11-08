const base = import.meta.env.VITE_MONITORING_API_BASE_URL ?? 'http://localhost:5001';
export async function getMonitoring() {
  const values = await Promise.all(['overview','history','events','experiments'].map(async route => {
    const r=await fetch(`${base}/api/${route}`, {signal: AbortSignal.timeout(8000)});
    if (!r.ok) throw new Error(`Monitoring request failed: ${r.status}`);
    return r.json();
  }));
  return Object.fromEntries(['overview','history','events','experiments'].map((k,i)=>[k,values[i]]));
}
export const csvUrl = `${base}/api/experiments.csv`;
