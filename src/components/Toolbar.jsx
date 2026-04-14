const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Done' },
];

const CATEGORIES = ['all', 'personal', 'work', 'shopping', 'health', 'learning'];

export default function Toolbar({ filter, onFilterChange, category, onCategoryChange, search, onSearchChange }) {
  return (
    <div className="toolbar">
      <input
        id="search-input"
        className="toolbar__search"
        type="text"
        placeholder="Search tasks..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="toolbar__filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            id={`filter-${f.key}`}
            className={`toolbar__filter-btn ${filter === f.key ? 'toolbar__filter-btn--active' : ''}`}
            onClick={() => onFilterChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <select
        id="category-filter"
        className="toolbar__category-select"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c === 'all' ? '📁 All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
