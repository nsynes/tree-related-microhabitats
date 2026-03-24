import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createLeafCluster, createCompoundLeaf } from '../trees/leafGeometry';
import { createBarkMaterial } from '../trees/barkTexture';

// Component for a clickable tree part
function TreePart({ part, geometry, material, position, rotation, onClick, isSelected }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  // Pulse effect for selected part
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.05);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });
  
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onClick(part);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {(hovered || isSelected) && (
        <meshBasicMaterial 
          color={isSelected ? "#ffff00" : "#ffaa00"} 
          transparent 
          opacity={0.3} 
          side={THREE.DoubleSide}
        />
      )}
    </mesh>
  );
}

export default function Tree3D({ preset, onPartClick, selectedPart }) {
  // Create massive instanced mesh for all leaves distributed across all branch levels
  const leavesInstancedMesh = useMemo(() => {
    // More leaves now that we have tertiary branches
    const leavesPerPrimary = preset.leaves.density === 'dense' ? 30 : 
                             preset.leaves.density === 'moderate' ? 20 : 15;
    const leavesPerSecondary = preset.leaves.density === 'dense' ? 25 : 
                               preset.leaves.density === 'moderate' ? 18 : 12;
    const leavesPerTertiary = preset.leaves.density === 'dense' ? 20 : 
                              preset.leaves.density === 'moderate' ? 15 : 10;
    
    // Estimate total leaves based on branch structure
    const primaryCount = preset.branches.count;
    const secondaryPerPrimary = 4; // Average
    const tertiaryPerSecondary = 3; // Average
    
    const totalLeaves = 
      (primaryCount * leavesPerPrimary) +
      (primaryCount * secondaryPerPrimary * leavesPerSecondary) +
      (primaryCount * secondaryPerPrimary * tertiaryPerSecondary * leavesPerTertiary);
    
    // Create the instanced mesh
    let leafGeometry;
    if (preset.leaves.compound) {
      leafGeometry = createLeafCluster(preset.leaves.type, 1).geometry;
    } else {
      leafGeometry = createLeafCluster(preset.leaves.type, 1).geometry;
    }
    
    const instancedMesh = new THREE.InstancedMesh(
      leafGeometry,
      new THREE.MeshStandardMaterial({
        color: preset.leaves.color,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0
      }),
      totalLeaves
    );
    
    // Position all leaves
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();
    
    let leafIndex = 0;
    
    // Generate leaves distributed across canopy volume
    // Place leaves in spherical cloud in upper portion of tree
    const canopyCenter = new THREE.Vector3(0, preset.trunk.height * 0.8, 0);
    const canopyRadius = preset.branches.length * 1.5; // Larger canopy
    
    for (let i = 0; i < totalLeaves && leafIndex < totalLeaves; i++) {
      // Random spherical distribution with bias towards outer edge (more realistic)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.5) * canopyRadius; // Bias towards outer edge
      
      // Flatten the sphere to make it wider than tall (natural tree canopy shape)
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.5; // Flatten more  
      const z = r * Math.cos(phi);
      
      position.set(
        canopyCenter.x + x,
        canopyCenter.y + y,
        canopyCenter.z + z
      );
      
      // Random rotation
      rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      // Random scale variation
      const s = 0.8 + Math.random() * 0.4;
      scale.set(s, s, s);
      
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      instancedMesh.setMatrixAt(leafIndex++, matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    
    return instancedMesh;
  }, [preset.leaves.type, preset.leaves.color, preset.leaves.density, preset.branches.count, preset.trunk.height, preset.branches.length, preset.leaves.compound]);
  
  // Create tapered trunk geometry using custom geometry
  const trunkGeometry = useMemo(() => {
    // Create curve points with natural kinks
    const points = [];
    const segments = 12;
    let currentX = 0;
    let currentZ = 0;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = preset.trunk.height * t;
      
      // Add random kinks (but keep mostly vertical)
      if (i > 0 && i < segments) {
        currentX += (Math.random() - 0.5) * 0.1;
        currentZ += (Math.random() - 0.5) * 0.1;
      }
      
      points.push(new THREE.Vector3(currentX, y, currentZ));
    }
    
    // Create curve from points
    const curve = new THREE.CatmullRomCurve3(points);
    
    // Create custom geometry with tapering
    const geometry = new THREE.BufferGeometry();
    const radialSegments = 12;
    const tubularSegments = 24;
    
    const vertices = [];
    const normals = [];
    const indices = [];
    
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      
      // Taper radius from base to top - much more dramatic taper
      const radiusFactor = Math.pow(1 - t, 1.5); // Exponential taper
      const radius = preset.trunk.radius * (0.1 + 0.9 * radiusFactor); // Tapers to 10% at top
      
      // Create perpendicular vectors for the circle
      const normal = new THREE.Vector3();
      const binormal = new THREE.Vector3();
      
      if (Math.abs(tangent.y) < 0.999) {
        normal.set(tangent.y, -tangent.x, 0).normalize();
      } else {
        normal.set(0, tangent.z, -tangent.y).normalize();
      }
      binormal.crossVectors(tangent, normal);
      
      // Create circle of vertices
      for (let j = 0; j <= radialSegments; j++) {
        const angle = (j / radialSegments) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const vertex = new THREE.Vector3();
        vertex.x = point.x + radius * (cos * normal.x + sin * binormal.x);
        vertex.y = point.y + radius * (cos * normal.y + sin * binormal.y);
        vertex.z = point.z + radius * (cos * normal.z + sin * binormal.z);
        
        vertices.push(vertex.x, vertex.y, vertex.z);
        
        const norm = new THREE.Vector3(
          cos * normal.x + sin * binormal.x,
          cos * normal.y + sin * binormal.y,
          cos * normal.z + sin * binormal.z
        ).normalize();
        normals.push(norm.x, norm.y, norm.z);
      }
    }
    
    // Create indices
    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;
        
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    
    return geometry;
  }, [preset.trunk.radius, preset.trunk.height]);
  
  // No more canopy geometry - leaves form the canopy naturally
  
  // Materials
  const trunkMaterial = useMemo(() => 
    createBarkMaterial(preset.trunk.color, preset.leaves.type),
    [preset.trunk.color, preset.leaves.type]
  );
  
  // No canopy material needed
  
  const branchMaterial = useMemo(() =>
    createBarkMaterial(preset.branches.color, preset.leaves.type),
    [preset.branches.color, preset.leaves.type]
  );
  
  const rootMaterial = new THREE.MeshStandardMaterial({
    color: preset.roots.color,
    roughness: 0.9,
    metalness: 0
  });
  
  // Generate realistic branching structure with secondary and tertiary branches
  const allBranches = useMemo(() => {
    const branchArray = [];
    
    // PRIMARY BRANCHES - main branches from trunk
    const primaryBranches = [];
    for (let i = 0; i < preset.branches.count; i++) {
      // Random angle instead of spiral
      const angle = Math.random() * Math.PI * 2;
      
      // Concentrate branches in upper portion of trunk (70-100% height)
      const minHeight = preset.branches.startHeight + (preset.trunk.height - preset.branches.startHeight) * 0.3;
      const maxHeight = preset.trunk.height * 0.95;
      const branchHeight = minHeight + Math.random() * (maxHeight - minHeight);
      
      // Random tilt variation
      const baseTilt = preset.branches.angle * (Math.PI / 180);
      const tilt = baseTilt + (Math.random() - 0.5) * 0.5;
      
      // Create curved primary branch
      const branchPoints = [];
      const branchSegments = 5;
      const baseOffset = Math.sin(angle) * preset.trunk.radius;
      const baseOffsetZ = Math.cos(angle) * preset.trunk.radius;
      
      let endX, endY, endZ;
      
      for (let j = 0; j <= branchSegments; j++) {
        const t = j / branchSegments;
        
        const bend = (Math.random() - 0.5) * 0.4 * t;
        const droop = t * t * 0.3;
        
        const x = baseOffset + Math.cos(tilt) * preset.branches.length * t * Math.sin(angle) + bend;
        const y = branchHeight + Math.sin(tilt) * preset.branches.length * t - droop;
        const z = baseOffsetZ + Math.cos(tilt) * preset.branches.length * t * Math.cos(angle) + bend;
        
        if (j === branchSegments) {
          endX = x;
          endY = y;
          endZ = z;
        }
        
        branchPoints.push(new THREE.Vector3(x, y, z));
      }
      
      const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
      const branchGeometry = new THREE.TubeGeometry(
        branchCurve,
        8,
        preset.branches.radius,
        6,
        false
      );
      
      branchArray.push({
        geometry: branchGeometry,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        key: `primary-${i}`,
        type: 'primary'
      });
      
      // Store end point for secondary branches
      primaryBranches.push({ endX, endY, endZ, angle, tilt });
    }
    
    // SECONDARY BRANCHES - grow from primary branches
    primaryBranches.forEach((primary, idx) => {
      const secondaryCount = 3 + Math.floor(Math.random() * 3); // 3-5 secondary branches per primary
      
      for (let i = 0; i < secondaryCount; i++) {
        const t = 0.3 + Math.random() * 0.7; // Start 30-100% along primary branch
        
        // Position along primary branch
        const startX = primary.endX * t;
        const startY = primary.endY * (t * 0.8 + 0.2); // Account for droop
        const startZ = primary.endZ * t;
        
        // Random angle offset from primary
        const angleOffset = (Math.random() - 0.5) * Math.PI;
        const secondaryAngle = primary.angle + angleOffset;
        
        const secondaryTilt = primary.tilt + (Math.random() - 0.3) * 0.6;
        const secondaryLength = preset.branches.length * (0.4 + Math.random() * 0.3);
        
        const secPoints = [];
        const secSegments = 3;
        
        let secEndX, secEndY, secEndZ;
        
        for (let j = 0; j <= secSegments; j++) {
          const st = j / secSegments;
          
          const x = startX + Math.cos(secondaryTilt) * secondaryLength * st * Math.sin(secondaryAngle);
          const y = startY + Math.sin(secondaryTilt) * secondaryLength * st - st * st * 0.2;
          const z = startZ + Math.cos(secondaryTilt) * secondaryLength * st * Math.cos(secondaryAngle);
          
          if (j === secSegments) {
            secEndX = x;
            secEndY = y;
            secEndZ = z;
          }
          
          secPoints.push(new THREE.Vector3(x, y, z));
        }
        
        const secCurve = new THREE.CatmullRomCurve3(secPoints);
        const secGeometry = new THREE.TubeGeometry(
          secCurve,
          6,
          preset.branches.radius * 0.6,
          5,
          false
        );
        
        branchArray.push({
          geometry: secGeometry,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          key: `secondary-${idx}-${i}`,
          type: 'secondary'
        });
        
        // TERTIARY BRANCHES - grow from secondary branches  
        const tertiaryCount = 2 + Math.floor(Math.random() * 3); // 2-4 tertiary per secondary
        
        for (let k = 0; k < tertiaryCount; k++) {
          const tt = 0.4 + Math.random() * 0.6;
          
          const tertStartX = secEndX * tt + startX * (1 - tt);
          const tertStartY = secEndY * tt + startY * (1 - tt);
          const tertStartZ = secEndZ * tt + startZ * (1 - tt);
          
          const tertiaryAngle = secondaryAngle + (Math.random() - 0.5) * Math.PI * 0.8;
          const tertiaryTilt = secondaryTilt + (Math.random() - 0.3) * 0.5;
          const tertiaryLength = secondaryLength * (0.3 + Math.random() * 0.4);
          
          const tertPoints = [];
          
          for (let j = 0; j <= 2; j++) {
            const ttt = j / 2;
            
            const x = tertStartX + Math.cos(tertiaryTilt) * tertiaryLength * ttt * Math.sin(tertiaryAngle);
            const y = tertStartY + Math.sin(tertiaryTilt) * tertiaryLength * ttt - ttt * ttt * 0.15;
            const z = tertStartZ + Math.cos(tertiaryTilt) * tertiaryLength * ttt * Math.cos(tertiaryAngle);
            
            tertPoints.push(new THREE.Vector3(x, y, z));
          }
          
          const tertCurve = new THREE.CatmullRomCurve3(tertPoints);
          const tertGeometry = new THREE.TubeGeometry(
            tertCurve,
            4,
            preset.branches.radius * 0.3,
            4,
            false
          );
          
          branchArray.push({
            geometry: tertGeometry,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            key: `tertiary-${idx}-${i}-${k}`,
            type: 'tertiary'
          });
        }
      }
    });
    
    return branchArray;
  }, [preset.branches.count, preset.branches.startHeight, preset.trunk.height, preset.trunk.radius, preset.branches.angle, preset.branches.length, preset.branches.radius]);
  
  // Generate roots
  const roots = [];
  for (let i = 0; i < preset.roots.count; i++) {
    const angle = (i / preset.roots.count) * Math.PI * 2;
    const rootGeometry = new THREE.CylinderGeometry(
      preset.roots.radius,
      preset.roots.radius * 0.3,
      preset.roots.length,
      8
    );
    
    const rotation = [
      Math.PI / 3, // 60 degrees down
      angle,
      0
    ];
    
    const offset = Math.sin(angle) * preset.trunk.radius;
    const offsetZ = Math.cos(angle) * preset.trunk.radius;
    
    roots.push({
      geometry: rootGeometry,
      position: [offset, -preset.roots.length / 2, offsetZ],
      rotation: rotation,
      key: `root-${i}`
    });
  }
  
  return (
    <group>
      {/* All leaves in one instanced mesh */}
      <primitive object={leavesInstancedMesh} />
      
      {/* Trunk */}
      <TreePart
        part="trunk"
        geometry={trunkGeometry}
        material={trunkMaterial}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        onClick={onPartClick}
        isSelected={selectedPart === 'trunk'}
      />
      
      {/* All Branches (primary, secondary, tertiary) */}
      <group>
        {allBranches.map((branch) => (
          <TreePart
            key={branch.key}
            part="branches"
            geometry={branch.geometry}
            material={branchMaterial}
            position={branch.position}
            rotation={branch.rotation}
            onClick={onPartClick}
            isSelected={selectedPart === 'branches'}
          />
        ))}
      </group>
      
      {/* Roots */}
      <group>
        {roots.map((root, idx) => (
          <TreePart
            key={root.key}
            part="roots"
            geometry={root.geometry}
            material={rootMaterial}
            position={root.position}
            rotation={root.rotation}
            onClick={onPartClick}
            isSelected={selectedPart === 'roots'}
          />
        ))}
      </group>
    </group>
  );
}