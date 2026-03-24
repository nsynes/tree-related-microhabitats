import { useEffect, useState } from 'react';
import useFilterStore from './store/useFilterStore';
import FilterPanel from './components/FilterPanel';
import SpeciesGrid from './components/SpeciesGrid';
import config from './data/config.json';
import speciesData from './data/species.json';

function App() {
  const [loading, setLoading] = useState(true);
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
      </header>
      
      <main className="app-layout">
        <FilterPanel config={config} />
        <SpeciesGrid config={config} />
      </main>
    </>
  );
}

export default App;