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

const useFilterStore = create((set, get) => ({
  // State - track filters by hierarchy level
  level1Filters: new Set(), // Woodland Type
  level2Filters: new Set(), // Tree Characteristics (species, age, condition)
  level3Filters: new Set(), // Microhabitats (optional)
  
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
  
  clearFilters: () => {
    set({ 
      level1Filters: new Set(), 
      level2Filters: new Set(), 
      level3Filters: new Set() 
    });
    get().filterSpecies(); // Reapply filtering (will show all species when no filters)
  },
  
  setSpecies: (speciesData) => {
    set({ species: speciesData, filteredSpecies: speciesData });
  },
  
  filterSpecies: () => {
    const { level1Filters, level2Filters, level3Filters, species } = get();
    
    // No filters at all - show all species
    if (level1Filters.size === 0 && level2Filters.size === 0 && level3Filters.size === 0) {
      set({ filteredSpecies: species });
      return;
    }
    
    // Filter species using hierarchical AND/OR logic
    const filtered = species.filter(s => {
      // Level 1: Woodland Type (OR within level)
      // If Level 1 filters selected, species must match at least one
      const matchesLevel1 = level1Filters.size === 0 || 
        s.habitats.some(habitat => level1Filters.has(habitat));
      
      if (!matchesLevel1) return false;
      
      // Level 2: Tree Characteristics (OR within level)
      // If Level 2 filters selected, species must match at least one
      const matchesLevel2 = level2Filters.size === 0 || 
        s.habitats.some(habitat => level2Filters.has(habitat));
      
      if (!matchesLevel2) return false;
      
      // Level 3: Microhabitats (OR within level, optional)
      // If Level 3 filters selected, species must match at least one
      // If NO Level 3 filters selected, all species pass (show all microhabitats)
      const matchesLevel3 = level3Filters.size === 0 || 
        s.habitats.some(habitat => level3Filters.has(habitat));
      
      if (!matchesLevel3) return false;
      
      // Species passed all levels
      return true;
    });
    
    set({ filteredSpecies: filtered });
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