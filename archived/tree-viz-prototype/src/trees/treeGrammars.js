/**
 * L-System grammars for different tree species
 * Each grammar defines the branching pattern characteristic of that species
 */

export const treeGrammars = {
  oak: {
    axiom: 'FFFFAFAFAFA',  // Trunk with branches distributed along top third
    rules: {
      'A': 'F[!++A][!+A][!A][!-A][!--A]L',  // Wide branching
      'F': 'F',  // Trunk segments don't branch
      'L': ''
    },
    iterations: 3,
    config: {
      initialLength: 0.4,
      lengthScale: 0.75,     // Longer branches
      initialRadius: 0.15,
      radiusScale: 0.55,     // More aggressive taper for thin twigs
      angle: 35
    },
    name: 'Oak',
    color: '#5D4E37',
    leafColor: '#2D5016'
  },

  birch: {
    axiom: 'FFFFFAFAFA',  // Taller trunk, branches distributed
    rules: {
      'A': 'F[!&+A][!&-A][!^+A][!^-A]L',
      'F': 'F',
      'L': ''
    },
    iterations: 3,
    config: {
      initialLength: 0.5,
      lengthScale: 0.75,
      initialRadius: 0.10,
      radiusScale: 0.55,
      angle: 28
    },
    name: 'Birch',
    color: '#F5F5DC',
    leafColor: '#90EE90'
  },

  beech: {
    axiom: 'FFFFAFAFAFA',
    rules: {
      'A': 'F[!+A][!-A][!&A][!^A]L',
      'F': 'F',
      'L': ''
    },
    iterations: 3,
    config: {
      initialLength: 0.4,
      lengthScale: 0.75,
      initialRadius: 0.12,
      radiusScale: 0.55,
      angle: 38
    },
    name: 'Beech',
    color: '#A9A9A9',
    leafColor: '#228B22'
  },

  ash: {
    axiom: 'FFFFFAFAFAFA',
    rules: {
      'A': 'F[!+A][!-A][!&A]L',
      'F': 'F'
    },
    iterations: 3,
    config: {
      initialLength: 0.45,
      lengthScale: 0.75,
      initialRadius: 0.11,
      radiusScale: 0.55,
      angle: 32
    },
    name: 'Ash',
    color: '#696969',
    leafColor: '#7CFC00'
  },

  // More detailed oak with better structure
  oakDetailed: {
    axiom: 'F[++A][+A][A][-A][--A]',
    rules: {
      'A': '!F[++AL][+AL][AL][-AL][--AL]',
      'F': 'FF',
      'L': ''  // Leaf marker
    },
    iterations: 3,
    config: {
      initialLength: 1.2,
      lengthScale: 0.75,
      initialRadius: 0.15,
      radiusScale: 0.65,
      angle: 30
    },
    name: 'Oak (Detailed)',
    color: '#5D4E37',
    leafColor: '#2D5016'
  }
};

/**
 * Get tree grammar by species name
 */
export function getTreeGrammar(species) {
  return treeGrammars[species] || treeGrammars.oak;
}

/**
 * Generate L-system string for a tree species
 */
export function generateTreeString(species) {
  const grammar = getTreeGrammar(species);
  
  let current = grammar.axiom;
  for (let i = 0; i < grammar.iterations; i++) {
    let next = '';
    for (let char of current) {
      next += grammar.rules[char] || char;
    }
    current = next;
  }
  
  return current;
}