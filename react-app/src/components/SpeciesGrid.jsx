import { useMemo, useState, useEffect, useCallback } from 'react';
import useFilterStore from '../store/useFilterStore';
import {
  findGroupsLevel,
  iterLevelFilters,
  compareByIucnSeverity,
  compareByName,
} from '../utils/dataHelpers';
import { slugifyScientificName } from '../utils/urlCodec';
import SpeciesCard from './SpeciesCard';
import SpeciesListItem from './SpeciesListItem';
import SpeciesDetailModal from './SpeciesDetailModal';
import MoreFiltersPanel from './MoreFiltersPanel';

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
    selectedFilterIds,
    searchQuery, setSearchQuery,
    selectedSpeciesFilters,
    toggleSpeciesFilter,
    clearSpeciesFilterGroup,
    clearAllSpeciesFilters,
    speciesFiltersBreakdown,
    sortKey, setSortKey,
    selectedSpeciesSlug, openSpeciesBySlug, closeSpecies,
  } = useFilterStore();

  const [viewMode, setViewMode] = useState(readStoredViewMode);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      /* localStorage unavailable — tolerate silently */
    }
  }, [viewMode]);

  const handleSelect = useCallback(
    (s) => openSpeciesBySlug(slugifyScientificName(s.scientificName)),
    [openSpeciesBySlug]
  );
  // If we pushed the modal-open history entry, Back undoes it cleanly;
  // otherwise (direct-load URL) just clear the store and let the URL-sync
  // hook replaceState the slug away.
  const handleClose = useCallback(() => {
    if (window.history.state?.tremsModal) window.history.back();
    else closeSpecies();
  }, [closeSpecies]);

  // Resolve slug → species object for the modal. Look in filteredSpecies
  // (the modal-respects-filters invariant means a slug only stays set
  // when its species passes the filters).
  const selectedSpecies = useMemo(
    () => (selectedSpeciesSlug
      ? filteredSpecies.find(s => slugifyScientificName(s.scientificName) === selectedSpeciesSlug) || null
      : null),
    [selectedSpeciesSlug, filteredSpecies]
  );

  const totalFilters = getTotalFiltersCount();
  const breakdown = speciesFiltersBreakdown();

  // Always-visible groups render above the search bar; the rest go in the
  // collapsible "More filters" panel. Driven by alwaysVisible config flag.
  const allGroups = config.speciesFilters || [];
  const alwaysVisibleGroups = allGroups.filter(g => g.alwaysVisible);
  const hiddenGroups = allGroups.filter(g => !g.alwaysVisible);

  // Counter for the "More filters" button reflects only the hidden groups —
  // alwaysVisible groups (taxa) have their own always-visible UI feedback.
  const hiddenSelectionsCount = useMemo(() => {
    let n = 0;
    const hiddenPrefixes = hiddenGroups.map(g => `${g.id}:`);
    for (const id of selectedSpeciesFilters) {
      if (hiddenPrefixes.some(p => id.startsWith(p))) n += 1;
    }
    return n;
  }, [selectedSpeciesFilters, hiddenGroups]);

  // Count selected filters in the groups-shape hierarchy level for the
  // results-info line (today: microhabitats).
  const microhabitatCount = useMemo(() => {
    const level = findGroupsLevel(config);
    if (!level) return 0;
    let n = 0;
    for (const f of iterLevelFilters(level)) {
      if (selectedFilterIds.has(f.id)) n++;
    }
    return n;
  }, [config, selectedFilterIds]);

  // Sort is presentation-only: applied here on top of the already-filtered
  // list so it doesn't trigger refilter, and so card and list views share
  // the same ordering.
  const sortedSpecies = useMemo(() => {
    const comparator = sortKey === 'iucnSeverity'
      ? compareByIucnSeverity(config)
      : compareByName;
    return [...filteredSpecies].sort(comparator);
  }, [filteredSpecies, sortKey, config]);

  const resultsMessage = useMemo(() => {
    const parts = [];
    if (totalFilters === 0 && !searchQuery && selectedSpeciesFilters.size === 0) {
      return `Select habitat features to view matching species (${species.length} total species available)`;
    }
    const microhabitatText = microhabitatCount > 0
      ? ` with ${microhabitatCount} microhabitat filter${microhabitatCount === 1 ? '' : 's'}`
      : '';
    parts.push(`Showing ${filteredSpecies.length} of ${species.length} species${microhabitatText}`);
    if (searchQuery.trim()) parts.push(`matching "${searchQuery.trim()}"`);
    return parts.join(' ');
  }, [filteredSpecies.length, totalFilters, species.length, searchQuery, selectedSpeciesFilters, microhabitatCount]);

  return (
    <div className="panel">
      <div className="panel-title">
        <span>Associated Species</span>
        <div className="panel-title-actions">
          {(selectedSpeciesFilters.size > 0 || searchQuery.trim()) && (
            <button
              onClick={clearAllSpeciesFilters}
              className="clear-filters-btn"
            >
              Clear All ({selectedSpeciesFilters.size + (searchQuery.trim() ? 1 : 0)})
            </button>
          )}
          <select
            className="species-sort-select"
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
            aria-label="Sort species"
          >
            <option value="name">Name (A → Z)</option>
            <option value="iucnSeverity">IUCN severity (most threatened first)</option>
          </select>
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
      </div>
      <div className="results-info">{resultsMessage}</div>

      {/* Always-visible filter rows — typically just Taxa today. Sits above
          the search bar because it's the most-used filter and the breakdown
          counts double as a taxonomic overview of the current dataset. */}
      {alwaysVisibleGroups.map(group => (
        <AlwaysVisibleGroup
          key={group.id}
          group={group}
          selectedSpeciesFilters={selectedSpeciesFilters}
          breakdown={breakdown.get(group.id)}
          onToggle={toggleSpeciesFilter}
          onClear={() => clearSpeciesFilterGroup(group.id)}
        />
      ))}

      <div className="species-search-bar">
        <div className="species-search-input-wrap">
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
        {hiddenGroups.length > 0 && (
          <button
            type="button"
            className={`more-filters-button${moreFiltersOpen ? ' open' : ''}${hiddenSelectionsCount > 0 ? ' has-active' : ''}`}
            onClick={() => setMoreFiltersOpen(v => !v)}
            aria-expanded={moreFiltersOpen}
            aria-controls="more-filters-panel"
          >
            <span>More filters</span>
            <span
              className={`more-filters-button-count${hiddenSelectionsCount === 0 ? ' empty' : ''}`}
              aria-hidden={hiddenSelectionsCount === 0}
            >
              ({hiddenSelectionsCount || 0})
            </span>
            <span className="more-filters-button-caret" aria-hidden="true">
              {moreFiltersOpen ? '▴' : '▾'}
            </span>
          </button>
        )}
      </div>

      {moreFiltersOpen && (
        <div id="more-filters-panel">
          <MoreFiltersPanel
            config={config}
            breakdown={breakdown}
            onClose={() => setMoreFiltersOpen(false)}
          />
        </div>
      )}

      {filteredSpecies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-text">No species match the selected filters</div>
          <div className="empty-state-hint">Try selecting different habitat features or fewer filters</div>
        </div>
      ) : viewMode === 'card' ? (
        <div className="species-grid">
          {sortedSpecies.map(s => (
            <SpeciesCard key={s.id} species={s} onClick={handleSelect} />
          ))}
        </div>
      ) : (
        <div className="species-list">
          {sortedSpecies.map(s => (
            <SpeciesListItem key={s.id} config={config} species={s} onClick={handleSelect} />
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

/**
 * Renders one alwaysVisible speciesFilters group as a chip row, with an "All"
 * reset chip at the front. Active when no chips in this group are selected.
 */
function AlwaysVisibleGroup({ group, selectedSpeciesFilters, breakdown, onToggle, onClear }) {
  const prefix = `${group.id}:`;
  const anySelected = Array.from(selectedSpeciesFilters).some(id => id.startsWith(prefix));
  const total = breakdown?.total ?? 0;
  const counts = breakdown?.counts;

  return (
    <div className="species-class-tabs" role="tablist" aria-label={group.title}>
      <button
        type="button"
        role="tab"
        className={`species-class-tab${!anySelected ? ' active' : ''}`}
        aria-selected={!anySelected}
        onClick={onClear}
      >
        <span className="species-class-tab-label">All</span>
        <span className="species-class-tab-count">{total}</span>
      </button>
      {group.options.map(opt => {
        const id = `${group.id}:${opt.id}`;
        const active = selectedSpeciesFilters.has(id);
        const count = counts?.get(opt.id) ?? 0;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            className={`species-class-tab${active ? ' active' : ''}`}
            aria-selected={active}
            onClick={() => onToggle(id)}
          >
            <span className="species-class-tab-label">{opt.label || opt.id}</span>
            <span className="species-class-tab-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SpeciesGrid;