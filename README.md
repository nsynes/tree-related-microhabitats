# Tree-Related Microhabitats Species Explorer

A web application for exploring species associated with tree-related microhabitats (TreMs). Filter by woodland type, tree characteristics, and specific microhabitats to discover which species use particular habitat features.

## Quick Start

### Prerequisites

- Python 3.x with pandas (`pip install pandas openpyxl`)
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd tree-related-microhabitats

# Install React app dependencies
cd react-app
npm install
```

### Development

```bash
# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Data Updates

When the client provides updated Excel data:

```bash
# 1. Place new Excel file in data/ directory
# 2. Update filename in scripts/process-data.py if needed
# 3. Run data processing:
python scripts/process-data.py

# 4. Restart dev server to see changes
cd react-app
npm run dev
```

## Deployment

### Build for Production

```bash
cd react-app
npm run build
# Output: react-app/dist/
```

### Deploy to AWS S3

```bash
# Using AWS SAM (recommended)
sam build
sam deploy --guided

# Or manually upload dist/ folder to S3 bucket
aws s3 sync react-app/dist/ s3://your-bucket-name/ --delete
```

See [Deployment Guide](react-app/PROJECT_SUMMARY.md#deployment) for details.

## Project Structure

```
tree-related-microhabitats/
├── scripts/
│   └── process-data.py          # Data processor (Excel → JSON)
├── data/
│   ├── SpeciesTreMsPaper_v1_18Mar.xlsx
│   └── archive/
├── react-app/                   # React application
│   ├── src/
│   │   ├── components/
│   │   ├── data/               # Generated JSON files
│   │   ├── store/
│   │   └── styles/
│   ├── dist/                   # Production build
│   └── package.json
└── archived/                   # Legacy R-Shiny code
```

## Features

- **3-Level Hierarchical Filtering**
  - Woodland Type (5 options)
  - Tree Characteristics (6 options)
  - Microhabitats (40 options across 7 categories)

- **678 Species** with detailed information:
  - Scientific & common names
  - Taxonomic classification
  - Conservation status
  - Distribution
  - Habitat requirements

- **Smart Filtering**
  - Real-time results
  - AND/OR logic across levels
  - Active filters summary with removable chips

## Documentation

- **[PROJECT_SUMMARY.md](react-app/PROJECT_SUMMARY.md)** - Comprehensive technical documentation
- **[scripts/process-data.py](scripts/process-data.py)** - Data processing script with inline docs

## Tech Stack

- React 18 + Vite 5
- Zustand (state management)
- Python + Pandas (data processing)
- AWS S3 (deployment)

## Adding New Filters

1. Client updates Excel with new columns
2. Update `scripts/process-data.py`:
   ```python
   # Add to appropriate level function:
   def generate_level2_filters():
       # ... existing filters ...
       {'id': 'new_filter', 'label': 'New Filter', 'column': 'ExcelColumnName'}
   ```
3. Run `python scripts/process-data.py`
4. Test and deploy

## Support

- **Developer:** Nick S
- **Client:** Forest Research (Katty Baird)
- **Issues:** Report via GitHub issues

## License

Proprietary - Forest Research