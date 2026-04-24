import { create } from 'zustand';

/**
 * Zustand store for hierarchical habitat filtering
 * 
 * Hierarchy:
 * Level 1: Woodland Type (required, OR within level)
 * Level 2: Tree Characteristics (required, OR within level)
 * Level 3: Microhabitats (optional, OR within level)
 * 
 * Logic: (Level1_A OR Level1_B) AND (Level2_A OR Level2_B) AND (Level3_A OR Level3_B OR ALL if none selected)
 */

// Canonical ordering for taxonomic class tabs — matches the dataset skew
// (insects first because they dominate, then vertebrates, then the rest).
const CLASS_ORDER = [
  'Insect', 'Vertebrate', 'Lichen', 'Arachnid',
  'Mollusc', 'Millipede', 'Fungi', 'Moss',
];

const normaliseClass = (cls) => {
  // One record in the source data has 'lichen' lowercase; roll it into Lichen.
  if (!cls) return '';
  const lower = cls.toLowerCase();
  return lower === 'lichen' ? 'Lichen' : cls;
};

const useFilterStore = create((set, get) => ({
  // State - track filters by hierarchy level
  level1Filters: new Set(), // Woodland Type
  level2Filters: new Set(), // Tree Characteristics (species, age, condition)
  level3Filters: new Set(), // Microhabitats (optional)

  // Right-panel narrowing
  searchQuery: '',
  classFilter: null,

  species: [],
  filteredSpecies: [],
  
  // Actions
  toggleFilter: (filterId, level) => {
    const { level1Filters, level2Filters, level3Filters, filterSpecies } = get();
    
    let newFilters;
    if (level === 1) {
      newFilters = new Set(level1Filters);
      if (newFilters.has(filterId)) {
        newFilters.delete(filterId);
      } else {
        newFilters.add(filterId);
      }
      set({ level1Filters: newFilters });
    } else if (level === 2) {
      newFilters = new Set(level2Filters);
      if (newFilters.has(filterId)) {
        newFilters.delete(filterId);
      } else {
        newFilters.add(filterId);
      }
      set({ level2Filters: newFilters });
    } else if (level === 3) {
      newFilters = new Set(level3Filters);
      if (newFilters.has(filterId)) {
        newFilters.delete(filterId);
      } else {
        newFilters.add(filterId);
      }
      set({ level3Filters: newFilters });
    }
    
    filterSpecies();
  },
  
  setSearchQuery: (q) => {
    set({ searchQuery: q });
    get().filterSpecies();
  },

  setClassFilter: (cls) => {
    set({ classFilter: cls });
    get().filterSpecies();
  },

  clearFilters: () => {
    // Scoped to the habitat-features panel where the Clear All button lives.
    // Search and class filter belong to the species panel and have their own
    // inline clear affordances (the × in the search box; clicking the active
    // class tab or the "All" tab).
    set({
      level1Filters: new Set(),
      level2Filters: new Set(),
      level3Filters: new Set(),
    });
    get().filterSpecies();
  },
  
  setSpecies: (speciesData) => {
    set({ species: speciesData, filteredSpecies: speciesData });
  },
  
  filterSpecies: () => {
    const {
      level1Filters, level2Filters, level3Filters,
      searchQuery, classFilter, species,
    } = get();

    const q = searchQuery.trim().toLowerCase();
    const hasHabitatFilters =
      level1Filters.size > 0 || level2Filters.size > 0 || level3Filters.size > 0;

    // No filters and no right-panel narrowing — show all species
    if (!hasHabitatFilters && q === '' && classFilter === null) {
      set({ filteredSpecies: species });
      return;
    }

    // Filter species using hierarchical AND/OR logic + right-panel guards
    const filtered = species.filter(s => {
      // Level 1: Woodland Type (OR within level)
      const matchesLevel1 = level1Filters.size === 0 ||
        s.habitats.some(habitat => level1Filters.has(habitat));
      if (!matchesLevel1) return false;

      // Level 2: Tree Characteristics (OR within level)
      const matchesLevel2 = level2Filters.size === 0 ||
        s.habitats.some(habitat => level2Filters.has(habitat));
      if (!matchesLevel2) return false;

      // Level 3: Microhabitats (OR within level, optional)
      const matchesLevel3 = level3Filters.size === 0 ||
        s.habitats.some(habitat => level3Filters.has(habitat));
      if (!matchesLevel3) return false;

      // Free-text search across scientific and common name
      if (q !== '') {
        const sciMatch = s.scientificName && s.scientificName.toLowerCase().includes(q);
        const comMatch = s.commonName && s.commonName.toLowerCase().includes(q);
        if (!sciMatch && !comMatch) return false;
      }

      // Class tab filter
      if (classFilter !== null && normaliseClass(s.class) !== classFilter) {
        return false;
      }

      return true;
    });

    set({ filteredSpecies: filtered });
  },

  // Breakdown of the current filtered set by class, ignoring the active
  // classFilter so users can see what switching tabs would yield.
  classBreakdown: () => {
    const {
      level1Filters, level2Filters, level3Filters,
      searchQuery, species,
    } = get();

    const q = searchQuery.trim().toLowerCase();
    const counts = new Map();
    let total = 0;

    for (const s of species) {
      if (level1Filters.size > 0 && !s.habitats.some(h => level1Filters.has(h))) continue;
      if (level2Filters.size > 0 && !s.habitats.some(h => level2Filters.has(h))) continue;
      if (level3Filters.size > 0 && !s.habitats.some(h => level3Filters.has(h))) continue;
      if (q !== '') {
        const sciMatch = s.scientificName && s.scientificName.toLowerCase().includes(q);
        const comMatch = s.commonName && s.commonName.toLowerCase().includes(q);
        if (!sciMatch && !comMatch) continue;
      }
      total += 1;
      const cls = normaliseClass(s.class);
      if (!cls) continue;
      counts.set(cls, (counts.get(cls) || 0) + 1);
    }

    // Preserve the canonical order; include known classes first then any
    // unexpected ones at the end (defensive — should not happen with
    // current data but keeps the breakdown honest if it does).
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
  
  // Helper to get total selected filters count
  getTotalFiltersCount: () => {
    const { level1Filters, level2Filters, level3Filters } = get();
    return level1Filters.size + level2Filters.size + level3Filters.size;
  },
  
  // Group-level helpers for Level 3 microhabitats
  
  // Extract all filter IDs from a group in the config
  getGroupFilterIds: (groupId, config) => {
    const level3 = config.filterHierarchy.find(level => level.level === 3);
    if (!level3 || !level3.groups) return [];
    
    const group = level3.groups.find(g => g.id === groupId);
    if (!group || !group.categories) return [];
    
    // Extract all filter IDs from all categories in the group
    const filterIds = [];
    for (const category of group.categories) {
      for (const filter of category.filters) {
        filterIds.push(filter.id);
      }
    }
    return filterIds;
  },
  
  // Check if all filters in a group are selected
  isGroupSelected: (groupId, config) => {
    const { level3Filters, getGroupFilterIds } = get();
    const filterIds = getGroupFilterIds(groupId, config);
    if (filterIds.length === 0) return false;
    return filterIds.every(id => level3Filters.has(id));
  },
  
  // Check if some (but not all) filters in a group are selected
  isGroupIndeterminate: (groupId, config) => {
    const { level3Filters, getGroupFilterIds } = get();
    const filterIds = getGroupFilterIds(groupId, config);
    if (filterIds.length === 0) return false;
    
    const selectedCount = filterIds.filter(id => level3Filters.has(id)).length;
    return selectedCount > 0 && selectedCount < filterIds.length;
  },
  
  // Toggle all filters in a group
  toggleGroup: (groupId, config) => {
    const { level3Filters, getGroupFilterIds, filterSpecies } = get();
    const filterIds = getGroupFilterIds(groupId, config);

    if (filterIds.length === 0) return;

    const newFilters = new Set(level3Filters);

    // If all filters are selected, deselect all
    // Otherwise, select all
    const allSelected = filterIds.every(id => level3Filters.has(id));

    if (allSelected) {
      // Deselect all filters in the group
      filterIds.forEach(id => newFilters.delete(id));
    } else {
      // Select all filters in the group
      filterIds.forEach(id => newFilters.add(id));
    }

    set({ level3Filters: newFilters });
    filterSpecies();
  },

  // Remove every level 3 filter that belongs to a group (partial or full)
  clearGroup: (groupId, config) => {
    const { level3Filters, getGroupFilterIds, filterSpecies } = get();
    const filterIds = getGroupFilterIds(groupId, config);
    if (filterIds.length === 0) return;

    const newFilters = new Set(level3Filters);
    filterIds.forEach(id => newFilters.delete(id));
    set({ level3Filters: newFilters });
    filterSpecies();
  },

  // Count how many filters in a group are currently selected
  countGroupSelected: (groupId, config) => {
    const { level3Filters, getGroupFilterIds } = get();
    const filterIds = getGroupFilterIds(groupId, config);
    return filterIds.filter(id => level3Filters.has(id)).length;
  }
}));

export default useFilterStore;