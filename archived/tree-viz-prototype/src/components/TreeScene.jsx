import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import Tree3D from './Tree3D';
import LSystemTree from './LSystemTree';

export default function TreeScene({ species, treePreset, onPartClick, selectedPart }) {
  return (
    <Canvas
      camera={{ position: [8, 3, 8], fov: 50 }}  // Lower camera height
      style={{ background: '#87CEEB' }} // Sky blue
    >
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.5} />
      
      {/* Environment for reflections */}
      <Environment preset="park" />
      
      {/* Ground grid */}
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9d4b4b"
        fadeDistance={25}
        fadeStrength={1}
        position={[0, -0.01, 0]}
      />
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#7CFC00" roughness={0.8} />
      </mesh>
      
      {/* Tree */}
      {/* Use L-System tree instead of procedural tree */}
      <LSystemTree
        species={species}
        onPartClick={onPartClick}
        selectedPart={selectedPart}
      />
      
      {/* Camera controls */}
      <OrbitControls
        enablePan={true}     // Allow panning up/down to explore tree
        enableZoom={true}
        enableRotate={true}
        minDistance={0.5}    // Allow very close zoom to see leaf detail
        maxDistance={30}
        maxPolarAngle={Math.PI / 2}
        target={[0, 2, 0]}   // Focus midway up trunk
        panSpeed={0.5}       // Moderate pan speed
      />
    </Canvas>
  );
}