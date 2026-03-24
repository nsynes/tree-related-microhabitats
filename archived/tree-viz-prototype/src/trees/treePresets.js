// Tree species presets with distinctive characteristics
export const treePresets = {
  oak: {
    name: 'Oak',
    trunk: {
      radius: 0.5,
      height: 4,
      color: '#5D4E37', // Deep brown
      segments: 16
    },
    canopy: {
      type: 'wide', // Wide spreading
      radiusX: 3,
      radiusY: 2,
      radiusZ: 3,
      color: '#2D5016', // Dark green
      position: [0, 4.5, 0]
    },
    leaves: {
      type: 'oak',
      color: '#2D5016',
      size: 'large',
      density: 'moderate',
      clustersPerBranch: 3
    },
    branches: {
      count: 20, // More branches for fuller tree
      startHeight: 2,
      length: 2.5, // Longer branches for larger canopy
      radius: 0.08, // Thinner branches
      angle: 45, // degrees from vertical
      twist: true,
      color: '#4A3C28'
    },
    roots: {
      count: 6,
      length: 1.2,
      radius: 0.3,
      color: '#4A3C28'
    }
  },
  
  birch: {
    name: 'Birch',
    trunk: {
      radius: 0.2,
      height: 6,
      color: '#F5F5DC', // White/cream
      segments: 16,
      texture: 'birch' // Special birch bark texture
    },
    canopy: {
      type: 'conical', // Triangular shape
      radiusX: 1.5,
      radiusY: 2.5,
      radiusZ: 1.5,
      color: '#90EE90', // Light green
      position: [0, 6.5, 0]
    },
    leaves: {
      type: 'birch',
      color: '#90EE90',
      size: 'small',
      density: 'light',
      clustersPerBranch: 4
    },
    branches: {
      count: 25, // More delicate branches
      startHeight: 3,
      length: 2.0, // Longer for taller tree
      radius: 0.05, // Very thin
      angle: 35,
      delicate: true,
      color: '#F5F5DC'
    },
    roots: {
      count: 5,
      length: 0.8,
      radius: 0.15,
      color: '#E8E8D0'
    }
  },
  
  beech: {
    name: 'Beech',
    trunk: {
      radius: 0.4,
      height: 5,
      color: '#A9A9A9', // Silver-gray
      segments: 20,
      smooth: true
    },
    canopy: {
      type: 'round', // Dense rounded
      radiusX: 2.5,
      radiusY: 2.5,
      radiusZ: 2.5,
      color: '#228B22', // Bright green
      position: [0, 5.5, 0],
      dense: true
    },
    leaves: {
      type: 'beech',
      color: '#228B22',
      size: 'medium',
      density: 'dense',
      clustersPerBranch: 5
    },
    branches: {
      count: 18, // Dense branching
      startHeight: 2.5,
      length: 2.2, // Longer branches
      radius: 0.07, // Thinner
      angle: 60, // More horizontal
      horizontal: true,
      color: '#8B8B7A'
    },
    roots: {
      count: 5,
      length: 1,
      radius: 0.25,
      color: '#808080'
    }
  },
  
  ash: {
    name: 'Ash',
    trunk: {
      radius: 0.35,
      height: 6.5,
      color: '#696969', // Gray-brown
      segments: 16
    },
    canopy: {
      type: 'oval', // Tall oval
      radiusX: 1.8,
      radiusY: 3,
      radiusZ: 1.8,
      color: '#7CFC00', // Lighter green
      position: [0, 7, 0]
    },
    leaves: {
      type: 'ash',
      color: '#7CFC00',
      size: 'medium',
      density: 'moderate',
      compound: true,
      clustersPerBranch: 4
    },
    branches: {
      count: 22, // More branches
      startHeight: 3.5,
      length: 2.3, // Longer for tall canopy
      radius: 0.06, // Thinner
      angle: 50,
      compound: true, // Compound branching
      color: '#5C5C5C'
    },
    roots: {
      count: 5,
      length: 1,
      radius: 0.22,
      color: '#696969'
    }
  }
};

// Helper function to get all available species
export const getSpeciesList = () => {
  return Object.keys(treePresets);
};

// Helper to get preset by name
export const getTreePreset = (species) => {
  return treePresets[species] || treePresets.oak;
};