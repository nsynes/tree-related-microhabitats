import * as THREE from 'three';

// Create realistic leaf shapes for different species
export function createOakLeaf() {
  // Oak leaves have 5-7 distinctive deep ROUNDED lobes
  const shape = new THREE.Shape();
  
  // Start at base
  shape.moveTo(0, 0);
  
  // Right side - rounded lobes
  // First lobe (lower)
  shape.quadraticCurveTo(0.2, 0.1, 0.4, 0.2);  // Curve out
  shape.quadraticCurveTo(0.5, 0.25, 0.45, 0.35); // Round top of lobe
  shape.quadraticCurveTo(0.3, 0.4, 0.2, 0.4);   // Curve back in (sinus)
  
  // Second lobe (middle)
  shape.quadraticCurveTo(0.25, 0.45, 0.5, 0.55); // Curve out
  shape.quadraticCurveTo(0.55, 0.6, 0.5, 0.7);   // Round top
  shape.quadraticCurveTo(0.35, 0.75, 0.2, 0.75); // Curve in
  
  // Third lobe (upper)
  shape.quadraticCurveTo(0.15, 0.8, 0.25, 0.9);  // Curve out
  shape.quadraticCurveTo(0.2, 0.95, 0.1, 0.98);  // Round toward tip
  
  // Tip
  shape.quadraticCurveTo(0.05, 1.0, 0, 1.0);
  shape.quadraticCurveTo(-0.05, 1.0, -0.1, 0.98);
  
  // Left side - mirror with rounded lobes
  shape.quadraticCurveTo(-0.2, 0.95, -0.25, 0.9);
  shape.quadraticCurveTo(-0.15, 0.8, -0.2, 0.75);
  
  shape.quadraticCurveTo(-0.35, 0.75, -0.5, 0.7);
  shape.quadraticCurveTo(-0.55, 0.6, -0.5, 0.55);
  shape.quadraticCurveTo(-0.25, 0.45, -0.2, 0.4);
  
  shape.quadraticCurveTo(-0.3, 0.4, -0.45, 0.35);
  shape.quadraticCurveTo(-0.5, 0.25, -0.4, 0.2);
  shape.quadraticCurveTo(-0.2, 0.1, 0, 0);
  
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.scale(0.06, 0.06, 1);
  return geometry;
}

export function createBirchLeaf() {
  // Birch leaves are small, triangular/diamond shaped
  const shape = new THREE.Shape();
  
  shape.moveTo(0, 0);
  shape.lineTo(0.08, 0.05);
  shape.quadraticCurveTo(0.1, 0.08, 0.1, 0.12);
  shape.quadraticCurveTo(0.1, 0.15, 0.08, 0.18);
  shape.lineTo(0, 0.22);
  shape.lineTo(-0.08, 0.18);
  shape.quadraticCurveTo(-0.1, 0.15, -0.1, 0.12);
  shape.quadraticCurveTo(-0.1, 0.08, -0.08, 0.05);
  shape.lineTo(0, 0);
  
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.scale(0.5, 0.5, 1); // Scale down
  return geometry;
}

export function createBeechLeaf() {
  // Beech leaves are oval with pointed tips
  const shape = new THREE.Shape();
  
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.1, 0.05, 0.12, 0.15, 0.1, 0.25);
  shape.bezierCurveTo(0.08, 0.35, 0.05, 0.4, 0, 0.45);
  shape.bezierCurveTo(-0.05, 0.4, -0.08, 0.35, -0.1, 0.25);
  shape.bezierCurveTo(-0.12, 0.15, -0.1, 0.05, 0, 0);
  
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.scale(0.5, 0.5, 1); // Scale down
  return geometry;
}

export function createAshLeaflet() {
  // Ash has compound leaves - this is one leaflet
  const shape = new THREE.Shape();
  
  // Simple elongated oval for compound leaf
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.06, 0.05, 0.06, 0.15);
  shape.quadraticCurveTo(0.06, 0.25, 0, 0.3);
  shape.quadraticCurveTo(-0.06, 0.25, -0.06, 0.15);
  shape.quadraticCurveTo(-0.06, 0.05, 0, 0);
  
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.scale(0.5, 0.5, 1); // Scale down
  return geometry;
}

// Create a cluster of leaves for a branch
export function createLeafCluster(species, count = 20) {
  let leafGeometry;
  
  switch(species) {
    case 'oak':
      leafGeometry = createOakLeaf();
      break;
    case 'birch':
      leafGeometry = createBirchLeaf();
      break;
    case 'beech':
      leafGeometry = createBeechLeaf();
      break;
    case 'ash':
      leafGeometry = createAshLeaflet();
      break;
    default:
      leafGeometry = createOakLeaf();
  }
  
  const instancedMesh = new THREE.InstancedMesh(
    leafGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0
    }),
    count
  );
  
  // Position leaves in cluster
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Euler();
  const scale = new THREE.Vector3();
  
  for (let i = 0; i < count; i++) {
    // Random position in small sphere
    position.set(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    );
    
    // Random rotation
    rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    
    // Slight size variation
    const s = 0.8 + Math.random() * 0.4;
    scale.set(s, s, s);
    
    matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
    instancedMesh.setMatrixAt(i, matrix);
  }
  
  instancedMesh.instanceMatrix.needsUpdate = true;
  
  return instancedMesh;
}

// Create compound leaf for Ash (multiple leaflets)
export function createCompoundLeaf() {
  const group = new THREE.Group();
  const leafletGeometry = createAshLeaflet();
  const material = new THREE.MeshStandardMaterial({
    color: 0x90EE90,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0
  });
  
  // 5-7 leaflets on a stem
  const leafletCount = 5 + Math.floor(Math.random() * 3);
  const stemLength = 0.4;
  
  for (let i = 0; i < leafletCount; i++) {
    const leaflet = new THREE.Mesh(leafletGeometry, material);
    const t = i / (leafletCount - 1);
    
    leaflet.position.set(
      Math.sin(t * Math.PI) * 0.1,
      t * stemLength - stemLength / 2,
      0
    );
    
    leaflet.rotation.z = (Math.random() - 0.5) * 0.3;
    
    group.add(leaflet);
  }
  
  return group;
}