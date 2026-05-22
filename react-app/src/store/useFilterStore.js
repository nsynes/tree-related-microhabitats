import { create } from 'zustand';
import { iterLevelFilters, getGroupFilterIds, findGroupsLevel } from '../utils/dataHelpers';

/**
 * Filter store for the species explorer.
 *
 * State shape (normalised, level-agnostic):
 *   selectedFilterIds: Set<string>   every checked filter ID, across every level
 *   searchQuery:       string        free-text search against name fields
 *   classFilter:       string|null   selected class tab in the right panel
 *   species / filteredSpecies        full dataset and current filtered view
 *
 * Level structure lives in config.filterHierarchy and is consulted at filter
 * time. Adding/reordering hierarchy levels requires no changes to this store.
 *
 * Three level shapes are recognised (detected via dataHelpers.levelShape):
 *   - 'flat':       level.filters[]
 *   - 'categories': level.categories[].filters[]
 *   - 'groups':     level.groups[].categories[].filters[]
 *
 * Filter logic per filterSpecies():
 *   - OR within a level (a species needs to match at least one of that
 *     level's selected filter IDs).
 *   - AND between levels (a species must pass every level that has any
 *     selection).
 *   - Levels with zero selections pass everything.
 */

// Canonical ordering for taxonomic class tabs — matches the values present
// in the 'Taxa for filters' source column, listed roughly by record count so
// the dominant groups (insect orders, vertebrates) appear first.
const CLASS_ORDER = [
  'Coleoptera', 'Diptera', 'Lepidoptera', 'Other insect',
  'Vertebrate', 'Arachnid', 'Lichen',
  'Mollusc', 'Millipede', 'Fungi', 'Bryophyte',
];

const normaliseClass = (cls) => cls || '';

// Build a per-level array of selected ids: [{level, ids: [...]}, ...]
// Used by filterSpecies and the chip-summary logic.
function selectedByLevel(config, selectedFilterIds) {
  if (!config?.filterHierarchy) return [];
  return config.filterHierarchy.map(levelObj => {
    const ids = [];
    for (const filter of iterLevelFilters(levelObj)) {
      if (selectedFilterIds.has(filter.id)) ids.push(filter.id);
    }
    return { level: levelObj.level, ids };
  });
}

const useFilterStore = create((set, get) => ({
  // State
  selectedFilterIds: new Set(),
  searchQuery: '',
  classFilter: null,
  config: null,

  species: [],
  filteredSpecies: [],

  // Setup
  setConfig: (config) => {
    set({ config });
    get().filterSpecies();
  },

  setSpecies: (speciesData) => {
    set({ species: speciesData, filteredSpecies: speciesData });
  },

  // Filter actions — level-agnostic. The filter's ID is enough; its level is
  // looked up from config when filtering.
  toggleFilter: (filterId) => {
    const next = new Set(get().selectedFilterIds);
    if (next.has(filterId)) next.delete(filterId);
    else next.add(filterId);
    set({ selectedFilterIds: next });
    get().filterSpecies();
  },

  // Group-level helpers (Level 3 microhabitat groups today, generalisable
  // tomorrow if the groups-shape level ever lands at a different position).
  toggleGroup: (groupId) => {
    const { config, selectedFilterIds } = get();
    const ids = getGroupFilterIds(config, groupId);
    if (ids.length === 0) return;
    const next = new Set(selectedFilterIds);
    const allSelected = ids.every(id => selectedFilterIds.has(id));
    if (allSelected) ids.forEach(id => next.delete(id));
    else ids.forEach(id => next.add(id));
    set({ selectedFilterIds: next });
    get().filterSpecies();
  },

  clearGroup: (groupId) => {
    const { config, selectedFilterIds } = get();
    const ids = getGroupFilterIds(config, groupId);
    if (ids.length === 0) return;
    const next = new Set(selectedFilterIds);
    ids.forEach(id => next.delete(id));
    set({ selectedFilterIds: next });
    get().filterSpecies();
  },

  isGroupSelected: (groupId) => {
    const { config, selectedFilterIds } = get();
    const ids = getGroupFilterIds(config, groupId);
    return ids.length > 0 && ids.every(id => selectedFilterIds.has(id));
  },

  isGroupIndeterminate: (groupId) => {
    const { config, selectedFilterIds } = get();
    const ids = getGroupFilterIds(config, groupId);
    if (ids.length === 0) return false;
    const n = ids.filter(id => selectedFilterIds.has(id)).length;
    return n > 0 && n < ids.length;
  },

  countGroupSelected: (groupId) => {
    const { config, selectedFilterIds } = get();
    return getGroupFilterIds(config, groupId).filter(id => selectedFilterIds.has(id)).length;
  },

  // Right-panel narrowing
  setSearchQuery: (q) => {
    set({ searchQuery: q });
    get().filterSpecies();
  },

  setClassFilter: (cls) => {
    set({ classFilter: cls });
    get().filterSpecies();
  },

  // Scoped to the habitat panel's Clear All button — search and class have
  // their own inline clears in the species panel.
  clearFilters: () => {
    set({ selectedFilterIds: new Set() });
    get().filterSpecies();
  },

  // Core filtering — applies OR-within-level / AND-between-levels via config.
  filterSpecies: () => {
    const { selectedFilterIds, searchQuery, classFilter, config, species } = get();
    const q = searchQuery.trim().toLowerCase();
    const hasHabitatFilters = selectedFilterIds.size > 0;

    if (!hasHabitatFilters && q === '' && classFilter === null) {
      set({ filteredSpecies: species });
      return;
    }

    // Pre-bucket the selected IDs per level so the per-species loop doesn't
    // re-walk the config each time.
    const buckets = config ? selectedByLevel(config, selectedFilterIds) : [];

    const filtered = species.filter(s => {
      for (const { ids } of buckets) {
        if (ids.length === 0) continue;
        if (!s.habitats.some(h => ids.includes(h))) return false;
      }
      if (q !== '') {
        const sci = s.scientificName && s.scientificName.toLowerCase().includes(q);
        const com = s.commonName && s.commonName.toLowerCase().includes(q);
        if (!sci && !com) return false;
      }
      if (classFilter !== null && normaliseClass(s.class) !== classFilter) {
        return false;
      }
      return true;
    });

    set({ filteredSpecies: filtered });
  },

  // Total selected count for the Clear All (N) button.
  getTotalFiltersCount: () => get().selectedFilterIds.size,

  // Class tab breakdown — counts ignore the active classFilter so users see
  // "what would I get if I switched tabs", not "everything except current = 0".
  classBreakdown: () => {
    const { selectedFilterIds, searchQuery, config, species } = get();
    const q = searchQuery.trim().toLowerCase();
    const buckets = config ? selectedByLevel(config, selectedFilterIds) : [];

    const counts = new Map();
    let total = 0;

    for (const s of species) {
      let pass = true;
      for (const { ids } of buckets) {
        if (ids.length === 0) continue;
        if (!s.habitats.some(h => ids.includes(h))) { pass = false; break; }
      }
      if (!pass) continue;
      if (q !== '') {
        const sci = s.scientificName && s.scientificName.toLowerCase().includes(q);
        const com = s.commonName && s.commonName.toLowerCase().includes(q);
        if (!sci && !com) continue;
      }
      total += 1;
      const cls = normaliseClass(s.class);
      if (!cls) continue;
      counts.set(cls, (counts.get(cls) || 0) + 1);
    }

    const ordered = [];
    for (const cls of CLASS_ORDER) {
      const count = counts.get(cls);
      if (count) ordered.push({ class: cls, count });
    }
    for (const [cls, count] of counts) {
      if (!CLASS_ORDER.includes(cls)) ordered.push({ class: cls, count });
    }
    return { total, classes: ordered };
  },
}));

// Re-export for components that read this from the store namespace.
export { findGroupsLevel };

export default useFilterStore;