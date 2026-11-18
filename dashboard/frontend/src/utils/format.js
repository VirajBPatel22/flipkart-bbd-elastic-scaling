export function ist(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not available';
  return `${new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: true,
  }).format(new Date(value))} IST`;
}

export function fmt(v, unit = '') {
  if (v === null || v === undefined || Number.isNaN(v)) return 'Unavailable';
  return `${Number(v).toFixed(2)}${unit}`;
}

export function shortId(id) {
  if (!id) return 'Unknown';
  if (id.startsWith('i-') && id.length > 10) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id;
}

// Server-reported job/run statuses are mapped to the vocabulary requested for
// the running-test panel without inventing any new underlying state.
export function statusLabel(status) {
  switch (status) {
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'stopped':
      return 'Cancelled';
    case 'incomplete':
      return 'Interrupted';
    case 'pending':
      return 'Pending';
    case 'starting':
      return 'Starting';
    default:
      return status || 'Unknown';
  }
}

export function elapsedLabel(startedAt, now = Date.now()) {
  if (!startedAt || !Number.isFinite(Date.parse(startedAt))) return 'Unavailable';
  const seconds = Math.max(0, Math.round((now - Date.parse(startedAt)) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
