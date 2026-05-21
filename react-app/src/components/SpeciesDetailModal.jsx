import { useMemo, useState } from 'react';
import Modal from './Modal';
import { isValidData, groupHabitatsByLevel, levelShape } from '../utils/dataHelpers';

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

  const totalGrouped = grouped
    ? config.filterHierarchy.reduce((sum, l) => sum + (grouped[l.level]?.length || 0), 0)
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

        <section className="species-detail-section">
          <h3>Status</h3>
          {species.priorityEngland && (
            <DetailRow label="Priority (England)" value="Yes" />
          )}
          {species.d4 && <DetailRow label="D4" value="Yes" />}
          {species.d5 && <DetailRow label="D5" value="Yes" />}
          <DetailRow label="IUCN Status" value={species.iucnStatus} />
          <DetailRow label="Threatened Action" value={species.threatenedAction} />
          <DetailRow label="Distribution" value={species.distribution} />
        </section>

        {isValidData(species.habitatRequirements) && (
          <section className="species-detail-section">
            <h3>Habitat Requirements</h3>
            <p className="species-detail-prose">{species.habitatRequirements}</p>
          </section>
        )}

        {grouped && totalGrouped > 0 && (
          <section className="species-detail-section">
            <h3>Habitat Associations</h3>

            {config.filterHierarchy.map(level => {
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
