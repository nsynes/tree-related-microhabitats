# Tree-related Microhabitat & Species Explorer

An R Shiny web application for exploring relationships between Tree-re;ated microhabitats (TreMs) and associated species.

## Features00

- **Interactive habitat filtering** - Select habitat features and instantly see matching species
- **Fast performance** - Pre-rendered cards with CSS show/hide for instant filtering
- **Intelligent caching** - Species data is cached for fast subsequent startups
- **Config-driven** - All filters and UI defined in YAML configuration
- **Modular architecture** - Clean separation of concerns following R Shiny best practices

## Project Structure

```
r-shiny-species-habitats/
├── app.R                    # Main entry point
├── config.yaml              # Configuration (filters, theme, data)
├── install_packages.R       # Package management
├── R/                       # R modules
│   ├── config.R            # Configuration loading
│   ├── data.R              # Data loading and caching
│   ├── ui_helpers.R        # UI generation functions
│   ├── ui.R                # Main UI definition
│   └── server.R            # Server logic
├── cache/                   # Cached species data (auto-generated)
│   └── species_cards.rds
└── data/                    # Source data
    └── Tree_TreMs_species spreadsheet.csv
```

## Installation

### Prerequisites

- R (>= 4.0.0)
- RStudio (recommended)

### Install Dependencies

Run the installation script to install all required R packages:

```r
Rscript install_packages.R
```

Required packages:
- shiny
- bslib
- shinyjs
- dplyr
- yaml

## Usage

### Running the App

From R or RStudio:

```r
shiny::runApp()
```

Or from the command line:

```r
R -e "shiny::runApp()"
```

The app will:
1. Load configuration from `config.yaml`
2. Check for cached species data
3. If cache is valid, load instantly
4. If not, build species data and cache it
5. Launch the interactive web application

### Updating Data

When you update the species data CSV file, this should be automatically detected when restarting the app as we use a content hash for the CSV file.

### Modifying Filters

All habitat filters are defined in `config.yaml`. To add/modify/remove filters:

1. Edit `config.yaml`
2. Restart the app - changes will be applied automatically

No code changes needed!

## Configuration

The `config.yaml` file controls:

- **Application settings** - Title, subtitle, data file path
- **Habitat filters** - All filter definitions (ID, label, column, search terms)
- **UI structure** - Accordion panels and categories
- **Theme colors** - Color palette for the interface

## Performance

- **Initial load**: Builds cache on first run (5-10 seconds)
- **Subsequent loads**: Loads from cache (< 1 second)
- **Filtering**: Instant (CSS show/hide, no re-rendering)

## Development

### Module Responsibilities

- **R/config.R**: Load YAML, build habitat mapping
- **R/data.R**: Load CSV, compute habitat matches, caching
- **R/ui_helpers.R**: CSS generation, accordion builders
- **R/ui.R**: Main UI layout and species cards
- **R/server.R**: Filtering logic, reactive updates

### Testing

To test the app locally:

```r
shiny::runApp()
```

Navigate to `http://localhost:XXXX` (port shown in console)

## Acknowledgments

ADD REFERENCES TO PAPER, DATA, KATTY'S WORK...
