# Cache Building & Deployment Workflow

This document explains how to work with the production-optimized caching system.

## Architecture

**Production (shinyapps.io):**
- Only loads pre-built cache (fast - milliseconds)
- No CSV file deployed (~6MB saved)
- Simple, robust runtime

**Development (Local):**
- Build cache from CSV using `build_cache.R`
- CSV hash-based validation
- Heavy lifting done locally

## File Organization

```
R/
├── data.R          # Production code (load cache only)
├── config.R        # Configuration loading
├── ui.R           # UI components
└── server.R       # Server logic

build_cache.R       # Local cache building script
cache/
└── species_cards.rds  # Pre-built cache (deployed)
data/
└── *.csv          # CSV data (NOT deployed)
```

## Workflow

### When Data Changes

**Step 1: Update CSV**
```bash
# Edit your CSV file
vim "data/Tree_TreMs_species spreadsheet.csv"
```

**Step 2: Build Cache Locally**
```bash
Rscript build_cache.R
# Or in R console:
source("build_cache.R")
```

Output:
```
=== Building Species Data Cache ===

Calculating CSV content hash...
  Hash: a1b2c3d4e5...

Loading CSV data: data/Tree_TreMs_species spreadsheet.csv
  Loaded 682 species with 9061 columns

Computing habitat associations...
  Progress: 100 / 682
  Progress: 200 / 682
  ...
  Completed habitat computation

Saving cache...
  Cache file: cache/species_cards.rds
  Size: 5.12 MB
  Created: 2026-03-13 10:53:36

✓ Cache built successfully!
```

**Step 3: Test Locally**
```r
shiny::runApp()
```

Should show:
```
Loading species data from cache...
✓ Loaded 682 species from cache
  Cache created: 2026-03-13 10:53:36
  Dataset size: 682 rows × 9062 columns
```

**Step 4: Deploy to shinyapps.io**
```r
source("deploy_shinyapps.R")
```

### What Gets Deployed

**Included:**
- ✅ `cache/species_cards.rds` (pre-built cache)
- ✅ `R/*.R` (production code)
- ✅ `app.R`, `config.yaml`

**Excluded (via `.rsconnectignore`):**
- ❌ `data/` (CSV files)
- ❌ `build_cache.R` (build script)
- ❌ Documentation files
- ❌ Git files

## Production Behavior

On shinyapps.io, the app:
1. Starts up
2. Loads cache file (fast!)
3. Runs immediately

**If cache is missing:**
```
Error: Cache file not found: cache/species_cards.rds
Run 'source("build_cache.R")' locally to build cache first.
```

This is intentional - production should always have pre-built cache.

## Cache Metadata

The cache file stores:
```r
list(
  csv_hash = "md5-hash-of-source-csv",
  csv_file = "path/to/original/csv",
  created = timestamp,
  nrows = 682,
  ncols = 9062,
  data = species_data_frame
)
```

## Benefits

✅ **Fast Production**: Loads in milliseconds (no CSV parsing)  
✅ **Smaller Deployment**: ~6MB smaller (no CSV)  
✅ **Explicit Dependencies**: Cache must exist  
✅ **Clean Separation**: Build vs. Runtime  
✅ **Industry Standard**: Build artifacts pattern  

## Troubleshooting

### "Cache file not found" error locally
**Solution:** Run `source("build_cache.R")`

### "Cache file not found" on shinyapps.io
**Solution:** 
1. Build cache locally: `source("build_cache.R")`
2. Verify cache exists: `file.exists("cache/species_cards.rds")`
3. Deploy: `source("deploy_shinyapps.R")`

### Cache seems outdated after CSV change
**Solution:** Rebuild cache with `source("build_cache.R")`

### Deployment includes CSV files
**Solution:** Check `.rsconnectignore` includes `data/`

## Quick Reference

```bash
# Build cache
Rscript build_cache.R

# Test locally
R -e "shiny::runApp()"

# Deploy
R -e "source('deploy_shinyapps.R')"
```

---

**Last updated:** March 13, 2026