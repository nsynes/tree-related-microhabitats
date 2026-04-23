import { useMemo } from 'react';
import useFilterStore from '../store/useFilterStore';
import SpeciesCard from './SpeciesCard';

function SpeciesGrid({ config }) {
  const { filteredSpecies, level1Filters, level2Filters, level3Filters, species, getTotalFiltersCount } = useFilterStore();

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
      <div className="panel-title">Associated Species</div>
      <div className="results-info">{resultsMessage}</div>
      
      <div className="species-grid">
        {filteredSpecies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-text">No species match the selected filters</div>
            <div className="empty-state-hint">Try selecting different habitat features or fewer filters</div>
          </div>
        ) : (
          filteredSpecies.map(species => (
            <SpeciesCard key={species.id} species={species} />
          ))
        )}
      </div>
    </div>
  );
}

export default SpeciesGrid;