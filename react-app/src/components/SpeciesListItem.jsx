import { memo } from 'react';
import { isValidData, iterConservationStatuses } from '../utils/dataHelpers';

function SpeciesListItem({ config, species, onClick }) {
  const badges = [];
  for (const s of iterConservationStatuses(config, species)) {
    badges.push({ groupId: s.groupId, optId: s.opt?.id, short: s.shortLabel, long: s.longLabel });
  }
  return (
    <button
      type="button"
      className="species-list-row"
      onClick={() => onClick(species)}
    >
      <span className="species-list-name">{species.scientificName}</span>
      <span className="species-list-order">
        {isValidData(species.order) ? species.order : ''}
      </span>
      {badges.length > 0 && (
        <span className="species-list-badges">
          {badges.map(b => (
            <span
              key={`${b.groupId}:${b.optId}`}
              className={`species-list-badge species-list-badge--${b.groupId}`}
              title={b.long}
            >
              {b.short}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

export default memo(SpeciesListItem);