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
 * Returns true if a single species matches a single speciesFilters option.
 * Evaluation mode is inferred from the group's shape:
 *   - group.field present → categorical (species[group.field] === opt.id)
 *   - else → boolean fan-out (species[opt.field] truthy)
 */
export function speciesMatchesFilterOption(species, group, opt) {
  if (group.field) {
    return species[group.field] === opt.id;
  }
  return Boolean(opt.field && species[opt.field]);
}

/**
 * Right-panel chip predicate. Driven entirely by
 * config.speciesFilters — no hardcoded knowledge of which fields exist or
 * which group is "priority" vs "iucn". OR within each group, AND between
 * groups; empty groups pass.
 *
 * The extraFilters Set holds composite IDs of the form `${groupId}:${optionId}`.
 *
 * A group's evaluation mode is implicit in its config shape:
 *   - If the group has a top-level `field`, options match against
 *     species[group.field] === option.id (categorical).
 *   - Otherwise each option has its own `field`, and a species passes when
 *     species[option.field] is truthy (boolean fan-out).
 */
export function speciesPassesExtras(species, selectedSpeciesFilters, speciesFilters) {
  if (!selectedSpeciesFilters || selectedSpeciesFilters.size === 0) return true;
  if (!speciesFilters) return true;

  for (const group of speciesFilters) {
    const prefix = `${group.id}:`;
    const selectedOptions = [];
    for (const id of selectedSpeciesFilters) {
      if (id.startsWith(prefix)) {
        const optId = id.slice(prefix.length);
        const opt = group.options.find(o => o.id === optId);
        if (opt) selectedOptions.push(opt);
      }
    }
    if (selectedOptions.length === 0) continue;
    // OR within group: any matching option means the species passes this group
    if (!selectedOptions.some(opt => speciesMatchesFilterOption(species, group, opt))) {
      return false;
    }
  }
  return true;
}

/**
 * Walks config.speciesFilters and yields one entry per applicable status on
 * the species, in config order. Entry shape:
 *
 *   { groupId, group, opt, label, longLabel, shortLabel }
 *
 *   label      — the canonical option label (opt.label || opt.id)
 *   longLabel  — group.statusFormat applied to label (or label if no format),
 *                matches the modal's Conservation Status string
 *   shortLabel — group.badgeFormat applied to (opt.shortLabel || opt.label
 *                || opt.id), suitable for compact badges
 *
 * Skips groups flagged alwaysVisible (taxa today — those are shown elsewhere).
 */
export function* iterConservationStatuses(config, species) {
  if (!species || !config?.speciesFilters) return;
  const applyFormat = (tmpl, label) =>
    tmpl ? tmpl.replace('{label}', label) : label;
  for (const group of config.speciesFilters) {
    if (group.alwaysVisible) continue;
    if (group.field) {
      const val = species[group.field];
      if (!val) continue;
      const opt = group.options.find(o => o.id === val);
      const label = opt ? (opt.label || opt.id) : val;
      const short = opt ? (opt.shortLabel || opt.label || opt.id) : val;
      yield {
        groupId: group.id,
        group,
        opt,
        label,
        longLabel: applyFormat(group.statusFormat, label),
        shortLabel: applyFormat(group.badgeFormat, short),
      };
    } else {
      for (const opt of group.options) {
        if (!opt.field || !species[opt.field]) continue;
        const label = opt.label || opt.id;
        const short = opt.shortLabel || opt.label || opt.id;
        yield {
          groupId: group.id,
          group,
          opt,
          label,
          longLabel: applyFormat(group.statusFormat, label),
          shortLabel: applyFormat(group.badgeFormat, short),
        };
      }
    }
  }
}

/**
 * Comparator factory for sorting species by IUCN severity. Severity order
 * comes from the position of each code in config.speciesFilters' iucn group
 * options — no separate constant needed, the config is authoritative (RE
 * first, DD last). Species without an iucnStatus sort to the end. Ties
 * break by scientificName ascending.
 */
export function compareByIucnSeverity(config) {
  const iucnGroup = config?.speciesFilters?.find(g => g.id === 'iucn');
  const order = new Map();
  if (iucnGroup) {
    iucnGroup.options.forEach((opt, i) => order.set(opt.id, i));
  }
  const rankOf = (s) => {
    const code = iucnGroup?.field ? s[iucnGroup.field] : null;
    const r = order.get(code);
    return r === undefined ? Number.MAX_SAFE_INTEGER : r;
  };
  return (a, b) => {
    const ra = rankOf(a);
    const rb = rankOf(b);
    if (ra !== rb) return ra - rb;
    return (a.scientificName || '').localeCompare(b.scientificName || '');
  };
}

export function compareByName(a, b) {
  return (a.scientificName || '').localeCompare(b.scientificName || '');
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