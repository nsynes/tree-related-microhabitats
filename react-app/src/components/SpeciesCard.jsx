import { memo } from 'react';
import { isValidData } from '../utils/dataHelpers';

function SpeciesCard({ species, onClick }) {
  const handleClick = () => onClick(species);
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className="species-card"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKey}
    >
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

      {species.priorityEngland && (
        <div className="species-info-row">
          <span className="species-info-label">Priority List:</span>
          <span className="species-info-value">Yes</span>
        </div>
      )}

      {species.d4d5 && (
        <div className="species-info-row">
          <span className="species-info-label">D4/D5:</span>
          <span className="species-info-value">Yes</span>
        </div>
      )}

      {isValidData(species.iucnStatus) && (
        <div className="species-info-row">
          <span className="species-info-label">IUCN Status:</span>
          <span className="species-info-value">{species.iucnStatus}</span>
        </div>
      )}

      {isValidData(species.distribution) && (
        <div className="species-info-row">
          <span className="species-info-label">Distribution:</span>
          <span className="species-info-value">{species.distribution}</span>
        </div>
      )}
    </div>
  );
}

export default memo(SpeciesCard);
