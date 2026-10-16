# Tree-related Microhabitat Explorer

**Last updated:** 16 October 2026
**App version:** 1.0.0 (`react-app/package.json`)
**Production:** https://trem-explorer.org.uk · **Test:** https://trem-explorer.nicksynes.com
**Organisation:** Forest Research · **Developer:** Nick Synes

## Overview

A static React web app for finding UK species (England, Scotland and Wales) associated with Tree-related Microhabitats (TreMs). The user ticks the habitat features present on a tree in the left panel, and the right panel lists the species that could be using them. The species list can then be narrowed further by taxon group, conservation designation and free-text search.

There is no backend. All data comes from a spreadsheet that a Python script converts into two JSON files, which are bundled into the app at build time.

## Naming reference

The app uses a fixed set of names for its parts. Use these names in code comments, docs and conversations about the app so everyone is talking about the same thing.

### Spelling of "TreM"

- The project spelling is **TreM** (singular) and **TreMs** (plural), as used in the UI, the Help text and the field guide.
- Don't use "TReM" (capital R) anywhere.
- In full: **Tree-related Microhabitat(s)**, with a lower-case "r" after the hyphen.
- The app's title is **Tree-related Microhabitat Explorer** (singular "Microhabitat"). It is set in `scripts/process-data.py`, not in the column mapping.

### Parts of the screen

| UI name | What it is | Where it lives in code |
|---|---|---|
| **Header** | App title plus the **About** (ⓘ) and **Help** (?) icon buttons | `App.jsx` |
| **Habitat Features** panel | Left panel: the habitat filters | `FilterPanel.jsx` |
| **Active Filters** | Summary strip at the top of Habitat Features. Shows selected filters as removable chips, grouped by section | `FilterPanel.jsx` → `ActiveFiltersBody` |
| **Woodland Characteristics** section | First section of the left panel: **Location**, **Woodland Type**, **Tree Type** | config `level1`–`level3` |
| **Tree-related Microhabitats** section | Second section of the left panel: the 52 TreM filters, grouped into the seven forms | config `level4` |
| **Associated Species** panel | Right panel: the filtered species list | `SpeciesGrid.jsx` |
| **Taxa** row | Always-visible chip row ("All", Mammals, Birds, …), each chip showing a count | `SpeciesGrid.jsx` → `AlwaysVisibleGroup` |
| **Search** | "Find species by scientific or common name..." | `SpeciesGrid.jsx` |
| **More filters** | Collapsible panel containing the **Taxon designations** section | `MoreFiltersPanel.jsx` |
| **Sort** dropdown | Taxon (Species) A→Z · Taxon (Order) A→Z · IUCN severity | `SpeciesGrid.jsx` |
| **Card view / List view** | Toggle for how results are shown (the choice is remembered in `localStorage`) | `SpeciesCard.jsx`, `SpeciesListItem.jsx` |
| **Species detail** modal | Opens when a species is clicked | `SpeciesDetailModal.jsx` |
| **About** modal | What TreMs are, data source, disclaimer, credits | `App.jsx` |
| **Help** modal | Definition of a TreM, how to use the tool, and an explanation of each filter | `App.jsx` |
| **Panel tabs** | Mobile only (≤1024px): switches between "Habitat Features" and "Associated Species" | `PanelTabs.jsx` |
| **Back to top** | Floating scroll button | `BackToTop.jsx` |

### Naming the TreM hierarchy

The TreMs follow Bütler et al. (2024), *Field Guide to Tree-related Microhabitats*. The Help modal links to that guide, and so does the description line under the Tree-related Microhabitats heading. The UI text and the config use different names for the same three levels:

| Level | Help/UI wording | Config key (`column-mapping.json`) | How it is rendered | Count |
|---|---|---|---|---|
| Top | **form** (e.g. "Cavities") | `groups[]`, each with `id`, `title` and `description` | Bold heading with a "select all" checkbox (shows as indeterminate when only some are ticked) | 7 |
| Middle | (subheading, e.g. "Rot Holes") | `groups[].categories[]` | Small subheading. **Only shown when a form has more than one category** | 18 |
| Bottom | **TreM type** (e.g. "Trunk Rot Hole") | `categories[].filters[]` | Checkbox | 52 |

In code, the "groups" shape is detected by `levelShape()` in `dataHelpers.js`. The Help text calls this top level "forms", so "group" in code means "form" in the UI.

### Woodland Characteristics filters

| Filter (section heading) | Options | Spreadsheet columns | URL codes |
|---|---|---|---|
| **Location** | England, Scotland, Wales | `Distribution_England` / `_Scotland` / `_Wales` | `eng` `sco` `wal` |
| **Woodland Type** | Closed Canopy, Open Grown | `Closed Canopy`, `Open Grown` | `ccp` `ogn` |
| **Tree Type** | Conifer, Broadleaved | `Conifer`, `Broadleaved` | `con` `brd` |

### Tree-related Microhabitat filters

The app labels are written for the UI and often differ from the spreadsheet column headers. The spreadsheet number (1–52) matches the field guide's numbering. The URL code is what appears in `?h=` in shared links.

#### Cavities (15) · `id: cavity`

| Category | App label | Spreadsheet column | URL code |
|---|---|---|---|
| Woodpecker breeding cavities | Small Woodpecker Nesthole | `1 Small woodpecker breeding cavity` | `swn` |
| Woodpecker breeding cavities | Medium Woodpecker Nesthole | `2 Medium-sized woodpecker breeding cavity` | `mwn` |
| Woodpecker breeding cavities | Large Woodpecker Nesthole | `3 Large woodpecker breeding cavity` | `lwn` |
| Woodpecker breeding cavities | Woodpecker Flute | `4 Woodpecker “flute”` | `wfl` |
| Rot Holes | Trunk-base Rot Hole | `5 Trunk-base rot-hole (ground contact)` | `tbr` |
| Rot Holes | Trunk Rot Hole | `6 Trunk rot-hole (no ground contact)` | `trh` |
| Rot Holes | Semi-open Rot Hole | `7 Semi-open trunk rot-hole` | `sor` |
| Rot Holes | Chimney Trunk-base Rot Hole | `8 Chimney trunk-base rot-hole (ground contact)` | `ctb` |
| Rot Holes | Chimney Trunk Rot Hole | `9 Chimney trunk rot-hole (no ground contact)` | `ctr` |
| Rot Holes | Hollow Branch | `10 Hollow branch` | `hbr` |
| Insect Galleries | Insect Gallery and Borehole | `11 Insect galleries and bore holes` | `igb` |
| Concavities | Dendrotelm | `12 Dendrotelm` | `den` |
| Concavities | Woodpecker Foraging | `13 Large woodpecker foraging excavation` | `wfo` |
| Concavities | Bark-lined Concavity | `14 Bark-lined trunk concavity` | `blc` |
| Concavities | Buttress Root Concavity | `15 Buttress-root concavity` | `brc` |

#### Injuries and Exposed Wood (10) · `id: injury`

| Category | App label | Spreadsheet column | URL code |
|---|---|---|---|
| Exposed Sapwood only | Bark Loss | `16 Bark loss` | `bls` |
| Exposed Sapwood only | Fire Scar | `17 Fire scar` | `fsc` |
| Exposed Sapwood only | Bark Shelter | `18 Bark shelter` | `bsh` |
| Exposed Sapwood only | Bark Pocket | `19 Bark pocket` | `bpk` |
| Exposed Sapwood and Heartwood | Stem Breakage | `20 Stem breakage` | `stb` |
| Exposed Sapwood and Heartwood | Limb Breakage | `21 Limb breakage` | `lib` |
| Exposed Sapwood and Heartwood | Crack | `22 Crack` | `crk` |
| Exposed Sapwood and Heartwood | Lightning Scar | `23 Lightning scar` | `lsc` |
| Exposed Sapwood and Heartwood | Fork Split | `24 Fork split at the intersection` | `fks` |
| Exposed Sapwood and Heartwood | Beaver Gnawing | `25 Trunk gnawed by beavers` | `bgn` |

#### Crown Deadwood (3) · `id: crown_deadwood`

There is only one category ("Dead Branches"), so no subheading is shown.

| Category | App label | Spreadsheet column | URL code |
|---|---|---|---|
| Dead Branches | Dead Branches | `26 Dead branches` | `dbr` |
| Dead Branches | Dead Top | `27 Dead top` | `dtp` |
| Dead Branches | Remnant Broken Limb | `28 Remnants of a broken limb` | `rbl` |

#### Excrescences (5) · `id: excrescences`

| Category | App label | Spreadsheet column | URL code |
|---|---|---|---|
| Twig Tangles | Witches Broom | `29 Witches’ broom` | `wbr` |
| Twig Tangles | Epicormic Shoots | `30 Epicormic shoots` | `epi` |
| Galls | Galls | `31 Galls` | `gal` |
| Burrs and Cankers | Burr | `32 Burr` | `bur` |
| Burrs and Cankers | Canker | `33 Canker` | `ckr` |

#### Fungal Fruiting Bodies and Slime Moulds (6) · `id: fungal_fruiting`

| Category | App label | Spreadsheet column | URL code |
|---|---|---|---|
| Perennial fungal fruiting bodies | Perennial Polypore | `34 Perennial polypore` | `pep` |
| Ephemeral fungal fruiting bodies | Annual Polypore | `35 Annual polypore` | `anp` |
| Ephemeral fungal fruiting bodies | Pulpy Agaric | `36 Pulpy agaric` | `pag` |
| Ephemeral fungal fruiting bodies | Crustose Fungi | `37 Corticoid fungi (crust fungi)` | `crf` |
| Ephemeral fungal fruiting bodies | Pyrenomycetoid | `38 Large pyrenomycetoid fungi ` (trailing space) | `pyr` |
| Slime Moulds | Slime Mould | `39 Myxomycetes or plasmodial slime moulds` | `slm` |

#### Epiphytic and Epixylic Structures (11) · `id: epixylic`

| Category | App label | Spreadsheet column | URL code |
|---|---|---|---|
| Epiphytes | Bryophyte | `40 Bryophytes ` (trailing space) | `bry` |
| Epiphytes | Lichen | `41 Foliose and fruticose lichens` | `lic` |
| Epiphytes | Ivy and Liana | `42 Ivy and lianas (woody vines)` | `ivl` |
| Epiphytes | Ferns | `43 Ferns` | `fer` |
| Epiphytes | Mistletoe | `44 Mistletoe` | `mis` |
| Nests | Vertebrate Nest | `45 Vertebrate nest` | `vrn` |
| Nests | Invertebrate Nest | `46 Invertebrate nest` | `inn` |
| Microsoil | Bark Microsoil | `47 Bark microsoil` | `bms` |
| Microsoil | Inter-bark Microsoil | `48 Inter-bark microsoil` | `ibm` |
| Microsoil | Crown Microsoil | `49 Crown microsoil` | `cms` |
| Alluvial Deposits | Clay or Silt Deposit | `50 Clay or silt deposit` | `csd` |

#### Exudates (2) · `id: exudates`

There is only one category, and it has no title.

| Category | App label | Spreadsheet column | URL code |
|---|---|---|---|
| — | Sap Run | `51 Sap run` | `srn` |
| — | Heavy Resinosis | `52 Heavy resinosis` | `hre` |

### Species filters (right panel)

Defined under `speciesFilters` in `column-mapping.json`.

| UI name | Config `id` | Where shown | Options | URL param |
|---|---|---|---|---|
| **Taxa** | `class` | Always-visible chip row | Mammals, Birds, Amphibians & Reptiles, Beetles, Flies, Moths, Spiders, Other invertebrates, Fungi, Lichens, Plants | `class` |
| **Taxon designations** → Conservation Priority | `priority` | More filters | P-Eng, P-Sco, P-Wal, P-NI | `tdi` |
| **Taxon designations** → Environmental Indicator Frameworks | `eif` | More filters | D4, D5 | `tdi` |
| **Taxon designations** → IUCN Red List Status | `iucn` | More filters | IUCN: RE, CR, EN, VU, NT, LC, DD | `tdi` |

The three Taxon designations groups share `section: "Taxon designations"` and `sectionId: "tdi"`. This means they appear together under one heading, are OR'd together (see Filtering logic below), and are stored in a single `tdi` URL parameter.

## Architecture

### Technology stack

- **Frontend:** React 18 + Vite 5
- **State:** Zustand 4 (`src/store/useFilterStore.js`)
- **Styling:** plain CSS (`src/styles/theme.css`, `src/styles/modal.css`)
- **Data pipeline:** Python 3 + pandas/openpyxl
- **Photos:** iNaturalist API (cached in a local file, see below)
- **Hosting:** static files. Production is nginx on the Forest Research server; test is AWS S3 + CloudFront via SAM.

### Data pipeline

```
data/sources/TreM_Explorer_v1_01Oct26.xlsx   (sheet "Data", header row 2)
data/column-mapping.json                     (filter hierarchy, labels, URL codes)
data/inaturalist-photos.json                 (photo cache, optional)
        ↓
scripts/process-data.py
        ↓
react-app/src/data/config.json   (filter hierarchy + species filters for the UI)
react-app/src/data/species.json  (660 species)
        ↓
React app (both JSON files are imported and bundled at build time)
```

**`data/column-mapping.json` is the single source of truth** for every filter, label, description, spreadsheet column and URL code. The React code doesn't hardcode filter names. It walks whatever the config describes, so you can rename, reorder or add filters without changing any code.

`process-data.py` does the following:
- Reads the spreadsheet named in `pipeline.speciesDataFile`, using `speciesDataSheet` and `speciesDataHeaderRow`.
- Stops with a list of every missing column if any config column isn't in the spreadsheet.
- Checks the URL short codes: every habitat filter must have a code, all codes must match `[A-Za-z0-9]{2,4}`, and codes must be unique within their namespace.
- Checks that every `speciesFilters` field exists in `speciesMetadataColumns`.
- Copies every hierarchy level into `config.json` unchanged, apart from adding a numeric `level`. Any new field you add to a level (e.g. `description`, `descriptionLink`) therefore reaches the frontend automatically.
- Converts "yes"/blank cells to booleans. Each species' `habitats` becomes an array of habitat filter IDs.
- Merges in iNaturalist photo data and taxon IDs when `data/inaturalist-photos.json` exists.

### Optional config fields on a hierarchy level

| Field | Effect |
|---|---|
| `section` | Groups consecutive levels under one `<h2>` (e.g. "Woodland Characteristics") |
| `title` | Level subheading. Only shown when the section has more than one level |
| `description` | Italic paragraph shown under the level |
| `descriptionLink` `{label, url}` | Link appended to the description (opens in a new tab with ↗). Currently used for the Bütler et al. field guide under Tree-related Microhabitats |

### Species record (`species.json`)

| Field | Spreadsheet column |
|---|---|
| `scientificName` | `ScientificName` |
| `commonName` | `Common Name` |
| `class` | `Taxon: group1` (holds the Taxa values, e.g. "Beetles") |
| `order` | `Taxon: Order` |
| `family` | `Taxon: Family` |
| `iucnStatus` | `Red List Status (GB)` |
| `distribution` | `Distribution_GB` |
| `habitatRequirements` | `Species Notes` |
| `priorityEngland` / `Scotland` / `Wales` / `NI` / `Europe` | `Priority (…)` (yes/blank → boolean) |
| `d4`, `d5` | `EIF D4 Target`, `EIF D5 Target` (yes/blank → boolean) |
| `habitats` | Array of habitat filter IDs (from all four hierarchy levels) |
| `photo` | `{url, smallUrl, largeUrl, attribution, licenseCode}` or `null` |
| `taxonId` | iNaturalist taxon ID or `null` |

`priorityEurope` is loaded but not currently used by any filter or display.

## Filtering logic

**Habitat Features (left panel)**: OR within a level, AND between levels:

```
(Location A OR B …) AND (Woodland Type …) AND (Tree Type …) AND (any ticked TreM)
```

- All 52 TreMs form **one** level. Ticking several TreMs, even across different forms, means "species using any of these".
- A level with nothing ticked is treated as "ALL".

**Associated Species (right panel)** is applied on top of the habitat result:
- **Taxa**: OR between the selected taxa.
- **Taxon designations**: Priority, EIF and IUCN selections are all OR'd together, because they share a `section`.
- Taxa AND Taxon designations AND search.
- Each chip's count shows how many species you would get by selecting that option. It takes every other active filter into account, apart from the other selections in the chip's own section.

If filtering removes the species whose detail modal is open, the modal closes automatically.

## Shareable URLs

All filter state is kept in the URL (`src/utils/urlCodec.js`, `src/hooks/useUrlSync.js`):

```
?h=lwn,trh,eng          habitat filters (short codes, all levels share one namespace)
&class=bee,mot          Taxa
&tdi=eng,d4,EN          Taxon designations (priority / eif / iucn share one namespace)
&sort=iucn|order        omitted for the default sort (name)
&m=lucanus-cervus       open species modal (slug of the scientific name)
```

- Codes within each parameter are sorted, so the same state always produces the same URL.
- Unknown codes are ignored, so old links still work after a filter is renamed or removed.
- Filter changes update the URL with `replaceState`. Opening a modal uses `pushState`, so the browser Back button closes the modal.
- On mobile, a link containing `?m=` opens on the Associated Species tab.
- The search text and the card/list choice are **not** stored in the URL.

**Changing a short code breaks existing shared links** for that filter. Change one only if you have to.

## Species display

- **Card**: photo (or a "No photo available" placeholder), scientific name, common name, Order and Family tags, then Priority List (England only), D4, D5, IUCN Status and Distribution (GB).
- **List row**: scientific name, Order, and compact designation badges (e.g. `P-Eng`, `D4`, `EN`). The long form appears on hover.
- **Species detail modal**: large photo with attribution, common name, "View on iNaturalist →" link, then these sections:
  - Taxonomy (Class/Order/Family)
  - Taxon designations (long-form labels taken from each option's `tooltip`)
  - Distribution in Great Britain
  - Habitat Requirements
  - Habitat Associations: Woodland Type, Tree Type and TreMs grouped by form. Location is left out because the Distribution section already covers it.

## Project structure

```
/
├── data/
│   ├── column-mapping.json        # Single source of truth for filters and labels
│   ├── inaturalist-photos.json    # iNat photo cache (written by fetch-photos.py)
│   ├── photo-overrides.json
│   └── sources/                   # Source spreadsheets (current + historical), guide PDF, docs (gitignored)
├── scripts/
│   ├── process-data.py            # Spreadsheet + config → config.json + species.json
│   ├── fetch-photos.py            # Fills the iNaturalist photo cache
│   ├── investigate-renames.py     # One-off: looks up species not found on iNat
│   └── report-to-csv.py           # Converts the rename report to CSV
├── deploy/
│   ├── nginx-prod/                # Production (trem-explorer.org.uk)
│   └── aws-test/                  # Test (trem-explorer.nicksynes.com), AWS SAM
└── react-app/
    ├── public/
    │   ├── trems-overview-image.jpg   # Image used in the About/Help modals
    │   └── logos/                     # Contributor logos (About modal), listed in CONTRIBUTOR_LOGOS in App.jsx
    └── src/
        ├── App.jsx                # Layout, header, About + Help modals, image lightbox
        ├── components/
        │   ├── FilterPanel.jsx        # Habitat Features panel + Active Filters
        │   ├── SpeciesGrid.jsx        # Associated Species panel, Taxa row, search, sort, view toggle
        │   ├── MoreFiltersPanel.jsx   # Taxon designations chips
        │   ├── SpeciesCard.jsx
        │   ├── SpeciesListItem.jsx
        │   ├── SpeciesDetailModal.jsx
        │   ├── Modal.jsx
        │   ├── PanelTabs.jsx          # Mobile tab switcher
        │   └── BackToTop.jsx
        ├── hooks/useUrlSync.js    # Two-way URL ↔ store sync
        ├── store/useFilterStore.js
        ├── utils/
        │   ├── dataHelpers.js     # Level-shape helpers, filtering predicates, sort comparators
        │   └── urlCodec.js        # URL encode/decode
        ├── styles/                # theme.css, modal.css
        └── data/                  # Generated - do not edit by hand
            ├── config.json
            └── species.json
```

## Development workflow

```bash
# Setup
pip install pandas openpyxl requests
cd react-app && npm install

# Dev server (http://localhost:5173)
cd react-app && npm run dev

# Production build → react-app/dist/
cd react-app && npm run build
```

### Updating the data

1. Put the new spreadsheet in `data/sources/`.
2. Update `pipeline.speciesDataFile` (and the sheet or header row if they've changed) in `data/column-mapping.json`.
3. From the repo root, run `python scripts/process-data.py`. If any columns were renamed in the spreadsheet, the script stops and lists them.
4. Optionally run `python scripts/fetch-photos.py` to fetch photos for new species, then run `process-data.py` again.

### Renaming or adding a filter

- **Rename a label:** edit `label` (or `title` for a form/category/section) in `column-mapping.json`, then run `process-data.py`.
- **Add a TreM or other habitat filter:** add `{id, label, column, shortCode}` to the right level/category, then run `process-data.py`. No code changes are needed.
- **Add a species-filter option:** add it to the right `speciesFilters` group. If the field is new, also add it to `speciesMetadataColumns`.
- Remember that the Help modal text in `App.jsx` lists the seven forms by name. Update it if you rename a form.

## Deployment

See `deploy/README.md`.
- **Production** (`trem-explorer.org.uk`): `deploy/nginx-prod/prod-deployment.md`. nginx serves the static `dist/` on the Forest Research server.
- **Test** (`trem-explorer.nicksynes.com`): `deploy/aws-test/DEPLOYMENT.md` and `deploy.sh` (AWS SAM, S3 and CloudFront).

## History

- **Current:** React + Vite + Zustand. Four-level hierarchy with 59 habitat filters, sections, species filters, iNaturalist photos, shareable URLs and a mobile tab layout.
- **v1.0 (March 2026):** First React version. Three-level hierarchy with 51 filters, built from `SpeciesTreMsPaper_v1_18Mar.xlsx`.
- **Earlier:** React CSV prototype, and before that an R-Shiny version.

## License

Proprietary – Forest Research. © Crown Copyright 2026.
