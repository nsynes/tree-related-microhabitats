import { useMemo } from 'react';
import * as THREE from 'three';
import { TreeInterpreter } from '../trees/LSystem';
import { getTreeGrammar, generateTreeString } from '../trees/treeGrammars';
import { createLeafCluster } from '../trees/leafGeometry';
import { createBarkMaterial } from '../trees/barkTexture';

export default function LSystemTree({ species = 'oak', onPartClick, selectedPart }) {
  const grammar = getTreeGrammar(species);
  
  // Generate tree structure
  const treeData = useMemo(() => {
    const lSystemString = generateTreeString(species);
    const interpreter = new TreeInterpreter(lSystemString, grammar.config);
    return interpreter.interpret();
  }, [species]);

  // Create branch geometries
  const branchMeshes = useMemo(() => {
    const meshes = [];
    
    treeData.branches.forEach((branch, index) => {
      // Create tapered cylinder for each branch
      const start = new THREE.Vector3(branch.start.x, branch.start.y, branch.start.z);
      const end = new THREE.Vector3(branch.end.x, branch.end.y, branch.end.z);
      
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      
      if (length < 0.01) return; // Skip tiny branches
      
      // Create cylinder
      const geometry = new THREE.CylinderGeometry(
        branch.endRadius,
        branch.startRadius,
        length,
        8,
        1
      );
      
      // Position and orient the cylinder
      const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      
      // Orient cylinder along branch direction
      const up = new THREE.Vector3(0, 1, 0);
      direction.normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
      
      meshes.push({
        geometry,
        position: [midpoint.x, midpoint.y, midpoint.z],
        quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
        key: `branch-${index}`
      });
    });
    
    return meshes;
  }, [treeData]);

  // Create leaves - multiply each leaf position to create clusters
  const leavesInstancedMesh = useMemo(() => {
    const leafPositions = treeData.leafPositions;
    if (leafPositions.length === 0) return null;
    
    // Reduced leaf density to see branches better
    const leavesPerCluster = 3; // Fewer leaves per marker for prototyping
    const totalLeaves = leafPositions.length * leavesPerCluster;
    
    // Create leaf geometry
    const leafGeometry = createLeafCluster(species, 1).geometry;
    
    const instancedMesh = new THREE.InstancedMesh(
      leafGeometry,
      new THREE.MeshStandardMaterial({
        color: grammar.leafColor,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0
      }),
      totalLeaves
    );
    
    // Position each leaf
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();
    
    let leafIndex = 0;
    
    leafPositions.forEach((leaf) => {
      // Create a cluster of leaves around each marker
      for (let i = 0; i < leavesPerCluster; i++) {
        // Random offset from marker position
        const offset = 0.3;
        position.set(
          leaf.position.x + (Math.random() - 0.5) * offset,
          leaf.position.y + (Math.random() - 0.5) * offset,
          leaf.position.z + (Math.random() - 0.5) * offset
        );
        
        // Random rotation
        rotation.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        );
        
        // Much smaller leaves with less variation
        const s = 0.3 + Math.random() * 0.2; // 30-50% of previous size
        scale.set(s, s, s);
        
        matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
        instancedMesh.setMatrixAt(leafIndex++, matrix);
      }
    });
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    
    return instancedMesh;
  }, [treeData, species, grammar.leafColor]);

  // Create material
  const branchMaterial = useMemo(() => 
    createBarkMaterial(grammar.color, species),
    [grammar.color, species]
  );

  return (
    <group>
      {/* Render all branches */}
      {branchMeshes.map((branch) => (
        <mesh
          key={branch.key}
          geometry={branch.geometry}
          material={branchMaterial}
          position={branch.position}
          quaternion={branch.quaternion}
          onClick={(e) => {
            e.stopPropagation();
            onPartClick('branches');
          }}
        />
      ))}
      
      {/* Render leaves */}
      {leavesInstancedMesh && <primitive object={leavesInstancedMesh} />}
    </group>
  );
}