import { useState } from 'react';
import TreeScene from './components/TreeScene';
import SpeciesSelector from './components/SpeciesSelector';
import InfoPanel from './components/InfoPanel';
import LSystemTree from './components/LSystemTree';
import { getTreePreset } from './trees/treePresets';
import './App.css';

function App() {
  const [selectedSpecies, setSelectedSpecies] = useState('oak');
  const [selectedPart, setSelectedPart] = useState(null);
  
  const treePreset = getTreePreset(selectedSpecies);
  
  const handlePartClick = (part) => {
    setSelectedPart(part);
  };
  
  const handleSpeciesChange = (species) => {
    setSelectedSpecies(species);
    setSelectedPart(null); // Reset selection when changing species
  };
  
  return (
    <div className="app-container">
      <TreeScene 
        species={selectedSpecies}
        treePreset={treePreset}
        onPartClick={handlePartClick}
        selectedPart={selectedPart}
      />
      <SpeciesSelector 
        currentSpecies={selectedSpecies}
        onSpeciesChange={handleSpeciesChange}
      />
      <InfoPanel 
        selectedPart={selectedPart}
        treeName={treePreset.name}
      />
    </div>
  );
}

export default App;