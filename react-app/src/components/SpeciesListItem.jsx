import { memo } from 'react';
import { isValidData } from '../utils/dataHelpers';

function SpeciesListItem({ species, onClick }) {
  return (
    <button
      type="button"
      className="species-list-row"
      onClick={() => onClick(species)}
    >
      <span className="species-list-name">{species.scientificName}</span>
      <span className="species-list-common">
        {isValidData(species.commonName) ? species.commonName : ''}
      </span>
      <span className="species-list-class">
        {isValidData(species.class) ? species.class : ''}
      </span>
    </button>
  );
}

export default memo(SpeciesListItem);
