# Tree-Related Microhabitat Explorer

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

When the TreMs data has been updated:

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

Two separate deployments live under [`deploy/`](deploy/):
- [`deploy/nginx-prod/`](deploy/nginx-prod/) — the production nginx setup at
  `trem-explorer.org.uk` (see `prod-deployment.md`).
- [`deploy/aws-test/`](deploy/aws-test/) — AWS SAM setup used for test at
  `trem-explorer.nicksynes.com` (see `DEPLOYMENT.md` and `deploy.sh`).

## Project Structure

```
tree-related-microhabitats/
├── scripts/
│   └── process-data.py          # Data processor (Excel → JSON)
├── data/
│   ├── SpeciesTreMsPaper_v1_18Mar.xlsx
├── react-app/                   # React application
│   ├── src/
│   │   ├── components/
│   │   ├── data/               # Generated JSON files
│   │   ├── store/
│   │   └── styles/
│   ├── dist/                   # Production build
│   └── package.json
```

## Documentation

- **[PROJECT_SUMMARY.md](react-app/PROJECT_SUMMARY.md)** - Comprehensive technical documentation
- **[scripts/process-data.py](scripts/process-data.py)** - Data processing script with inline docs

## Tech Stack

- React 18 + Vite 5
- Zustand (state management)
- Python + Pandas (data processing)
- AWS S3 (deployment)
