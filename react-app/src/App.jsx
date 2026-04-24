import { useEffect, useState } from 'react';
import useFilterStore from './store/useFilterStore';
import FilterPanel from './components/FilterPanel';
import SpeciesGrid from './components/SpeciesGrid';
import Modal from './components/Modal';
import config from './data/config.json';
import speciesData from './data/species.json';

function App() {
  const [loading, setLoading] = useState(true);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const setSpecies = useFilterStore(state => state.setSpecies);

  useEffect(() => {
    // Load species data on mount
    setSpecies(speciesData);
    setLoading(false);
  }, [setSpecies]);

  if (loading) {
    return (
      <div className="loading">
        <p>🌳 Loading species data...</p>
      </div>
    );
  }

  return (
    <>
      <header className="main-title">
        <h1>{config.app.title}</h1>
        <div className="header-icons">
          <button
            className="icon-btn"
            onClick={() => setIsInfoOpen(true)}
            title="About this application"
            aria-label="About"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <button
            className="icon-btn"
            onClick={() => setIsHelpOpen(true)}
            title="Help & instructions"
            aria-label="Help"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4" />
              <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </header>
      
      <main className="app-layout">
        <FilterPanel config={config} />
        <SpeciesGrid config={config} />
      </main>

      {/* Info Modal */}
      <Modal 
        isOpen={isInfoOpen} 
        onClose={() => setIsInfoOpen(false)}
        title="About This Application"
      >
        <p>
          The Tree-Related Microhabitats Species Explorer helps you discover which species 
          are associated with specific tree features and habitats.
        </p>
        
        <h3>What are Tree-Related Microhabitats (TreMs)?</h3>
        <p>
          Tree-Related Microhabitats are small-scale structural features on trees that provide 
          habitat for a wide range of species, including invertebrates, fungi, lichens, and birds.
        </p>
        
        <h3>Data Source</h3>
        <p>
          This application uses data from the Tree-Related Microhabitats species database, 
          which includes 635 priority species across multiple taxonomic groups.
        </p>
        
        <h3>Contact & Credits</h3>
        <p>
          Developed by ...
        </p>
        <p>
          For more information, please contact ...
        </p>
        
      </Modal>

      {/* Help Modal */}
      <Modal 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)}
        title="How to Use This Tool"
      >
        <h3>Getting Started</h3>
        <p>
          Use the filter panel on the left to select habitat features and tree characteristics. 
          The species list will update automatically to show matching species.
        </p>
        
        <h3>Group Checkboxes</h3>
        <p>
          In Level 3 (Microhabitats), each group has a checkbox at the top. Click this to 
          select or deselect all features within that group at once.
        </p>
        
        <h3>Filter Logic</h3>
        <p>
          Filters within each level use <strong>OR</strong> logic (species matching any selected filter pass). 
          Between levels, <strong>AND</strong> logic is used (species must match selections from all levels).
        </p>
        
        <h3>Clearing Filters</h3>
        <p>
          Click "Clear All" in the filter panel header to reset all filters and show all species.
        </p>
        
      </Modal>
    </>
  );
}

export default App;