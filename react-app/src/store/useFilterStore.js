import { create } from 'zustand';
import {
  iterLevelFilters,
  getGroupFilterIds,
  findGroupsLevel,
  speciesPassesExtras,
  speciesMatchesFilterOption,
} from '../utils/dataHelpers';

/**
 * Filter store for the species explorer.
 *
 * State (normalised, config-agnostic):
 *   selectedFilterIds:      Set<string>   habitat-filter IDs from the LEFT panel
 *   selectedSpeciesFilters: Set<string>   composite IDs from the RIGHT panel,
 *                                         e.g. 'class:Coleoptera', 'priority:england'
 *   searchQuery:            string        free-text search against name fields
 *   species / filteredSpecies              full dataset and the current filtered view
 *
 * The two filter Sets parallel each other:
 *   - config.filterHierarchy describes the LEFT panel filters.
 *   - config.speciesFilters describes the RIGHT panel filters (taxa, priority,
 *     EIF, IUCN status, …).
 *
 * Filter logic:
 *   - Habitat filters: OR within each hierarchy level, AND between levels.
 *   - Species filters: OR within each speciesFilters group, AND between groups.
 *   - Search applies on top of both.
 */

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
  selectedSpeciesFilters: new Set(),
  searchQuery: '',
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

  // Habitat filter actions — level-agnostic. The filter's ID is enough; its
  // level is looked up from config when filtering.
  toggleFilter: (filterId) => {
    const next = new Set(get().selectedFilterIds);
    if (next.has(filterId)) next.delete(filterId);
    else next.add(filterId);
    set({ selectedFilterIds: next });
    get().filterSpecies();
  },

  // Group-level helpers — operate on the (one) groups-shape level today.
  // They locate that level dynamically via findGroupsLevel so the same code
  // keeps working if the hierarchy ever reorders.
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

  // Species filters (right panel) — single Set keyed by composite
  // `${groupId}:${optionId}` IDs. Same shape as selectedFilterIds.
  toggleSpeciesFilter: (id) => {
    const next = new Set(get().selectedSpeciesFilters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selectedSpeciesFilters: next });
    get().filterSpecies();
  },

  // Clear every selected option in a single species-filter group. Used by the
  // "All" reset chip for the alwaysVisible taxa row, and the panel's Clear (N)
  // button can call this per group.
  clearSpeciesFilterGroup: (groupId) => {
    const prefix = `${groupId}:`;
    const next = new Set();
    for (const id of get().selectedSpeciesFilters) {
      if (!id.startsWith(prefix)) next.add(id);
    }
    set({ selectedSpeciesFilters: next });
    get().filterSpecies();
  },

  clearSpeciesFilters: () => {
    set({ selectedSpeciesFilters: new Set() });
    get().filterSpecies();
  },

  // Panel-wide Clear All for the right (species) panel: wipes every species
  // filter (taxa + the More filters chip groups) and resets the search query.
  // Mirrors the left panel's habitat Clear All in scope and placement.
  clearAllSpeciesFilters: () => {
    set({ selectedSpeciesFilters: new Set(), searchQuery: '' });
    get().filterSpecies();
  },

  // Clear selections for a specific set of groups (e.g. the hidden groups
  // from the More filters panel, so the panel's Clear button doesn't also
  // wipe taxa selections that live outside it).
  clearSpeciesFilterGroups: (groupIds) => {
    const prefixes = groupIds.map(g => `${g}:`);
    const next = new Set();
    for (const id of get().selectedSpeciesFilters) {
      if (!prefixes.some(p => id.startsWith(p))) next.add(id);
    }
    set({ selectedSpeciesFilters: next });
    get().filterSpecies();
  },

  getSpeciesFiltersCount: () => get().selectedSpeciesFilters.size,

  // Scoped to the habitat panel's Clear All button — search and the
  // species-filter chips have their own inline clears.
  clearFilters: () => {
    set({ selectedFilterIds: new Set() });
    get().filterSpecies();
  },

  // Core filtering — habitat-level guards (OR-within, AND-between), then
  // search, then species-filter chips (OR-within, AND-between).
  filterSpecies: () => {
    const { selectedFilterIds, searchQuery, selectedSpeciesFilters, config, species } = get();
    const q = searchQuery.trim().toLowerCase();
    const hasHabitatFilters = selectedFilterIds.size > 0;
    const hasSpeciesFilters = selectedSpeciesFilters.size > 0;

    if (!hasHabitatFilters && q === '' && !hasSpeciesFilters) {
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
      if (!speciesPassesExtras(s, selectedSpeciesFilters, config?.speciesFilters)) return false;
      return true;
    });

    set({ filteredSpecies: filtered });
  },

  // Total selected count for the habitat panel's Clear All (N) button.
  getTotalFiltersCount: () => get().selectedFilterIds.size,

  /**
   * Per-group chip count breakdown. Returns:
   *   Map<groupId, { total, counts: Map<optionId, count> }>
   *
   * For each option in a group, `count` is the number of species that would
   * remain if only that option were selected in this group — i.e. we ignore
   * this group's own current selections (so users see "what would I get if
   * I picked this") but apply every other filter normally.
   *
   * Computing once per render across all groups is O(species × Σoptions),
   * which is well under a millisecond for our dataset.
   */
  speciesFiltersBreakdown: () => {
    const { selectedFilterIds, searchQuery, selectedSpeciesFilters, config, species } = get();
    if (!config?.speciesFilters) return new Map();

    const q = searchQuery.trim().toLowerCase();
    const buckets = config ? selectedByLevel(config, selectedFilterIds) : [];

    // Pre-compute habitat + search passes since they're shared across groups.
    const habitatSearchPass = species.filter(s => {
      for (const { ids } of buckets) {
        if (ids.length === 0) continue;
        if (!s.habitats.some(h => ids.includes(h))) return false;
      }
      if (q !== '') {
        const sci = s.scientificName && s.scientificName.toLowerCase().includes(q);
        const com = s.commonName && s.commonName.toLowerCase().includes(q);
        if (!sci && !com) return false;
      }
      return true;
    });

    // For each group, build a Set of selectedSpeciesFilters that exclude
    // the group's own selections — used to evaluate "would this option pass
    // if I switched to it".
    const result = new Map();
    for (const group of config.speciesFilters) {
      const prefix = `${group.id}:`;
      const otherSelections = new Set();
      for (const id of selectedSpeciesFilters) {
        if (!id.startsWith(prefix)) otherSelections.add(id);
      }

      // Base set = habitat+search pass, AND extras except this group
      const baseSet = habitatSearchPass.filter(s =>
        speciesPassesExtras(s, otherSelections, config.speciesFilters)
      );

      const counts = new Map();
      for (const opt of group.options) {
        let n = 0;
        for (const s of baseSet) {
          if (speciesMatchesFilterOption(s, group, opt)) n += 1;
        }
        counts.set(opt.id, n);
      }
      result.set(group.id, { total: baseSet.length, counts });
    }
    return result;
  },
}));

// Re-export for components that read this from the store namespace.
export { findGroupsLevel };

export default useFilterStore;