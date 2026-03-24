import { getSpeciesList } from '../trees/treePresets';

export default function SpeciesSelector({ currentSpecies, onSpeciesChange }) {
  const species = getSpeciesList();
  
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      background: 'rgba(255, 255, 255, 0.9)',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      zIndex: 10
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#333' }}>
        Tree Species
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {species.map(sp => (
          <button
            key={sp}
            onClick={() => onSpeciesChange(sp)}
            style={{
              padding: '8px 15px',
              border: currentSpecies === sp ? '2px solid #2D5016' : '1px solid #ccc',
              background: currentSpecies === sp ? '#E8F5E9' : 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: currentSpecies === sp ? 'bold' : 'normal',
              transition: 'all 0.2s',
              textTransform: 'capitalize'
            }}
            onMouseEnter={(e) => {
              if (currentSpecies !== sp) {
                e.target.style.background = '#f5f5f5';
              }
            }}
            onMouseLeave={(e) => {
              if (currentSpecies !== sp) {
                e.target.style.background = 'white';
              }
            }}
          >
            {sp}
          </button>
        ))}
      </div>
    </div>
  );
}