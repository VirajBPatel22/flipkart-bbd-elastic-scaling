export default function StatCard({ label, value, caption, warning }) {
  return (
    <section className={`card stat-card${warning ? ' stat-card-warning' : ''}`}>
      <p className="stat-label">{label}</p>
      <strong className="stat-value">{value}</strong>
      {caption && <p className="stat-caption">{caption}</p>}
    </section>
  );
}
