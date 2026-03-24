#!/usr/bin/env node

/**
 * Data Processing Script
 * Converts CSV species data to optimized JSON with pre-computed habitat matches
 * 
 * Run: node scripts/process-data.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths relative to this script
const CSV_PATH = join(__dirname, '../../data/Tree_TreMs_species spreadsheet.csv');
const CONFIG_PATH = join(__dirname, '../src/data/config.json');
const OUTPUT_PATH = join(__dirname, '../src/data/species.json');

console.log('🌳 Processing species data...');

// Simple CSV parser (assumes quoted fields can contain commas)
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && nextChar === '"') {
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result.map(field => field.trim());
}

// Check if a value matches the filter criteria
function matchesFilter(value, filter) {
  if (!value) return false;
  
  const valueLower = value.toLowerCase();
  
  // If filter has a search term, use that
  if (filter.searchTerm) {
    return valueLower.includes(filter.searchTerm.toLowerCase());
  }
  
  // Otherwise check for non-empty value (for boolean columns)
  return valueLower !== '' && valueLower !== 'no' && valueLower !== 'n/a';
}

// Build habitat mapping from config (works with hierarchical structure)
function buildHabitatMapping(config) {
  const mapping = {};
  
  config.filterHierarchy.forEach(level => {
    // Level 1: filters directly
    if (level.filters) {
      level.filters.forEach(filter => {
        mapping[filter.id] = {
          column: filter.column,
          searchTerm: filter.searchTerm
        };
      });
    }
    
    // Level 2: categories → filters
    if (level.categories) {
      level.categories.forEach(category => {
        category.filters.forEach(filter => {
          mapping[filter.id] = {
            column: filter.column,
            searchTerm: filter.searchTerm
          };
        });
      });
    }
    
    // Level 3: groups → categories → filters
    if (level.groups) {
      level.groups.forEach(group => {
        group.categories.forEach(category => {
          category.filters.forEach(filter => {
            mapping[filter.id] = {
              column: filter.column,
              searchTerm: filter.searchTerm
            };
          });
        });
      });
    }
  });
  
  return mapping;
}

// Process species data
function processSpecies(csvData, habitatMapping) {
  return csvData.map((row, index) => {
    // Extract basic species info
    const species = {
      id: index + 1,
      scientificName: row['Scientific name'] || 'Unknown',
      commonName: row['Common name'] || '',
      class: row['Class'] || '',
      family: row['Family'] || '',
      neRedList: row['NE red list'] || '',
      distribution: row['Distribution'] || '',
      habitatRequirements: row['Habitat requirements'] || '',
      habitats: []
    };
    
    // Check which habitats this species matches
    Object.entries(habitatMapping).forEach(([habitatId, { column, searchTerm }]) => {
      const value = row[column];
      if (value && matchesFilter(value, { searchTerm })) {
        species.habitats.push(habitatId);
      }
    });
    
    return species;
  });
}

// Main execution
try {
  // Read CSV
  console.log('📖 Reading CSV file...');
  const csvText = readFileSync(CSV_PATH, 'utf-8');
  const csvData = parseCSV(csvText);
  console.log(`   Found ${csvData.length} species`);
  
  // Read config
  console.log('⚙️  Reading configuration...');
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const habitatMapping = buildHabitatMapping(config);
  console.log(`   Found ${Object.keys(habitatMapping).length} habitat filters`);
  
  // Process species
  console.log('🔄 Processing species data...');
  const processedSpecies = processSpecies(csvData, habitatMapping);
  
  // Calculate stats
  const totalHabitats = processedSpecies.reduce((sum, s) => sum + s.habitats.length, 0);
  const avgHabitats = (totalHabitats / processedSpecies.length).toFixed(1);
  console.log(`   Average ${avgHabitats} habitats per species`);
  
  // Write output
  console.log('💾 Writing output file...');
  writeFileSync(OUTPUT_PATH, JSON.stringify(processedSpecies, null, 2));
  
  // Calculate size
  const sizeKB = (Buffer.byteLength(JSON.stringify(processedSpecies)) / 1024).toFixed(1);
  console.log(`   Output size: ${sizeKB} KB`);
  
  console.log('✅ Data processing complete!');
  
} catch (error) {
  console.error('❌ Error processing data:', error.message);
  process.exit(1);
}