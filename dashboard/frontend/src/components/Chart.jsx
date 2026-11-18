import { useState } from 'react';
import { fmt, ist } from '../utils/format';

const PALETTE = ['#38bdf8', '#fbbf24', '#a78bfa', '#34d399', '#f87171', '#f472b6', '#60a5fa', '#fb923c'];

/**
 * Minimal dependency-free SVG line chart. Series with missing samples are
 * drawn with gaps instead of invented zero values, and the component renders
 * an explicit "no samples" state rather than a misleading empty chart.
 */
export default function Chart({ title, subtitle, rows, xKey, yKeys, labels, emptyHint }) {
  const [hover, setHover] = useState(null);
  const points = rows.filter((r) => Number.isFinite(r[xKey]) && yKeys.some((k) => Number.isFinite(r[k])));

  if (!points.length) {
    return (
      <section className="card chart-card">
        <header className="chart-card-header">
          <h3>{title}</h3>
          {subtitle && <span className="chart-subtitle">{subtitle}</span>}
        </header>
        <p className="chart-empty">{emptyHint || 'No samples in this window yet.'}</p>
      </section>
    );
  }

  const xs = points.map((r) => r[xKey]);
  const ys = points.flatMap((r) => yKeys.map((k) => r[k])).filter(Number.isFinite);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const ymax = Math.max(1, ...ys);

  function handleMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, ((((e.clientX - box.left) / box.width) * 440) - 35) / 380));
    setHover(points[Math.round(ratio * (points.length - 1))]);
  }

  return (
    <section className="card chart-card">
      <header className="chart-card-header">
        <h3>{title}</h3>
        {subtitle && <span className="chart-subtitle">{subtitle}</span>}
      </header>
      <svg
        viewBox="0 0 440 160"
        role="img"
        aria-label={title}
        onMouseLeave={() => setHover(null)}
        onMouseMove={handleMove}
      >
        <text x="2" y="14" fill="#94a3b8" fontSize="10">{ymax.toFixed(1)}</text>
        <path d="M35 20V130H425" fill="none" stroke="#2e405d" />
        {yKeys.map((k, i) => {
          const color = PALETTE[i % PALETTE.length];
          const seriesPoints = points.filter((r) => Number.isFinite(r[k]));
          return (
            <g key={k}>
              <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={seriesPoints
                  .map((r) => `${35 + ((r[xKey] - min) / (max - min || 1)) * 380},${130 - (r[k] / ymax) * 105}`)
                  .join(' ')}
              />
              {seriesPoints.map((r, j) => (
                <circle
                  key={j}
                  cx={35 + ((r[xKey] - min) / (max - min || 1)) * 380}
                  cy={130 - (r[k] / ymax) * 105}
                  r="2.5"
                  fill={color}
                >
                  <title>{`${labels?.[k] ?? k}: ${fmt(r[k])}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        <text x="35" y="150" fill="#94a3b8" fontSize="10">
          {xKey === 'elapsedSeconds'
            ? `${new Date(points[0].timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })} IST`
            : min.toFixed(1)}
        </text>
        <text x="360" y="150" fill="#94a3b8" fontSize="10">
          {xKey === 'elapsedSeconds'
            ? `${new Date(points[points.length - 1].timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })} IST`
            : max.toFixed(1)}
        </text>
      </svg>
      {yKeys.length > 1 && (
        <div className="chart-legend">
          {yKeys.map((k, i) => (
            <span key={k} className="chart-legend-item">
              <i style={{ background: PALETTE[i % PALETTE.length] }} />
              {labels?.[k] ?? k}
            </span>
          ))}
        </div>
      )}
      {hover && (
        <div className="chart-tooltip">
          <time>{hover.timestamp ? `Observed ${ist(hover.timestamp)}` : `${xKey}: ${hover[xKey]}`}</time>
          {yKeys.map((k) => (
            <span key={k}>
              {labels?.[k] ?? k}: {fmt(hover[k])}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
