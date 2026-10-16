#!/usr/bin/env python3
"""
Tree-Related Microhabitats - Data Processing Script

This script reads:
1. data/column-mapping.json - Filter hierarchy configuration
2. species data spreadsheet specificied with the properties "speciesDataFile" and "speciesDataSheet"

And generates:
1. react-app/src/data/config.json - Complete filter hierarchy for React app
2. react-app/src/data/species.json - Processed species data

Usage:
    python scripts/process-data.py
"""

import pandas as pd
import json
import re
from pathlib import Path
from typing import Dict, List, Any, Set


def iter_level_filters(level_obj: Dict[str, Any]):
    """Yield every filter dict in a level, regardless of its shape.

    Three shapes are supported:
      - flat:       level.filters[]
      - categories: level.categories[].filters[]
      - groups:     level.groups[].categories[].filters[]

    Any future hierarchy levels with one of these shapes are handled
    automatically without code changes - see column-mapping.json.
    """
    if 'filters' in level_obj:
        yield from level_obj['filters']
    elif 'categories' in level_obj:
        for cat in level_obj['categories']:
            yield from cat.get('filters', [])
    elif 'groups' in level_obj:
        for group in level_obj['groups']:
            for cat in group.get('categories', []):
                yield from cat.get('filters', [])


def iter_levels(hierarchy: Dict[str, Any]):
    """Yield (key, level_obj) pairs in hierarchy order ('level1', 'level2', …)."""
    for key in sorted(hierarchy):
        yield key, hierarchy[key]


def extract_columns_from_hierarchy(hierarchy: Dict[str, Any]) -> Set[str]:
    """
    Dynamically extract all column names from every level of the hierarchy.
    Shape-agnostic: works for flat / categories / groups levels.
    """
    columns = set()
    for _, level_obj in iter_levels(hierarchy):
        for filter_def in iter_level_filters(level_obj):
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
    Walks every level of the hierarchy regardless of count or shape.
    """
    habitats = []
    for _, level_obj in iter_levels(hierarchy):
        for filter_def in iter_level_filters(level_obj):
            if convert_yes_blank(row.get(filter_def['column'])):
                habitats.append(filter_def['id'])
    return habitats


def _read_field(row: pd.Series, spec: Dict[str, Any]) -> Any:
    """Read one cell from a row according to its metadata-column spec."""
    val = row.get(spec['column'])
    kind = spec.get('type', 'string')
    if kind == 'yes_blank':
        return convert_yes_blank(val)
    # Default: string with NaN → empty string
    return str(val) if pd.notna(val) else ''


def process_species(
    df: pd.DataFrame,
    hierarchy: Dict[str, Any],
    metadata_cols: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Process species data into JSON format.

    metadata_cols is the speciesMetadataColumns list from column-mapping.json,
    one entry per output field. Each entry has at minimum {key, column} and
    optionally type='yes_blank' for boolean fields.
    """
    sci_name_spec = next((m for m in metadata_cols if m['key'] == 'scientificName'), None)
    if sci_name_spec is None:
        raise SystemExit("✗ speciesMetadataColumns must include a 'scientificName' key")
    sci_name_col = sci_name_spec['column']

    species_list = []
    for _, row in df.iterrows():
        # Skip rows with no scientific name
        if pd.isna(row.get(sci_name_col)) or row.get(sci_name_col) == '':
            continue

        species = {'id': len(species_list) + 1}
        for spec in metadata_cols:
            species[spec['key']] = _read_field(row, spec)
        species['habitats'] = extract_habitats(row, hierarchy)

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
    variant - we filter out 'all rights reserved' which iNat returns as
    license_code=None).

    Returns a small stats dict for logging.
    """
    stats = {'with_photo': 0, 'all_rights_reserved': 0, 'no_photo': 0, 'not_found': 0,
             'missing': 0, 'with_taxon_id': 0, 'inactive_taxon': 0}
    for species in species_list:
        name = species['scientificName']
        species['photo'] = None
        species['taxonId'] = None
        entry = photo_cache.get(name)
        if entry is None:
            stats['missing'] += 1
            continue
        # Capture the iNat taxon id whenever we have one - enables "View on
        # iNaturalist" links even for species without a usable photo.
        taxon_id = entry.get('taxon_id')
        if taxon_id:
            species['taxonId'] = taxon_id
            stats['with_taxon_id'] += 1
        if entry.get('not_found'):
            stats['not_found'] += 1
            continue
        if entry.get('inactive_taxon'):
            # Keep the taxon id (set above) so the UI can link to the iNat
            # page where the rename is visible. Don't attach any photo.
            stats['inactive_taxon'] += 1
            continue
        if entry.get('no_photo'):
            stats['no_photo'] += 1
            continue
        if not entry.get('photo_medium_url'):
            stats['no_photo'] += 1
            continue
        license_code = entry.get('license_code')
        if not license_code:
            # iNat returns None for 'all rights reserved' - unusable
            stats['all_rights_reserved'] += 1
            continue
        medium_url = entry['photo_medium_url']
        # iNat serves every photo at /photos/<id>/<size>.jpg - API only returns
        # square and medium, but the small/large/original variants exist and
        # we derive them here.
        species['photo'] = {
            'url': medium_url,
            'smallUrl': medium_url.replace('/medium.', '/small.'),
            'largeUrl': medium_url.replace('/medium.', '/large.'),
            'attribution': entry.get('attribution', ''),
            'licenseCode': license_code,
        }
        stats['with_photo'] += 1
    return stats


def count_filters(hierarchy: Dict[str, Any]) -> List[tuple]:
    """Return [(key, label, count), ...] in hierarchy order."""
    counts = []
    for key, level_obj in iter_levels(hierarchy):
        label = level_obj.get('title', key)
        counts.append((key, label, sum(1 for _ in iter_level_filters(level_obj))))
    return counts


def main():
    """Main processing function"""
    print("🌳 Tree-related Microhabitats - Data Processing")
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

    # Dynamically extract column whitelist from hierarchy + metadata mapping.
    print("\n🔍 Extracting column whitelist...")
    habitat_columns = extract_columns_from_hierarchy(hierarchy)
    metadata_column_names = {m['column'] for m in species_metadata_cols}
    all_columns = metadata_column_names | habitat_columns

    print(f"   ✓ Species metadata fields: {len(species_metadata_cols)}")
    print(f"   ✓ Habitat columns: {len(habitat_columns)}")
    print(f"   ✓ Total columns to use: {len(all_columns)}")
    
    # Read Excel file. Header row is 1-indexed for human-friendliness (matches
    # Excel's UI) and converted to pandas' 0-indexed `header` parameter.
    print(f"\n📖 Reading {excel_input}...")
    sheet = column_config['pipeline'].get('speciesDataSheet', 0)
    header_row = column_config['pipeline'].get('speciesDataHeaderRow', 5)
    df = pd.read_excel(excel_input, sheet_name=sheet, header=header_row - 1)

    # Validate every column the config references actually exists in the
    # spreadsheet. Silent failure here used to produce empty species records
    # with no obvious cause, so we fail loudly and list everything that's
    # missing.
    sheet_cols = set(df.columns)
    missing_metadata = [
        f"{m['key']!r} → {m['column']!r}"
        for m in species_metadata_cols
        if m['column'] not in sheet_cols
    ]
    missing_habitats = sorted(habitat_columns - sheet_cols)
    if missing_metadata or missing_habitats:
        msg = [
            "",
            f"✗ Some columns referenced in {config_input} were not found in",
            f"  {excel_input} (sheet={sheet!r}, header row={header_row}).",
            "",
            "  Check:",
            "  - That speciesDataHeaderRow points at the row of column headers (1-indexed).",
            "  - That speciesDataSheet matches the intended sheet name.",
            "  - That each 'column' value in column-mapping.json matches the spreadsheet exactly.",
            "",
        ]
        if missing_metadata:
            msg.append(f"  Missing metadata columns ({len(missing_metadata)}):")
            msg.extend(f"    {m}" for m in missing_metadata)
            msg.append("")
        if missing_habitats:
            msg.append(f"  Missing habitat columns ({len(missing_habitats)}):")
            msg.extend(f"    {c!r}" for c in missing_habitats[:20])
            if len(missing_habitats) > 20:
                msg.append(f"    … and {len(missing_habitats) - 20} more")
        raise SystemExit("\n".join(msg))

    # Trim the frame to just the columns we care about - saves memory and
    # makes downstream row.get() lookups faster.
    available_cols = [col for col in df.columns if col in all_columns]
    df = df[available_cols]

    print(f"   ✓ Loaded {len(df)} rows")
    print(f"   ✓ Using {len(available_cols)} columns")
    
    # Validate speciesFilters references against speciesMetadataColumns.
    species_filters = column_config.get('speciesFilters', [])
    metadata_keys = {m['key'] for m in species_metadata_cols}
    invalid_refs = []
    for group in species_filters:
        group_field = group.get('field')
        if group_field and group_field not in metadata_keys:
            invalid_refs.append(f"group {group['id']!r} → group.field {group_field!r}")
        for opt in group.get('options', []):
            opt_field = opt.get('field')
            if opt_field and opt_field not in metadata_keys:
                invalid_refs.append(f"group {group['id']!r}, option {opt['id']!r} → field {opt_field!r}")
    if invalid_refs:
        raise SystemExit(
            "✗ speciesFilters references fields not present in speciesMetadataColumns:\n  "
            + "\n  ".join(invalid_refs)
        )

    # Validate shortCodes used by the URL-share codec. Two namespaces:
    #   1. Habitat filters: a single global pool. Every filter MUST carry a
    #      shortCode (no id fallback - habitat ids are too long to use as
    #      URL codes).
    #   2. Each speciesFilters group: its own per-group pool. shortCode is
    #      optional and falls back to the option's id (so options whose ids
    #      are already short and URL-safe - eif's "d4"/"d5", iucn's "LC"
    #      etc. - don't need a separate field).
    # All effective codes must match [A-Za-z0-9]{2,4}.
    code_pattern = re.compile(r'^[A-Za-z0-9]{2,4}$')
    code_errors = []

    habitat_seen: Dict[str, str] = {}  # code -> first filter id seen with it
    for _, level_obj in iter_levels(hierarchy):
        for filter_def in iter_level_filters(level_obj):
            fid = filter_def.get('id', '<no-id>')
            code = filter_def.get('shortCode')
            if not code:
                code_errors.append(f"habitat filter {fid!r}: missing shortCode")
                continue
            if not code_pattern.match(code):
                code_errors.append(
                    f"habitat filter {fid!r}: shortCode {code!r} fails [A-Za-z0-9]{{2,4}}"
                )
                continue
            if code in habitat_seen:
                code_errors.append(
                    f"habitat shortCode {code!r} duplicated: {habitat_seen[code]!r} and {fid!r}"
                )
            else:
                habitat_seen[code] = fid

    # Codes must be unique per SECTION (not just per group). Groups sharing
    # a sectionId (or, absent that, a section display string) collapse into
    # one URL param at encode time, so their codes share a namespace.
    # Groups without either fall back to their own id (backwards compatible:
    # ungrouped groups still get their own namespace).
    section_seen: Dict[str, Dict[str, str]] = {}
    for group in species_filters:
        gid = group.get('id', '<no-id>')
        section_key = group.get('sectionId') or group.get('section') or gid
        seen = section_seen.setdefault(section_key, {})
        for opt in group.get('options', []):
            oid = opt.get('id', '<no-id>')
            code = opt.get('shortCode') or oid
            if not code_pattern.match(str(code)):
                code_errors.append(
                    f"speciesFilters group {gid!r}, option {oid!r}: "
                    f"effective code {code!r} fails [A-Za-z0-9]{{2,4}}"
                )
                continue
            if code in seen:
                code_errors.append(
                    f"speciesFilters section {section_key!r}: code {code!r} "
                    f"duplicated: {seen[code]!r} and {gid!r}/{oid!r}"
                )
            else:
                seen[code] = f"{gid}/{oid}"

    if code_errors:
        raise SystemExit(
            "✗ shortCode validation failed:\n  " + "\n  ".join(code_errors)
        )

    # Build config for React app - preserve hierarchy order via sorted keys,
    # tagging each level with its numeric position so the frontend has a
    # stable level identifier independent of the key name.
    print("\n⚙️  Generating config.json...")
    react_config = {
        'app': {
            'title': 'Tree-related Microhabitat Explorer'
        },
        'filterHierarchy': [
            {'level': i + 1, **level_obj}
            for i, (_, level_obj) in enumerate(iter_levels(hierarchy))
        ],
        'speciesFilters': species_filters,
    }

    # Count filters per level
    counts = count_filters(hierarchy)
    total_filters = sum(n for _, _, n in counts)
    for _, label, n in counts:
        print(f"   ✓ {label}: {n} filters")
    print(f"   ✓ Total: {total_filters} filters")
    if species_filters:
        groups_n = len(species_filters)
        opts_n = sum(len(g.get('options', [])) for g in species_filters)
        print(f"   ✓ Species filters: {groups_n} groups, {opts_n} options")
    
    # Save config
    with open(config_output, 'w', encoding='utf-8') as f:
        json.dump(react_config, f, indent=2, ensure_ascii=False)
    print(f"   ✓ Saved to {config_output}")
    
    # Process species data
    print("\n🦋 Processing species data...")
    species_data = process_species(df, hierarchy, species_metadata_cols)
    print(f"   ✓ Processed {len(species_data)} species")

    # Calculate stats
    avg_habitats = sum(len(s['habitats']) for s in species_data) / len(species_data) if species_data else 0
    print(f"   ✓ Average {avg_habitats:.1f} habitats per species")

    # Merge iNaturalist photo cache if present (optional - script is usable without it)
    photo_cache_path = Path('data/inaturalist-photos.json')
    photo_cache = load_photo_cache(photo_cache_path)
    if photo_cache:
        print(f"\n📷 Merging photo metadata from {photo_cache_path}...")
        photo_stats = attach_photos(species_data, photo_cache)
        print(f"   ✓ With photo:           {photo_stats['with_photo']}")
        print(f"   ✓ All rights reserved:  {photo_stats['all_rights_reserved']}")
        print(f"   ✓ On iNat, no photo:    {photo_stats['no_photo']}")
        print(f"   ✓ Inactive (renamed):   {photo_stats['inactive_taxon']}")
        print(f"   ✓ Not on iNat:          {photo_stats['not_found']}")
        print(f"   ✓ Not yet fetched:      {photo_stats['missing']}")
        print(f"   ✓ With iNat taxon id:   {photo_stats['with_taxon_id']}")
    else:
        print(f"\n📷 No photo cache at {photo_cache_path} - skipping.")
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