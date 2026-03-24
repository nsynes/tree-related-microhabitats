export default function InfoPanel({ selectedPart, treeName }) {
  const partDescriptions = {
    trunk: `The main stem of the tree that provides structural support and transports water and nutrients.`,
    branches: `The woody extensions from the trunk that spread to form the tree's framework and support the canopy.`,
    canopy: `The upper layer of foliage formed by the tree's branches and leaves, providing shade and habitat.`,
    roots: `The underground support system that anchors the tree and absorbs water and nutrients from the soil.`,
  };
  
  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      right: '20px',
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      zIndex: 10,
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h2 style={{ 
        margin: '0 0 10px 0', 
        fontSize: '20px', 
        color: '#2D5016',
        textTransform: 'capitalize'
      }}>
        {treeName} Tree
      </h2>
      
      {selectedPart ? (
        <div>
          <h3 style={{ 
            margin: '10px 0 5px 0', 
            fontSize: '16px', 
            color: '#333',
            textTransform: 'capitalize',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              width: '12px',
              height: '12px',
              background: '#FFD700',
              borderRadius: '50%',
              display: 'inline-block'
            }}></span>
            Selected: {selectedPart}
          </h3>
          <p style={{ 
            margin: '5px 0', 
            fontSize: '14px', 
            color: '#666',
            lineHeight: '1.5'
          }}>
            {partDescriptions[selectedPart]}
          </p>
        </div>
      ) : (
        <p style={{ 
          margin: '10px 0 0 0', 
          fontSize: '14px', 
          color: '#666',
          fontStyle: 'italic'
        }}>
          Click on different parts of the tree to learn more...
        </p>
      )}
      
      <div style={{
        marginTop: '15px',
        paddingTop: '15px',
        borderTop: '1px solid #e0e0e0',
        fontSize: '12px',
        color: '#999'
      }}>
        <strong>Controls:</strong> Left-click drag to rotate | Right-click drag to pan | Scroll to zoom
      </div>
    </div>
  );
}