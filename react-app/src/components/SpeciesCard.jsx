import { memo, useState } from 'react';

function SpeciesCard({ species }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="species-card">
      <div className="species-scientific">{species.scientificName}</div>
      
      {species.commonName && (
        <div className="species-common">{species.commonName}</div>
      )}
      
      {(species.class || species.family) && (
        <div className="species-tags">
          {species.class && (
            <span className="species-tag">{species.class}</span>
          )}
          {species.family && (
            <span className="species-tag family">{species.family}</span>
          )}
        </div>
      )}

      {/* NE Red List Status */}
      {species.neRedList && (
        <div className="species-info-row">
          <span className="species-info-label">Red List:</span>
          <span className="species-info-value">{species.neRedList}</span>
        </div>
      )}

      {/* Distribution */}
      {species.distribution && (
        <div className="species-info-row">
          <span className="species-info-label">Distribution:</span>
          <span className="species-info-value">{species.distribution}</span>
        </div>
      )}

      {/* Habitat Requirements (collapsible) */}
      {species.habitatRequirements && (
        <div className="species-habitat-requirements">
          <button 
            className="habitat-requirements-toggle"
            onClick={() => setExpanded(!expanded)}
          >
            <span>Habitat Requirements</span>
            <span className="toggle-icon">{expanded ? '−' : '+'}</span>
          </button>
          {expanded && (
            <div className="habitat-requirements-content">
              {species.habitatRequirements}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(SpeciesCard);
