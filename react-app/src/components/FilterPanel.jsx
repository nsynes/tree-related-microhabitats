import React, { Fragment } from 'react';
import useFilterStore from '../store/useFilterStore';
import {
  getFilterLabel as resolveFilterLabel,
  groupBySection,
  iterLevelFilters,
  levelShape,
} from '../utils/dataHelpers';

/**
 * FilterPanel renders the habitat filters on the left side of the app.
 *
 * Both the Active Filters summary and the filter tree are driven by
 * config.filterHierarchy. Adding or reordering hierarchy levels in
 * data/column-mapping.json requires no changes here; the components
 * dispatch on each level's shape ('flat' | 'categories' | 'groups').
 */
function FilterPanel({ config }) {
  const {
    selectedFilterIds,
    toggleFilter,
    clearFilters,
    getTotalFiltersCount,
  } = useFilterStore();

  const totalFilters = getTotalFiltersCount();
  const getFilterLabel = (filterId) => resolveFilterLabel(config, filterId);

  return (
    <div className="panel filter-panel">
      <div className="panel-title">
        <span className="panel-title-text">Habitat Features</span>
        {totalFilters > 0 && (
          <button onClick={clearFilters} className="clear-filters-btn">
            Clear All ({totalFilters})
          </button>
        )}
      </div>

      {/* Active Filters Summary - grouped by the same sections as the
          filter panel below. Level rows with no selections are hidden;
          sections whose levels are all empty are hidden entirely; when
          no filter is set anywhere, a single "No filters applied"
          placeholder replaces the block. Each section renders its
          title in a left column with the level rows on the right; the
          AND separator sits between visible sections. */}
      <div className="active-filters-summary">
        <div className="active-filters-label" aria-hidden="true">
          <span>Active Filters</span>
        </div>
        <div className="active-filters-body">
          <ActiveFiltersBody
            config={config}
            selectedFilterIds={selectedFilterIds}
            getFilterLabel={getFilterLabel}
          />
        </div>
      </div>

      {/* Filter tree - levels grouped into visual sections by the
          optional `section` field on each level. Section grouping is
          presentation-only: filter/logic behaviour is per-level as
          before (OR within, AND between). Consecutive levels sharing
          a section title collapse under one <h2>; levels without a
          section fall back to their own title acting as the section
          title (so any legacy config still renders sensibly). */}
      <div className="filter-groups">
        {groupBySection(config.filterHierarchy).map(section => (
          <div key={section.title} className="filter-section">
            <h2 className="filter-section-title">{section.title}</h2>
            <div className="filter-section-levels">
              {section.levels.map(level => (
                <div key={level.id} className="hierarchy-level">
                  {section.levels.length > 1 && level.title && (
                    <h3 className="hierarchy-level-title">{level.title}</h3>
                  )}
                  {level.description && (
                    <p className="hierarchy-level-description">
                      {level.description}
                      {level.descriptionLink && (
                        <>
                          {' '}
                          <a
                            href={level.descriptionLink.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {level.descriptionLink.label}&nbsp;↗
                          </a>
                        </>
                      )}
                    </p>
                  )}
                  <HierarchyLevel level={level} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Active Filters body. Computes which sections/levels have any
 * selections and renders only those. Empty everywhere → placeholder.
 * A level has a selection when at least one of its filters is in
 * selectedFilterIds - checked via the shape-agnostic iterLevelFilters.
 */
function ActiveFiltersBody({ config, selectedFilterIds, getFilterLabel }) {
  const activeSections = [];
  for (const section of groupBySection(config.filterHierarchy)) {
    const activeLevels = section.levels.filter(level => {
      for (const f of iterLevelFilters(level)) {
        if (selectedFilterIds.has(f.id)) return true;
      }
      return false;
    });
    if (activeLevels.length > 0) {
      activeSections.push({
        title: section.title,
        levels: activeLevels,
        // Keep the ORIGINAL level count so per-row-label suppression only
        // fires for sections that are intrinsically single-level
        // (Tree-related Microhabitats). A multi-level section with only
        // one level currently active still needs its row label so the
        // user knows *which* of Location / Woodland Type / Tree Type
        // has the selection.
        totalLevels: section.levels.length,
      });
    }
  }

  if (activeSections.length === 0) {
    return <div className="active-filters-empty">No filters applied</div>;
  }

  // Flatten sections into a single list of body children so every AND
  // separator (whether between two levels of the same section, or
  // between two sections) is a direct child of .active-filters-body.
  // That way every separator gets the same full-body width and
  // centers at the same horizontal position. The section title only
  // renders on the first level row of its section; subsequent level
  // rows leave the label column empty so alignment is preserved.
  const items = [];
  activeSections.forEach((section, sIdx) => {
    const suppressRowLabel = section.totalLevels === 1;
    section.levels.forEach((level, lIdx) => {
      if (lIdx > 0) {
        items.push({ type: 'sep', key: `and-${sIdx}-${lIdx}` });
      }
      items.push({
        type: 'row',
        key: `row-${sIdx}-${lIdx}`,
        sectionTitle: lIdx === 0 ? section.title : '',
        level,
        hideRowLabel: suppressRowLabel,
      });
    });
    if (sIdx < activeSections.length - 1) {
      items.push({ type: 'sep', key: `end-${sIdx}` });
    }
  });

  return items.map(item =>
    item.type === 'sep' ? (
      <div key={item.key} className="logic-separator">AND</div>
    ) : (
      <div key={item.key} className="active-filters-section">
        <div className="active-filters-section-label">{item.sectionTitle}</div>
        <FilterSummaryRow
          level={item.level}
          selectedFilterIds={selectedFilterIds}
          getFilterLabel={getFilterLabel}
          hideLabel={item.hideRowLabel}
        />
      </div>
    )
  );
}

/**
 * One row of the Active Filters strip. For flat / categories shapes we list
 * each selected filter as a chip. For the groups shape we summarise each
 * group with the count-pill pattern: bare title when fully selected,
 * "Group (N)" when partially selected.
 */
function FilterSummaryRow({ level, selectedFilterIds, getFilterLabel, hideLabel = false }) {
  const shape = levelShape(level);
  // Collect this level's selected filter IDs in hierarchy order.
  const selected = [];
  for (const f of iterLevelFilters(level)) {
    if (selectedFilterIds.has(f.id)) selected.push(f.id);
  }
  const summaryLabel = level.title.replace(/^\d+\.\s*/, '');

  return (
    <div className="filter-summary-row">
      {!hideLabel && (
        <span className="filter-summary-label">{summaryLabel}:</span>
      )}
      {selected.length === 0 ? (
        <span className="filter-summary-all">ALL</span>
      ) : shape === 'groups' ? (
        <GroupChipsSummary level={level} selectedFilterIds={selectedFilterIds} />
      ) : (
        <FlatChipsSummary
          ids={selected}
          getFilterLabel={getFilterLabel}
        />
      )}
    </div>
  );
}

function FlatChipsSummary({ ids, getFilterLabel }) {
  const { toggleFilter } = useFilterStore();
  return (
    <div className="filter-chips">
      {ids.map(filterId => (
        <button
          key={filterId}
          className="filter-chip"
          onClick={() => toggleFilter(filterId)}
          title="Click to remove"
        >
          {getFilterLabel(filterId)}
          <span className="chip-remove">×</span>
        </button>
      ))}
    </div>
  );
}

function GroupChipsSummary({ level, selectedFilterIds }) {
  const { isGroupSelected, countGroupSelected, clearGroup } = useFilterStore();
  const chips = [];
  for (const group of level.groups) {
    const count = countGroupSelected(group.id);
    if (count === 0) continue;
    chips.push({
      id: group.id,
      label: group.title,
      count,
      full: isGroupSelected(group.id),
    });
  }
  // suppress unused-prop warning - selectedFilterIds is read indirectly via the store
  void selectedFilterIds;

  return (
    <div className="filter-chips">
      {chips.map(chip => (
        <button
          key={chip.id}
          className={`filter-chip${chip.full ? ' filter-chip--group' : ''}`}
          onClick={() => clearGroup(chip.id)}
          title={
            chip.full
              ? 'Click to remove whole group'
              : `Click to remove all ${chip.count} filters in ${chip.label}`
          }
        >
          {chip.label}
          {!chip.full && <span className="chip-count">({chip.count})</span>}
          <span className="chip-remove">×</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Renders the filter tree for one hierarchy level. Dispatches on the level's
 * shape - flat / categories / groups - and renders the appropriate markup.
 */
function HierarchyLevel({ level }) {
  const shape = levelShape(level);
  if (shape === 'flat') return <FlatLevel level={level} />;
  if (shape === 'categories') return <CategoriesLevel level={level} />;
  if (shape === 'groups') return <GroupsLevel level={level} />;
  return null;
}

function FlatLevel({ level }) {
  const { selectedFilterIds, toggleFilter } = useFilterStore();
  return (
    <div className="filter-options-row">
      {level.filters.map(filter => (
        <label key={filter.id} className="filter-checkbox">
          <input
            type="checkbox"
            checked={selectedFilterIds.has(filter.id)}
            onChange={() => toggleFilter(filter.id)}
          />
          <span>{filter.label}</span>
        </label>
      ))}
    </div>
  );
}

function CategoriesLevel({ level }) {
  const { selectedFilterIds, toggleFilter } = useFilterStore();
  return (
    <div className="filter-categories">
      {level.categories.map((category, catIndex) => (
        <div key={catIndex} className="filter-category">
          {level.categories.length > 1 && (
            <div className="filter-category-title">{category.title}</div>
          )}
          <div className="filter-options">
            {category.filters.map(filter => (
              <label key={filter.id} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={selectedFilterIds.has(filter.id)}
                  onChange={() => toggleFilter(filter.id)}
                />
                <span>{filter.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupsLevel({ level }) {
  const {
    selectedFilterIds, toggleFilter,
    toggleGroup, isGroupSelected, isGroupIndeterminate,
  } = useFilterStore();

  return (
    <div className="microhabitat-groups">
      {level.groups.map(group => {
        const groupFullySelected = isGroupSelected(group.id);
        return (
          <div key={group.id} className="filter-group">
            <label className="filter-group-checkbox">
              <input
                type="checkbox"
                checked={groupFullySelected}
                ref={(el) => { if (el) el.indeterminate = isGroupIndeterminate(group.id); }}
                onChange={() => toggleGroup(group.id)}
              />
              <h3 className="filter-group-title">{group.title}</h3>
            </label>

            {group.description && (
              <p className="filter-group-description">{group.description}</p>
            )}

            <div className="filter-categories">
              {group.categories.map((category, catIndex) => (
                <div key={catIndex} className="filter-category">
                  {group.categories.length > 1 && (
                    <div className="filter-category-title">{category.title}</div>
                  )}
                  <div className="filter-options">
                    {category.filters.map(filter => (
                      <label
                        key={filter.id}
                        className={`filter-checkbox${groupFullySelected ? ' in-group' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFilterIds.has(filter.id)}
                          onChange={() => toggleFilter(filter.id)}
                        />
                        <span>{filter.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FilterPanel;