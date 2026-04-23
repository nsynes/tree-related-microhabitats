#!/usr/bin/env python3
"""
Tree-Related Microhabitats - Data Processing Script

This script reads:
1. data/column-mapping.json - Filter hierarchy configuration
2. data/SpeciesTreMsPaper_v1_9April.xlsx - Species data

And generates:
1. react-app/src/data/config.json - Complete filter hierarchy for React app
2. react-app/src/data/species.json - Processed species data

Usage:
    python scripts/process-data.py
"""

import pandas as pd
import json
from pathlib import Path
from typing import Dict, List, Any, Set


def extract_columns_from_hierarchy(hierarchy: Dict[str, Any]) -> Set[str]:
    """
    Dynamically extract all column names from the hierarchy configuration.
    This ensures we only use columns that are defined in the hierarchy (DRY principle).
    """
    columns = set()
    
    # Level 1: filters directly
    if 'level1' in hierarchy and 'filters' in hierarchy['level1']:
        for filter_def in hierarchy['level1']['filters']:
            if 'column' in filter_def:
                columns.add(filter_def['column'])
    
    # Level 2: categories → filters
    if 'level2' in hierarchy and 'categories' in hierarchy['level2']:
        for category in hierarchy['level2']['categories']:
            for filter_def in category['filters']:
                if 'column' in filter_def:
                    columns.add(filter_def['column'])
    
    # Level 3: groups → categories → filters
    if 'level3' in hierarchy and 'groups' in hierarchy['level3']:
        for group in hierarchy['level3']['groups']:
            if 'categories' in group:
                for category in group['categories']:
                    for filter_def in category['filters']:
                        if 'column' in filter_def:
                            columns.add(filter_def['column'])
    
    return columns


def convert_yes_blank(value: Any) -> bool:
    """Convert 'yes'/blank to True/False"""
    if pd.isna(value) or value == '':
        return False
    return str(value).lower().strip() == 'yes'


def extract_habitats(row: pd.Series, hierarchy: Dict[str, Any]) -> List[str]:
    """
    Extract all habitat filter IDs where the species has 'yes'.
    
    Args:
        row: Single row from dataframe
        hierarchy: Hierarchy dict from config
    
    Returns:
        List of filter IDs
    """
    habitats = []
    
    # Level 1: Woodland Type
    if 'level1' in hierarchy:
        for filter_def in hierarchy['level1'].get('filters', []):
            if convert_yes_blank(row.get(filter_def['column'])):
                habitats.append(filter_def['id'])
    
    # Level 2: Tree Characteristics
    if 'level2' in hierarchy:
        for category in hierarchy['level2'].get('categories', []):
            for filter_def in category['filters']:
                if convert_yes_blank(row.get(filter_def['column'])):
                    habitats.append(filter_def['id'])
    
    # Level 3: Microhabitats (groups → categories → filters)
    if 'level3' in hierarchy:
        for group in hierarchy['level3'].get('groups', []):
            for category in group.get('categories', []):
                for filter_def in category['filters']:
                    if convert_yes_blank(row.get(filter_def['column'])):
                        habitats.append(filter_def['id'])
    
    return habitats


def process_species(df: pd.DataFrame, hierarchy: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Process species data into JSON format.

    Args:
        df: Dataframe with species data
        hierarchy: Hierarchy dict from config

    Returns:
        List of species dicts
    """
    species_list = []

    for idx, row in df.iterrows():
        # Skip rows with no scientific name
        if pd.isna(row.get('Scientific name')) or row.get('Scientific name') == '':
            continue

        species = {
            'id': len(species_list) + 1,
            'scientificName': str(row.get('Scientific name', '')),
            'commonName': str(row.get('Common name', '')) if pd.notna(row.get('Common name')) else '',
            'class': str(row.get('Class', '')) if pd.notna(row.get('Class')) else '',
            'order': str(row.get('Order', '')) if pd.notna(row.get('Order')) else '',
            'family': str(row.get('Family', '')) if pd.notna(row.get('Family')) else '',
            'priorityEngland': convert_yes_blank(row.get('PriorityEngland')),
            'd4d5': convert_yes_blank(row.get('D4/D5')),
            'iucnStatus': str(row.get('IUCNStatus', '')) if pd.notna(row.get('IUCNStatus')) else '',
            'threatenedAction': str(row.get('ThreatenedAction', '')) if pd.notna(row.get('ThreatenedAction')) else '',
            'distribution': str(row.get('Distribution', '')) if pd.notna(row.get('Distribution')) else '',
            'habitatRequirements': str(row.get('Habitat requirements', '')) if pd.notna(row.get('Habitat requirements')) else '',
            'habitats': extract_habitats(row, hierarchy)
        }

        species_list.append(species)

    return species_list


def load_photo_cache(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding='utf-8'))


def attach_photos(species_list: List[Dict[str, Any]], photo_cache: Dict[str, Any]) -> Dict[str, int]:
    """
    Attach photo info from the iNaturalist cache to each species that has a
    usable entry. A usable entry has a photo URL and a CC license code (any
    variant — we filter out 'all rights reserved' which iNat returns as
    license_code=None).

    Returns a small stats dict for logging.
    """
    stats = {'with_photo': 0, 'all_rights_reserved': 0, 'no_photo': 0, 'not_found': 0, 'missing': 0}
    for species in species_list:
        name = species['scientificName']
        entry = photo_cache.get(name)
        if entry is None:
            species['photo'] = None
            stats['missing'] += 1
            continue
        if entry.get('not_found'):
            species['photo'] = None
            stats['not_found'] += 1
            continue
        if entry.get('no_photo'):
            species['photo'] = None
            stats['no_photo'] += 1
            continue
        if not entry.get('photo_medium_url'):
            species['photo'] = None
            stats['no_photo'] += 1
            continue
        license_code = entry.get('license_code')
        if not license_code:
            # iNat returns None for 'all rights reserved' — unusable
            species['photo'] = None
            stats['all_rights_reserved'] += 1
            continue
        medium_url = entry['photo_medium_url']
        # iNat serves every photo at /photos/<id>/<size>.jpg — API only returns
        # square and medium, but the small/large/original variants exist and
        # we derive them here.
        species['photo'] = {
            'url': medium_url,
            'smallUrl': medium_url.replace('/medium.', '/small.'),
            'largeUrl': medium_url.replace('/medium.', '/large.'),
            'attribution': entry.get('attribution', ''),
            'licenseCode': license_code,
            'taxonId': entry.get('taxon_id'),
        }
        stats['with_photo'] += 1
    return stats


def count_filters(hierarchy: Dict[str, Any]) -> tuple:
    """Count filters in each level"""
    level1_count = len(hierarchy.get('level1', {}).get('filters', []))
    
    level2_count = sum(
        len(cat['filters']) 
        for cat in hierarchy.get('level2', {}).get('categories', [])
    )
    
    level3_count = sum(
        len(filter_def)
        for group in hierarchy.get('level3', {}).get('groups', [])
        for category in group.get('categories', [])
        for filter_def in category['filters']
    )
    
    return level1_count, level2_count, level3_count


def main():
    """Main processing function"""
    print("🌳 Tree-Related Microhabitats - Data Processing")
    print("=" * 50)
    
    # Paths
    config_input = Path('data/column-mapping.json')
    output_dir = Path('react-app/src/data')
    config_output = output_dir / 'config.json'
    species_output = output_dir / 'species.json'

    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load column mapping configuration
    print(f"\n📖 Reading {config_input}...")
    with open(config_input, 'r', encoding='utf-8') as f:
        column_config = json.load(f)

    hierarchy = column_config['hierarchy']
    species_metadata_cols = column_config['speciesMetadataColumns']
    excel_input = Path(column_config['pipeline']['speciesDataFile'])
    if not excel_input.exists():
        raise SystemExit(f"✗ Species data file not found: {excel_input}")
    
    # Dynamically extract column whitelist from hierarchy
    print("\n🔍 Extracting column whitelist from hierarchy...")
    habitat_columns = extract_columns_from_hierarchy(hierarchy)
    all_columns = set(species_metadata_cols) | habitat_columns
    
    print(f"   ✓ Species metadata columns: {len(species_metadata_cols)}")
    print(f"   ✓ Habitat columns: {len(habitat_columns)}")
    print(f"   ✓ Total columns to use: {len(all_columns)}")
    
    # Read Excel file
    print(f"\n� Reading {excel_input}...")
    df = pd.read_excel(excel_input, header=4)  # Row 5 (0-indexed = 4) contains column names
    
    # Filter to only included columns that exist in the Excel file
    available_cols = [col for col in df.columns if col in all_columns]
    df = df[available_cols]
    
    print(f"   ✓ Loaded {len(df)} rows")
    print(f"   ✓ Using {len(available_cols)} columns")
    
    # Build config for React app
    print("\n⚙️  Generating config.json...")
    react_config = {
        'app': {
            'title': 'Tree-Related Microhabitats Species Explorer'
        },
        'filterHierarchy': [
            {
                'level': 1,
                **hierarchy['level1']
            },
            {
                'level': 2,
                **hierarchy['level2']
            },
            {
                'level': 3,
                **hierarchy['level3']
            }
        ]
    }
    
    # Count filters
    level1_count, level2_count, level3_count = count_filters(hierarchy)
    total_filters = level1_count + level2_count + level3_count
    
    print(f"   ✓ Level 1: {level1_count} filters")
    print(f"   ✓ Level 2: {level2_count} filters")
    print(f"   ✓ Level 3: {level3_count} filters")
    print(f"   ✓ Total: {total_filters} filters")
    
    # Save config
    with open(config_output, 'w', encoding='utf-8') as f:
        json.dump(react_config, f, indent=2, ensure_ascii=False)
    print(f"   ✓ Saved to {config_output}")
    
    # Process species data
    print("\n🦋 Processing species data...")
    species_data = process_species(df, hierarchy)
    print(f"   ✓ Processed {len(species_data)} species")

    # Calculate stats
    avg_habitats = sum(len(s['habitats']) for s in species_data) / len(species_data) if species_data else 0
    print(f"   ✓ Average {avg_habitats:.1f} habitats per species")

    # Merge iNaturalist photo cache if present (optional — script is usable without it)
    photo_cache_path = Path('data/inaturalist-photos.json')
    photo_cache = load_photo_cache(photo_cache_path)
    if photo_cache:
        print(f"\n📷 Merging photo metadata from {photo_cache_path}...")
        photo_stats = attach_photos(species_data, photo_cache)
        print(f"   ✓ With photo:           {photo_stats['with_photo']}")
        print(f"   ✓ All rights reserved:  {photo_stats['all_rights_reserved']}")
        print(f"   ✓ On iNat, no photo:    {photo_stats['no_photo']}")
        print(f"   ✓ Not on iNat:          {photo_stats['not_found']}")
        print(f"   ✓ Not yet fetched:      {photo_stats['missing']}")
    else:
        print(f"\n📷 No photo cache at {photo_cache_path} — skipping.")
        for s in species_data:
            s['photo'] = None

    # Save species data
    with open(species_output, 'w', encoding='utf-8') as f:
        json.dump(species_data, f, indent=2, ensure_ascii=False)
    print(f"   ✓ Saved to {species_output}")
    
    print("\n✅ Processing complete!")
    print(f"   Generated: {config_output}")
    print(f"   Generated: {species_output}")
    print(f"   Ready for React app to use!")


if __name__ == '__main__':
    main()