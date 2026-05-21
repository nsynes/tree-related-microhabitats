import { memo, useState } from 'react';
import { isValidData } from '../utils/dataHelpers';

function SpeciesCard({ species, onClick }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoUrl = species.photo?.smallUrl || species.photo?.url;
  const showPhoto = photoUrl && !photoFailed;

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
      {showPhoto ? (
        <div className="species-card-photo">
          <img
            src={photoUrl}
            alt=""
            loading="lazy"
            onError={() => setPhotoFailed(true)}
          />
        </div>
      ) : (
        <div className="species-card-photo species-card-photo--empty" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.3" fill="currentColor" stroke="none" />
            <path d="M21 16l-5-5-8 8" />
          </svg>
          <span>No photo available</span>
        </div>
      )}

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

      {species.d4 && (
        <div className="species-info-row">
          <span className="species-info-label">D4:</span>
          <span className="species-info-value">Yes</span>
        </div>
      )}

      {species.d5 && (
        <div className="species-info-row">
          <span className="species-info-label">D5:</span>
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
