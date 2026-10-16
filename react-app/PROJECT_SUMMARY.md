# Tree-Related Microhabitat Explorer

## Project Overview

A React-based web application for exploring species associated with tree-related microhabitats (TreMs). The app provides hierarchical filtering across woodland types, tree characteristics, and specific microhabitats to help users discover which species use particular habitat features.

## Current Status

**Version:** 1.0.0  
**Status:** Development complete, ready for deployment  
**Last Updated:** March 24, 2026

## Architecture

### Technology Stack

- **Frontend Framework:** React 18.2 with Vite 5.0
- **State Management:** Zustand 4.5
- **Styling:** Pure CSS with forest-inspired theme
- **Data Processing:** Python 3.x with Pandas
- **Deployment Target:** AWS S3 (static site hosting)

### Data Pipeline

```
Excel File (metadata rows) 
    ↓
Python Script (scripts/process-data.py)
    ↓
JSON Files (config.json + species.json)
    ↓
React App
```

## Data Structure

### Input Data

**Source:** `data/SpeciesTreMsPaper_v1_18Mar.xlsx`

**Structure:**
- Rows 1-3: Metadata (category hierarchy)
- Row 4: Blank
- Row 5: Column headers
- Rows 6+: Species data (678 species)

**Columns:** 91 total
- 10 species info columns
- 12 habitat/tree characteristic columns  
- 45 microhabitat columns (yes/blank values)
- 24 excluded/future columns

### Generated Data

**1. config.json** (17KB)
- App configuration
- 3-level filter hierarchy
- 51 total filters mapped to columns

**2. species.json** (420KB)
- 678 processed species
- Average 6.5 habitats per species
- All fields ready for display

## Filter Hierarchy

### Level 1: Woodland Type (5 filters)
- Open Grown Trees
- Closed Canopy Woodland
- Wood Pasture/Parkland
- Trees Outside Woodland
- Orchard

### Level 2: Tree Characteristics (6 filters)

**Tree Type:**
- Conifer
- Broadleaved

**Tree Age:**
- Unspecified Age
- Ancient/Veteran
- Mature
- Young

### Level 3: Microhabitats (40 filters)

**7 Parent Categories:**
1. **Cavity** (16 filters)
   - Woodpecker features, Rot holes, Wood decay, Concavities

2. **Injuries and Exposed Wood** (6 filters)
   - Exposed sapwood, Exposed heartwood

3. **Crown Deadwood** (2 filters)
   - Sun-exposed, Shaded

4. **Excrescences** (3 filters)
   - Galls, Burrs/cankers, Epicormic shoots

5. **Fungal Fruiting Bodies** (4 filters)
   - Polypores, Slime moulds, Crustose fungi

6. **Epiphytic and Epixylic Structures** (7 filters)
   - Nests, Ivy, Lichens, Moss, Mistletoe, Microsoils

7. **Exudates** (2 filters)
   - Sap run, Resinosis

## Filtering Logic

**Hierarchical AND/OR:**
```
(Level1_A OR Level1_B OR ... OR ALL) 
  AND 
(Level2_A OR Level2_B OR ... OR ALL)
  AND
(Level3_A OR Level3_B OR ... OR ALL)
```

- No filters = Show all species
- Filters within a level = OR (any match)
- Filters across levels = AND (must match all active levels)
- Empty level = Treated as "ALL"

## Key Features

### User Interface

1. **50/50 Split Layout**
   - Left: Filter panel with 3-level hierarchy
   - Right: Species grid (multi-column, responsive)

2. **Active Filters Summary**
   - Chip-based display of selected filters
   - Shows "ALL" for unselected levels
   - Click chips to remove individual filters
   - Truncation for long lists (e.g., "+5 more")

3. **Species Cards**
   - Scientific and common names
   - Taxonomic info (Class, Order, Family)
   - Conservation status (Priority List, D4/D5, IUCN, Rarity)
   - Distribution info
   - Collapsible habitat requirements

4. **Real-time Filtering**
   - Instant results as filters change
   - Shows count of matching species
   - No page reloads

### Performance

- **Memoization:** SpeciesCard components memoized to prevent unnecessary re-renders
- **Zustand:** Efficient state management with Set-based filters
- **JSON Loading:** Pre-processed data, no runtime parsing needed

## Project Structure

```
/
├── scripts/
│   └── process-data.py          # Python data processor
├── data/
│   ├── SpeciesTreMsPaper_v1_18Mar.xlsx
│   └── archive/                 # Old data files
├── react-app/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FilterPanel.jsx  # 3-level filter UI
│   │   │   ├── SpeciesGrid.jsx  # Grid container
│   │   │   └── SpeciesCard.jsx  # Individual species display
│   │   ├── store/
│   │   │   └── useFilterStore.js # Zustand state
│   │   ├── styles/
│   │   │   └── theme.css        # Forest-themed CSS
│   │   ├── data/
│   │   │   ├── config.json      # Generated filter config
│   │   │   └── species.json     # Generated species data
│   │   ├── App.jsx              # Main app component
│   │   └── main.jsx             # React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── archived/                    # Old R-Shiny code
```

## Development Workflow

### Setup

```bash
# Install dependencies
cd react-app
npm install
```

### Data Updates

```bash
# 1. Update Excel file: data/SpeciesTreMsPaper_v1_18Mar.xlsx
# 2. Regenerate JSON files:
python scripts/process-data.py

# Output:
# ✓ react-app/src/data/config.json
# ✓ react-app/src/data/species.json
```

### Development Server

```bash
cd react-app
npm run dev
# Opens at http://localhost:5173/
```

### Production Build

```bash
cd react-app
npm run build
# Outputs to react-app/dist/
```

## Future Enhancements

### Ready to Add (when client finalizes)

1. **Tree Species Filtering**
   - Column exists but needs cleanup
   - Will add as additional Level 2 category

2. **Tree Condition Filters**
   - Standing vs. Fallen
   - Dead vs. Decaying vs. Living
   - Will add as additional Level 2 category

### UI Improvements Under Consideration

- Collapsible filter groups
- Parent category checkboxes (select all children)
- Export filtered results
- Share filter state via URL
- Mobile-optimized layout

## Component Details

### FilterPanel.jsx

**Responsibilities:**
- Renders 3-level filter hierarchy
- Displays active filters summary with chips
- Handles filter selection/deselection
- Shows "Clear All" when filters active

**Key Functions:**
- `getFilterLabel(filterId)` - Maps filter ID to display label

### SpeciesCard.jsx

**Displays:**
- Scientific name (italic)
- Common name
- Taxonomic tags (Class, Order, Family)
- Conservation status indicators
- Distribution info
- Collapsible habitat requirements

**Optimizations:**
- Memoized to prevent unnecessary re-renders
- Conditional rendering (only show fields if present)

### useFilterStore.js

**State:**
- `level1Filters` - Set of active Level 1 filter IDs
- `level2Filters` - Set of active Level 2 filter IDs
- `level3Filters` - Set of active Level 3 filter IDs
- `allSpecies` - Full species array

**Actions:**
- `toggleFilter(filterId, level)` - Add/remove filter
- `clearFilters()` - Reset all filters
- `setSpecies(data)` - Initialize species data

**Computed:**
- `filteredSpecies` - Real-time filtered results
- `getTotalFiltersCount()` - Count of active filters

## Migration History

### Version 1.0 (Current)
- **Tech:** React + Vite + Zustand
- **Data:** Python processing from Excel
- **Filters:** 51 mapped filters across 3 levels
- **Species:** 678 fully processed

### Version 0.2 (Archived)
- **Tech:** React + Vite prototype
- **Data:** CSV-based
- **Filters:** Simple flat structure

### Version 0.1 (Archived)
- **Tech:** R-Shiny
- **Data:** YAML config + CSV
- **Status:** Archived in `archived/` directory

## Deployment

### Target Platform

**AWS S3** with CloudFront CDN (optional)

### Build Process

```bash
cd react-app
npm run build

# Outputs to:
# react-app/dist/
#   ├── index.html
#   ├── assets/
#   │   ├── index-[hash].js
#   │   ├── index-[hash].css
#   │   └── species-[hash].json
#   └── data/
#       └── config.json
```

### Deployment (via AWS SAM)

See `template.yaml` for SAM configuration.

```bash
sam build
sam deploy --guided
```

## Maintenance

### Adding New Filters

1. Client updates Excel file with new columns
2. Update Python script to map new columns:
   - Add to appropriate level in `generate_level*_filters()`
   - Ensure column name matches Excel
3. Run `python scripts/process-data.py`
4. Test in development
5. Deploy

### Data Quality Checks

The Python script includes validation:
- Skips species with no scientific name
- Handles blank values as "no"
- Preserves text fields for display
- Reports statistics (species count, avg habitats)

## Contact and Support

**Developer:** Nick S  
**Client:** Forest Research (Katty Baird)  
**Purpose:** Tree-related microhabitats species database explorer

## License

Proprietary - Forest Research