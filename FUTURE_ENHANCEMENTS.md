# Future Enhancements

This document tracks potential improvements to consider when needs arise.

## Hash-Based Cache Versioning (Not Currently Needed)

**When to implement:** If data updates become frequent or changes cause production issues

### Current System
- Single cache file: `cache/species_cards.rds`
- Rebuilds on data changes
- Simple but no version history

### Proposed Enhancement

**Hash-based versioning with rollback capability:**

```
cache/
├── species_cards_a1b2c3d4.rds  # Version 1 (CSV hash: a1b2c3d4...)
├── species_cards_e5f6g7h8.rds  # Version 2 (CSV hash: e5f6g7h8...)
└── species_cards.rds           # Symlink → current version
```

### Implementation Sketch

```r
# In build_cache.R:
# Save cache with hash in filename
hash_short <- substr(current_hash, 1, 8)
cache_versioned <- file.path(
  dirname(cache_file),
  paste0("species_cards_", hash_short, ".rds")
)
saveRDS(cache_obj, cache_versioned)

# Symlink to current
file.symlink(basename(cache_versioned), cache_file)
```

### Benefits
- Automatic versioning (no manual version numbers)
- Easy rollback if data changes cause issues
- Audit trail of all data versions
- Hash directly links cache to source CSV

### Workflow After Implementation
```bash
# Normal: Just build and deploy
Rscript build_cache.R
R -e "source('deploy_shinyapps.R')"

# Rollback: Switch symlink to previous version
ln -sf species_cards_a1b2c3d4.rds cache/species_cards.rds
R -e "source('deploy_shinyapps.R')"
```

**Estimated implementation time:** 15 minutes

---

## Other Future Ideas

### React/JavaScript Migration
- Considered for complex client-side interactions
- Current R Shiny works well for now
- CSV data easily converts to JSON for React
- Would enable S3 static hosting ($0.50/month vs $9/month)

### Lazy Data Loading
- Load species data on-demand rather than all upfront
- Only needed if dataset grows significantly
- Current 682 species loads quickly

### Database Backend
- Replace CSV with SQLite/PostgreSQL
- Only if data becomes too large (>10MB)
- Adds complexity but enables better querying

---

Last updated: March 13, 2026