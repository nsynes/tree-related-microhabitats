import { useMemo, useState } from 'react';
import Modal from './Modal';
import { isValidData, groupHabitatsByLevel } from '../utils/dataHelpers';

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
  const taxonUrl = photo.taxonId
    ? `https://www.inaturalist.org/taxa/${photo.taxonId}`
    : null;
  return (
    <figure className="species-detail-photo">
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
      <figcaption className="species-detail-photo-credit">
        <span>{photo.attribution}</span>
        {taxonUrl && (
          <>
            {' · '}
            <a href={taxonUrl} target="_blank" rel="noopener noreferrer">
              View on iNaturalist
            </a>
          </>
        )}
      </figcaption>
    </figure>
  );
}

function SpeciesDetailModal({ config, species, onClose }) {
  const grouped = useMemo(
    () => (species ? groupHabitatsByLevel(config, species.habitats || []) : null),
    [config, species]
  );

  const level3ByGroup = useMemo(() => {
    if (!grouped) return [];
    const map = new Map();
    for (const entry of grouped.level3) {
      if (!map.has(entry.groupTitle)) map.set(entry.groupTitle, []);
      map.get(entry.groupTitle).push(entry);
    }
    return Array.from(map.entries());
  }, [grouped]);

  if (!species) return null;

  return (
    <Modal isOpen={true} onClose={onClose} title={species.scientificName}>
      <div className="species-detail">
        {species.photo && <SpeciesPhoto photo={species.photo} />}

        {isValidData(species.commonName) && (
          <p className="species-detail-common">{species.commonName}</p>
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
          {species.d4d5 && <DetailRow label="D4/D5" value="Yes" />}
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

        {grouped && (grouped.level1.length + grouped.level2.length + grouped.level3.length > 0) && (
          <section className="species-detail-section">
            <h3>Associated Microhabitats</h3>

            {grouped.level1.length > 0 && (
              <div className="species-detail-habitat-level">
                <div className="species-detail-habitat-heading">Woodland Type</div>
                <ul className="species-detail-habitat-list">
                  {grouped.level1.map(h => (
                    <li key={h.id}>{h.label}</li>
                  ))}
                </ul>
              </div>
            )}

            {grouped.level2.length > 0 && (
              <div className="species-detail-habitat-level">
                <div className="species-detail-habitat-heading">Tree Characteristics</div>
                <ul className="species-detail-habitat-list">
                  {grouped.level2.map(h => (
                    <li key={h.id}>
                      {h.label}
                      <span className="species-detail-habitat-context"> — {h.categoryTitle}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {level3ByGroup.length > 0 && (
              <div className="species-detail-habitat-level">
                <div className="species-detail-habitat-heading">Microhabitats</div>
                {level3ByGroup.map(([groupTitle, entries]) => (
                  <div key={groupTitle} className="species-detail-habitat-group">
                    <div className="species-detail-habitat-subheading">{groupTitle}</div>
                    <ul className="species-detail-habitat-list">
                      {entries.map(h => (
                        <li key={h.id}>{h.label}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}

export default SpeciesDetailModal;
