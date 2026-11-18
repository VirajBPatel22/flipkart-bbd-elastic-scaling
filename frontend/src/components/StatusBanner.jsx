function StatusBanner({ title, message }) {
  return (
    <div className="card">
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  );
}

export default StatusBanner;
