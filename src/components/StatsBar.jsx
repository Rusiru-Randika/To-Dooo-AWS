export default function StatsBar({ stats }) {
  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-card__number">{stats.total}</div>
        <div className="stat-card__label">Total</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__number stat-card__number--accent">{stats.active}</div>
        <div className="stat-card__label">Active</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__number stat-card__number--success">{stats.completed}</div>
        <div className="stat-card__label">Done</div>
      </div>
    </div>
  );
}
