import { useMemo, useState, useEffect, useCallback } from 'react';
import useFilterStore from '../store/useFilterStore';
import SpeciesCard from './SpeciesCard';
import SpeciesListItem from './SpeciesListItem';
import SpeciesDetailModal from './SpeciesDetailModal';

const VIEW_MODE_KEY = 'trems-view-mode';

function readStoredViewMode() {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    return stored === 'list' ? 'list' : 'card';
  } catch {
    return 'card';
  }
}

function SpeciesGrid({ config }) {
  const {
    filteredSpecies, species, getTotalFiltersCount,
    searchQuery, setSearchQuery,
    classFilter, setClassFilter,
    classBreakdown,
  } = useFilterStore();

  const [viewMode, setViewMode] = useState(readStoredViewMode);
  const [selectedSpecies, setSelectedSpecies] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      /* localStorage unavailable — tolerate silently */
    }
  }, [viewMode]);

  const handleSelect = useCallback((s) => setSelectedSpecies(s), []);
  const handleClose = useCallback(() => setSelectedSpecies(null), []);

  const totalFilters = getTotalFiltersCount();

  // Recomputes on every render — cheap at ~600 species and simplest to reason
  // about given the search query updates on every keystroke.
  const breakdown = classBreakdown();

  const resultsMessage = useMemo(() => {
    const parts = [];
    if (totalFilters === 0 && !searchQuery && classFilter === null) {
      return `Select habitat features to view matching species (${species.length} total species available)`;
    }
    parts.push(`Showing ${filteredSpecies.length} of ${species.length} species`);
    if (searchQuery.trim()) parts.push(`matching "${searchQuery.trim()}"`);
    if (classFilter !== null) parts.push(`(${classFilter} only)`);
    return parts.join(' ');
  }, [filteredSpecies.length, totalFilters, species.length, searchQuery, classFilter]);

  return (
    <div className="panel">
      <div className="panel-title">
        <span>Associated Species</span>
        <div className="view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={`view-toggle-btn${viewMode === 'card' ? ' active' : ''}`}
            onClick={() => setViewMode('card')}
            title="Card view"
            aria-pressed={viewMode === 'card'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            className={`view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
            aria-pressed={viewMode === 'list'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div className="results-info">{resultsMessage}</div>

      <div className="species-search-bar">
        <input
          type="search"
          className="species-search-input"
          placeholder="Find species by scientific or common name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          aria-label="Search species"
        />
        {searchQuery && (
          <button
            type="button"
            className="species-search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <div className="species-class-tabs" role="tablist" aria-label="Filter by class">
        <button
          type="button"
          role="tab"
          className={`species-class-tab${classFilter === null ? ' active' : ''}`}
          aria-selected={classFilter === null}
          onClick={() => setClassFilter(null)}
        >
          <span className="species-class-tab-label">All</span>
          <span className="species-class-tab-count">{breakdown.total}</span>
        </button>
        {breakdown.classes.map(({ class: cls, count }) => (
          <button
            key={cls}
            type="button"
            role="tab"
            className={`species-class-tab${classFilter === cls ? ' active' : ''}`}
            aria-selected={classFilter === cls}
            onClick={() => setClassFilter(classFilter === cls ? null : cls)}
          >
            <span className="species-class-tab-label">{cls}</span>
            <span className="species-class-tab-count">{count}</span>
          </button>
        ))}
      </div>

      {filteredSpecies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">No species match the selected filters</div>
          <div className="empty-state-hint">Try selecting different habitat features or fewer filters</div>
        </div>
      ) : viewMode === 'card' ? (
        <div className="species-grid">
          {filteredSpecies.map(s => (
            <SpeciesCard key={s.id} species={s} onClick={handleSelect} />
          ))}
        </div>
      ) : (
        <div className="species-list">
          {filteredSpecies.map(s => (
            <SpeciesListItem key={s.id} species={s} onClick={handleSelect} />
          ))}
        </div>
      )}

      <SpeciesDetailModal
        config={config}
        species={selectedSpecies}
        onClose={handleClose}
      />
    </div>
  );
}

export default SpeciesGrid;
