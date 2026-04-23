import { memo, useState } from 'react';
import { isValidData } from '../utils/dataHelpers';

function SpeciesCard({ species }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="species-card">
      <div className="species-scientific">{species.scientificName}</div>
      
      {isValidData(species.commonName) && (
        <div className="species-common">{species.commonName}</div>
      )}
      
      {(isValidData(species.class) || isValidData(species.order) || isValidData(species.family)) && (
        <div className="species-tags">
          {isValidData(species.class) && (
            <span className="species-tag">{species.class}</span>
          )}
          {isValidData(species.order) && (
            <span className="species-tag">{species.order}</span>
          )}
          {isValidData(species.family) && (
            <span className="species-tag family">{species.family}</span>
          )}
        </div>
      )}

      {/* Priority List Status */}
      {species.priorityList && (
        <div className="species-info-row">
          <span className="species-info-label">Priority List:</span>
          <span className="species-info-value">Yes</span>
        </div>
      )}

      {/* D4/D5 Lists */}
      {species.d4d5 && (
        <div className="species-info-row">
          <span className="species-info-label">D4/D5:</span>
          <span className="species-info-value">Yes</span>
        </div>
      )}

      {/* IUCN Status */}
      {isValidData(species.iucnStatus) && (
        <div className="species-info-row">
          <span className="species-info-label">IUCN Status:</span>
          <span className="species-info-value">{species.iucnStatus}</span>
        </div>
      )}

      {/* Rarity/Extinction Target */}
      {isValidData(species.rarity) && (
        <div className="species-info-row">
          <span className="species-info-label">Rarity:</span>
          <span className="species-info-value">{species.rarity}</span>
        </div>
      )}

      {/* Distribution */}
      {isValidData(species.distribution) && (
        <div className="species-info-row">
          <span className="species-info-label">Distribution:</span>
          <span className="species-info-value">{species.distribution}</span>
        </div>
      )}

      {/* Habitat Requirements (collapsible) */}
      {isValidData(species.habitatRequirements) && (
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
