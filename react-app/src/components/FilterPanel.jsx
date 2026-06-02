import React, { Fragment } from 'react';
import useFilterStore from '../store/useFilterStore';
import {
  getFilterLabel as resolveFilterLabel,
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

      {/* Active Filters Summary - one row per hierarchy level */}
      <div className="active-filters-summary">
        <div className="active-filters-label" aria-hidden="true">
          <span>Active Filters</span>
        </div>
        <div className="active-filters-body">
          {config.filterHierarchy.map((level, idx) => (
            <Fragment key={level.level}>
              <FilterSummaryRow
                level={level}
                selectedFilterIds={selectedFilterIds}
                getFilterLabel={getFilterLabel}
              />
              {idx < config.filterHierarchy.length - 1 && (
                <div className="logic-separator">AND</div>
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Filter tree - one block per hierarchy level */}
      <div className="filter-groups">
        {config.filterHierarchy.map(level => (
          <div key={level.id} className="hierarchy-level">
            <h2 className="hierarchy-level-title">{level.title}</h2>
            {level.description && (
              <p className="hierarchy-level-description">{level.description}</p>
            )}
            <HierarchyLevel level={level} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * One row of the Active Filters strip. For flat / categories shapes we list
 * each selected filter as a chip. For the groups shape we summarise each
 * group with the count-pill pattern: bare title when fully selected,
 * "Group (N)" when partially selected.
 */
function FilterSummaryRow({ level, selectedFilterIds, getFilterLabel }) {
  const shape = levelShape(level);
  // Collect this level's selected filter IDs in hierarchy order.
  const selected = [];
  for (const f of iterLevelFilters(level)) {
    if (selectedFilterIds.has(f.id)) selected.push(f.id);
  }
  const summaryLabel = level.title.replace(/^\d+\.\s*/, '');

  return (
    <div className="filter-summary-row">
      <span className="filter-summary-label">{summaryLabel}:</span>
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
  // suppress unused-prop warning — selectedFilterIds is read indirectly via the store
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
 * shape — flat / categories / groups — and renders the appropriate markup.
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