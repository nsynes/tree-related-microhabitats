import React from 'react';
import useFilterStore from '../store/useFilterStore';
import { getFilterLabel as resolveFilterLabel } from '../utils/dataHelpers';

function FilterPanel({ config }) {
  const {
    level1Filters,
    level2Filters,
    level3Filters,
    toggleFilter,
    toggleGroup,
    isGroupSelected,
    isGroupIndeterminate,
    clearFilters,
    getTotalFiltersCount
  } = useFilterStore();

  const totalFilters = getTotalFiltersCount();

  const getFilterLabel = (filterId) => resolveFilterLabel(config, filterId);

  return (
    <div className="panel filter-panel">
      <div className="panel-title">
        <span>Habitat Features</span>
        {totalFilters > 0 && (
          <button 
            onClick={clearFilters}
            className="clear-filters-btn"
          >
            Clear All ({totalFilters})
          </button>
        )}
      </div>

      {/* Active Filters Summary - Always visible */}
      <div className="active-filters-summary">
        <div className="active-filters-title">📍 Active Filters:</div>
        
        {/* Level 1: Woodland Type */}
        <div className="filter-summary-row">
          <span className="filter-summary-label">Woodland Type:</span>
          {level1Filters.size === 0 ? (
            <span className="filter-summary-all">ALL</span>
          ) : (
            <div className="filter-chips">
              {Array.from(level1Filters).map((filterId, index, array) => (
                <React.Fragment key={filterId}>
                  <button
                    className="filter-chip"
                    onClick={() => toggleFilter(filterId, 1)}
                    title="Click to remove"
                  >
                    {getFilterLabel(filterId)}
                    <span className="chip-remove">×</span>
                  </button>
                  {index < array.length - 1 && <span className="logic-operator">OR</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        <div className="logic-separator">AND</div>

        {/* Level 2: Tree Characteristics (combined, not by subcategory) */}
        <div className="filter-summary-row">
          <span className="filter-summary-label">Tree Characteristics:</span>
          {level2Filters.size === 0 ? (
            <span className="filter-summary-all">ALL</span>
          ) : (
            <div className="filter-chips">
              {Array.from(level2Filters).map((filterId, index, array) => (
                <React.Fragment key={filterId}>
                  <button
                    className="filter-chip"
                    onClick={() => toggleFilter(filterId, 2)}
                    title="Click to remove"
                  >
                    {getFilterLabel(filterId)}
                    <span className="chip-remove">×</span>
                  </button>
                  {index < array.length - 1 && <span className="logic-operator">OR</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        <div className="logic-separator">AND</div>

        {/* Level 3: Microhabitats */}
        <div className="filter-summary-row">
          <span className="filter-summary-label">Microhabitats:</span>
          {level3Filters.size === 0 ? (
            <span className="filter-summary-all">ALL</span>
          ) : (
            <div className="filter-chips">
              {Array.from(level3Filters).slice(0, 8).map((filterId, index, array) => (
                <React.Fragment key={filterId}>
                  <button
                    className="filter-chip"
                    onClick={() => toggleFilter(filterId, 3)}
                    title="Click to remove"
                  >
                    {getFilterLabel(filterId)}
                    <span className="chip-remove">×</span>
                  </button>
                  {index < array.length - 1 && <span className="logic-operator">OR</span>}
                </React.Fragment>
              ))}
              {level3Filters.size > 8 && (
                <>
                  <span className="logic-operator">OR</span>
                  <span className="filter-chips-more" title={`And ${level3Filters.size - 8} more...`}>
                    +{level3Filters.size - 8} more
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="filter-groups">
        {config.filterHierarchy.map(hierarchyLevel => (
          <div key={hierarchyLevel.id} className="hierarchy-level">
            <h2 className="hierarchy-level-title">{hierarchyLevel.title}</h2>
            <p className="hierarchy-level-description">{hierarchyLevel.description}</p>

            {/* Level 1: Simple filter list */}
            {hierarchyLevel.level === 1 && (
              <div className="filter-options-row">
                {hierarchyLevel.filters.map(filter => (
                  <label key={filter.id} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={level1Filters.has(filter.id)}
                      onChange={() => toggleFilter(filter.id, 1)}
                    />
                    <span>{filter.label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Level 2: Categories with filters */}
            {hierarchyLevel.level === 2 && (
              <div className="filter-categories">
                {hierarchyLevel.categories.map((category, catIndex) => (
                  <div key={catIndex} className="filter-category">
                    <div className="filter-category-title">{category.title}</div>
                    <div className="filter-options">
                      {category.filters.map(filter => (
                        <label key={filter.id} className="filter-checkbox">
                          <input
                            type="checkbox"
                            checked={level2Filters.has(filter.id)}
                            onChange={() => toggleFilter(filter.id, 2)}
                          />
                          <span>{filter.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Level 3: Groups with categories and filters */}
            {hierarchyLevel.level === 3 && (
              <div className="microhabitat-groups">
                {hierarchyLevel.groups.map(group => (
                  <div key={group.id} className="filter-group">
                    {/* Group-level "select all" checkbox */}
                    <label className="filter-group-checkbox">
                      <input
                        type="checkbox"
                        checked={isGroupSelected(group.id, config)}
                        ref={(el) => {
                          if (el) el.indeterminate = isGroupIndeterminate(group.id, config);
                        }}
                        onChange={() => toggleGroup(group.id, config)}
                      />
                      <h3 className="filter-group-title">{group.title}</h3>
                    </label>

                    {group.description && (
                      <p className="filter-group-description">{group.description}</p>
                    )}

                    <div className="filter-categories">
                      {group.categories.map((category, catIndex) => (
                        <div key={catIndex} className="filter-category">
                          <div className="filter-category-title">{category.title}</div>
                          <div className="filter-options">
                            {category.filters.map(filter => (
                              <label key={filter.id} className="filter-checkbox">
                                <input
                                  type="checkbox"
                                  checked={level3Filters.has(filter.id)}
                                  onChange={() => toggleFilter(filter.id, 3)}
                                />
                                <span>{filter.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FilterPanel;