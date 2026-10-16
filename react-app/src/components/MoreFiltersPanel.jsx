import useFilterStore from '../store/useFilterStore';
import { groupBySection } from '../utils/dataHelpers';

/**
 * Collapsible "More filters" panel for the species (right) panel.
 *
 * Driven entirely by config.speciesFilters from data/column-mapping.json.
 * Only renders groups *without* the alwaysVisible flag - alwaysVisible groups
 * are rendered by SpeciesGrid directly above the search bar.
 *
 * Consecutive groups that share a `section` are collapsed under a single
 * section heading (e.g. priority/eif/iucn all render together under
 * "Taxon designations"). Groups without a section still
 * render one heading per group via groupBySection's title fallback.
 *
 * Both evaluation modes - boolean fan-out (each option backs its own field)
 * and categorical (one shared field per group) - render as the same chip
 * control. The store's speciesPassesExtras helper picks the evaluation
 * mode by inspecting the group's config shape (see utils/dataHelpers.js).
 */
function MoreFiltersPanel({ config, breakdown, onClose }) {
  const {
    selectedSpeciesFilters,
    toggleSpeciesFilter,
  } = useFilterStore();

  const allGroups = config.speciesFilters || [];
  const groups = allGroups.filter(g => !g.alwaysVisible);
  if (groups.length === 0) return null;

  // groupBySection is generic - it treats each item as "give me a section
  // string, fall back to the item's title". It was originally written for
  // filterHierarchy levels; the returned `.levels` array here is really
  // "groups in this section".
  const sections = groupBySection(groups);

  return (
    <div className="more-filters-panel" role="region" aria-label="Additional filters">
      {onClose && (
        <button
          type="button"
          className="more-filters-close"
          onClick={onClose}
          aria-label="Close filters"
        >
          ×
        </button>
      )}
      <div className="more-filters-body">
        {sections.map(section => (
          <FilterSection key={section.title} title={section.title}>
            {section.levels.flatMap(group =>
              group.options.map(opt => {
                const id = `${group.id}:${opt.id}`;
                const count = breakdown?.get(group.id)?.counts.get(opt.id);
                return (
                  <FilterChip
                    key={id}
                    id={id}
                    label={opt.label || opt.id}
                    tooltip={opt.tooltip}
                    count={count}
                    active={selectedSpeciesFilters.has(id)}
                    onToggle={toggleSpeciesFilter}
                  />
                );
              })
            )}
          </FilterSection>
        ))}
      </div>
    </div>
  );
}

function FilterSection({ title, children }) {
  return (
    <div className="more-filters-group">
      <div className="more-filters-group-title">{title}</div>
      <div className="more-filters-chips">{children}</div>
    </div>
  );
}

function FilterChip({ id, label, tooltip, count, active, onToggle }) {
  return (
    <button
      type="button"
      className={`more-filters-chip${active ? ' active' : ''}`}
      onClick={() => onToggle(id)}
      aria-pressed={active}
      title={tooltip}
    >
      <span className="more-filters-chip-label">{label}</span>
      {typeof count === 'number' && (
        <span className="more-filters-chip-count">{count}</span>
      )}
    </button>
  );
}

export default MoreFiltersPanel;