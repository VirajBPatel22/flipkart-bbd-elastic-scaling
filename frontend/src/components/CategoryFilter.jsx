function CategoryFilter({ categories, activeCategory, onSelect }) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <nav className="category-filter" aria-label="Filter products by category">
      <button
        type="button"
        className={`category-filter__pill${activeCategory ? '' : ' is-active'}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          className={`category-filter__pill${activeCategory === category ? ' is-active' : ''}`}
          onClick={() => onSelect(category)}
        >
          {category}
        </button>
      ))}
    </nav>
  );
}

export default CategoryFilter;
