import { useMemo, useState } from 'react';
import Modal from './Modal';
import {
  isValidData,
  groupHabitatsByLevel,
  levelShape,
  iterConservationStatuses,
} from '../utils/dataHelpers';

function DetailRow({ label, value }) {
  if (!isValidData(value)) return null;
  return (
    <div className="species-detail-row">
      <span className="species-detail-label">{label}</span>
      <span className="species-detail-value">{value}</span>
    </div>
  );
}

function SpeciesPhoto({ photo }) {
  const [failed, setFailed] = useState(false);
  const src = photo?.largeUrl || photo?.url;
  if (!src || failed) return null;
  return (
    <figure className="species-detail-photo">
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
      <figcaption className="species-detail-photo-credit">
        {photo.attribution}
      </figcaption>
    </figure>
  );
}

function SpeciesDetailModal({ config, species, onClose }) {
  const grouped = useMemo(
    () => (species ? groupHabitatsByLevel(config, species.habitats || []) : null),
    [config, species]
  );

  // Conservation status strings derived from config.speciesFilters via the
  // shared iterator. iterConservationStatuses returns each applicable status
  // already formatted as both a long and short form; the modal uses the
  // long form (which applies any group.statusFormat template).
  const conservationStatuses = useMemo(() => {
    const list = [];
    for (const s of iterConservationStatuses(config, species)) {
      list.push(s.longLabel);
    }
    return list;
  }, [config, species]);

  // Pre-bucket the groups-level entries by their group title so the modal can
  // render them in subsections (e.g. Cavity, Injuries, etc.).
  const groupsLevelByGroupTitle = useMemo(() => {
    if (!grouped) return new Map();
    const map = new Map();
    for (const level of config.filterHierarchy) {
      if (levelShape(level) !== 'groups') continue;
      for (const entry of grouped[level.level] || []) {
        const key = `${level.level}:${entry.groupTitle}`;
        if (!map.has(key)) map.set(key, { level: level.level, groupTitle: entry.groupTitle, entries: [] });
        map.get(key).entries.push(entry);
      }
    }
    return map;
  }, [config, grouped]);

  if (!species) return null;

  // Geographic Location (level id `geographic_location`) is deliberately
  // excluded from the Habitat Associations section - its content overlaps
  // with the Distribution in Great Britain prose above, and showing both
  // is redundant.
  const habitatAssociationLevels = config.filterHierarchy.filter(
    l => l.id !== 'geographic_location'
  );
  const totalGrouped = grouped
    ? habitatAssociationLevels.reduce((sum, l) => sum + (grouped[l.level]?.length || 0), 0)
    : 0;

  return (
    <Modal isOpen={true} onClose={onClose} title={species.scientificName}>
      <div className="species-detail">
        {species.photo && <SpeciesPhoto photo={species.photo} />}

        {isValidData(species.commonName) && (
          <p className="species-detail-common">{species.commonName}</p>
        )}

        {species.taxonId && (
          <p className="species-detail-inat-link">
            <a
              href={`https://www.inaturalist.org/taxa/${species.taxonId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on iNaturalist →
            </a>
          </p>
        )}

        <section className="species-detail-section">
          <h3>Taxonomy</h3>
          <DetailRow label="Class" value={species.class} />
          <DetailRow label="Order" value={species.order} />
          <DetailRow label="Family" value={species.family} />
        </section>

        {conservationStatuses.length > 0 && (
          <section className="species-detail-section">
            <h3>Taxon designations and indicators</h3>
            <ul className="species-detail-status-list">
              {conservationStatuses.map(s => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        )}

        {isValidData(species.distribution) && (
          <section className="species-detail-section">
            <h3>Distribution in Great Britain</h3>
            <p className="species-detail-prose">{species.distribution}</p>
          </section>
        )}

        {isValidData(species.habitatRequirements) && (
          <section className="species-detail-section">
            <h3>Habitat Requirements</h3>
            <p className="species-detail-prose">{species.habitatRequirements}</p>
          </section>
        )}

        {grouped && totalGrouped > 0 && (
          <section className="species-detail-section">
            <h3>Habitat Associations</h3>

            {habitatAssociationLevels.map(level => {
              const entries = grouped[level.level] || [];
              if (entries.length === 0) return null;
              const shape = levelShape(level);
              const heading = level.title.replace(/^\d+\.\s*/, '');

              if (shape === 'groups') {
                const groupsForLevel = Array.from(groupsLevelByGroupTitle.values())
                  .filter(g => g.level === level.level);
                return (
                  <div key={level.level} className="species-detail-habitat-level">
                    <div className="species-detail-habitat-heading">{heading}</div>
                    {groupsForLevel.map(({ groupTitle, entries: gentries }) => (
                      <div key={groupTitle} className="species-detail-habitat-group">
                        <div className="species-detail-habitat-subheading">{groupTitle}</div>
                        <ul className="species-detail-habitat-list">
                          {gentries.map(h => (<li key={h.id}>{h.label}</li>))}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div key={level.level} className="species-detail-habitat-level">
                  <div className="species-detail-habitat-heading">{heading}</div>
                  <ul className="species-detail-habitat-list">
                    {entries.map(h => (<li key={h.id}>{h.label}</li>))}
                  </ul>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </Modal>
  );
}

export default SpeciesDetailModal;
