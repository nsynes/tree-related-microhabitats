/**
 * Utility functions for handling data display
 */

/**
 * Checks if a value is valid data (not nan, null, undefined, or empty)
 * @param {*} value - The value to check
 * @returns {boolean} - True if the value is valid displayable data
 */
export function isValidData(value) {
  if (value === null || value === undefined) {
    return false;
  }
  
  // Check for string representations of missing data
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === '' || trimmed === 'nan' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'none') {
      return false;
    }
  }
  
  // Check for NaN number
  if (typeof value === 'number' && isNaN(value)) {
    return false;
  }
  
  return true;
}

/**
 * Gets a displayable value or returns null if invalid
 * @param {*} value - The value to process
 * @returns {*} - The value if valid, null otherwise
 */
export function getDisplayValue(value) {
  return isValidData(value) ? value : null;
}

/**
 * Resolves a habitat filter ID to its display label using the filter hierarchy.
 */
export function getFilterLabel(config, filterId) {
  for (const level of config.filterHierarchy) {
    if (level.filters) {
      const filter = level.filters.find(f => f.id === filterId);
      if (filter) return filter.label;
    }
    if (level.categories) {
      for (const category of level.categories) {
        const filter = category.filters.find(f => f.id === filterId);
        if (filter) return filter.label;
      }
    }
    if (level.groups) {
      for (const group of level.groups) {
        for (const category of group.categories) {
          const filter = category.filters.find(f => f.id === filterId);
          if (filter) return filter.label;
        }
      }
    }
  }
  return filterId;
}

/**
 * Buckets a species' habitat IDs into the three hierarchy levels so the detail
 * view can display them grouped. Returns { level1: [{id,label}], level2: [...],
 * level3: [{groupTitle, categoryTitle, label, id}] } with missing IDs skipped.
 */
export function groupHabitatsByLevel(config, habitatIds) {
  const ids = new Set(habitatIds);
  const result = { level1: [], level2: [], level3: [] };

  for (const level of config.filterHierarchy) {
    if (level.level === 1 && level.filters) {
      for (const f of level.filters) {
        if (ids.has(f.id)) result.level1.push({ id: f.id, label: f.label });
      }
    } else if (level.level === 2 && level.categories) {
      for (const category of level.categories) {
        for (const f of category.filters) {
          if (ids.has(f.id)) {
            result.level2.push({ id: f.id, label: f.label, categoryTitle: category.title });
          }
        }
      }
    } else if (level.level === 3 && level.groups) {
      for (const group of level.groups) {
        for (const category of group.categories) {
          for (const f of category.filters) {
            if (ids.has(f.id)) {
              result.level3.push({
                id: f.id,
                label: f.label,
                groupTitle: group.title,
                categoryTitle: category.title,
              });
            }
          }
        }
      }
    }
  }
  return result;
}