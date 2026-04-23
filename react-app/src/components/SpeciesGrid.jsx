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
  const { filteredSpecies, level3Filters, species, getTotalFiltersCount } = useFilterStore();

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

  const resultsMessage = useMemo(() => {
    if (totalFilters === 0) {
      return `Select habitat features to view matching species (${species.length} total species available)`;
    }
    const level3Text = level3Filters.size > 0 ? ` with ${level3Filters.size} microhabitat filter(s)` : '';
    return `Showing ${filteredSpecies.length} of ${species.length} species${level3Text}`;
  }, [filteredSpecies.length, totalFilters, level3Filters.size, species.length]);

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
