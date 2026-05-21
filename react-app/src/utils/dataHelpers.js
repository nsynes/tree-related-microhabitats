/**
 * Utility helpers shared across the species explorer UI.
 *
 * Level shapes
 * ------------
 * A "level" in config.filterHierarchy has one of three shapes, identified by
 * which key is present on the level object:
 *
 *   shape          present key      data layout
 *   ----------     ----------       -----------------------------------------
 *   'flat'         filters          level.filters[]
 *   'categories'   categories       level.categories[].filters[]
 *   'groups'       groups           level.groups[].categories[].filters[]
 *
 * Everywhere that needs to walk filters generically uses iterLevelFilters().
 * Code that branches on layout — e.g. how to render the filter tree — uses
 * levelShape() and dispatches on the returned string.
 */

/**
 * Checks if a value is valid data (not nan, null, undefined, or empty).
 */
export function isValidData(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === '' || trimmed === 'nan' || trimmed === 'null'
        || trimmed === 'undefined' || trimmed === 'none') {
      return false;
    }
  }
  if (typeof value === 'number' && isNaN(value)) {
    return false;
  }
  return true;
}

export function getDisplayValue(value) {
  return isValidData(value) ? value : null;
}

/**
 * Identifies which of the three layouts a hierarchy level uses.
 */
export function levelShape(levelObj) {
  if (!levelObj) return null;
  if (levelObj.filters) return 'flat';
  if (levelObj.categories) return 'categories';
  if (levelObj.groups) return 'groups';
  return null;
}

/**
 * Yields every filter dict in a level, regardless of its shape.
 * Mirrors the Python iter_level_filters in scripts/process-data.py.
 */
export function* iterLevelFilters(levelObj) {
  const shape = levelShape(levelObj);
  if (shape === 'flat') {
    for (const f of levelObj.filters) yield f;
  } else if (shape === 'categories') {
    for (const cat of levelObj.categories) {
      for (const f of cat.filters || []) yield f;
    }
  } else if (shape === 'groups') {
    for (const group of levelObj.groups) {
      for (const cat of group.categories || []) {
        for (const f of cat.filters || []) yield f;
      }
    }
  }
}

/**
 * Resolves a habitat filter ID to its display label.
 */
export function getFilterLabel(config, filterId) {
  for (const level of config.filterHierarchy) {
    for (const f of iterLevelFilters(level)) {
      if (f.id === filterId) return f.label;
    }
  }
  return filterId;
}

/**
 * Finds the first level whose shape is 'groups'. Returns the level object
 * (with its .level number, .groups, etc.) or null if no groups-shape level
 * exists. Used by the group-checkbox helpers.
 */
export function findGroupsLevel(config) {
  if (!config?.filterHierarchy) return null;
  for (const level of config.filterHierarchy) {
    if (levelShape(level) === 'groups') return level;
  }
  return null;
}

/**
 * Returns the array of filter IDs belonging to a group inside the
 * groups-shape level.
 */
export function getGroupFilterIds(config, groupId) {
  const level = findGroupsLevel(config);
  if (!level) return [];
  const group = level.groups.find(g => g.id === groupId);
  if (!group) return [];
  const ids = [];
  for (const category of group.categories || []) {
    for (const f of category.filters || []) ids.push(f.id);
  }
  return ids;
}

/**
 * Buckets a species' habitat IDs by hierarchy level. Returns an object keyed
 * by numeric level: { 1: [{id, label}, ...], 2: [...], ... }. Entry shape
 * carries extra context for category-shape and group-shape levels so the
 * detail modal can group its rendering.
 *
 *   flat level:        { id, label }
 *   categories level:  { id, label, categoryTitle }
 *   groups level:      { id, label, groupTitle, categoryTitle }
 */
export function groupHabitatsByLevel(config, habitatIds) {
  const ids = new Set(habitatIds);
  const result = {};

  for (const level of config.filterHierarchy) {
    const entries = [];
    const shape = levelShape(level);
    if (shape === 'flat') {
      for (const f of level.filters) {
        if (ids.has(f.id)) entries.push({ id: f.id, label: f.label });
      }
    } else if (shape === 'categories') {
      for (const cat of level.categories) {
        for (const f of cat.filters || []) {
          if (ids.has(f.id)) {
            entries.push({ id: f.id, label: f.label, categoryTitle: cat.title });
          }
        }
      }
    } else if (shape === 'groups') {
      for (const group of level.groups) {
        for (const cat of group.categories || []) {
          for (const f of cat.filters || []) {
            if (ids.has(f.id)) {
              entries.push({
                id: f.id,
                label: f.label,
                groupTitle: group.title,
                categoryTitle: cat.title,
              });
            }
          }
        }
      }
    }
    result[level.level] = entries;
  }
  return result;
}