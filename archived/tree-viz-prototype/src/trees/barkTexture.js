import * as THREE from 'three';

// Create procedural bark texture
export function createBarkMaterial(color, species) {
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.95,
    metalness: 0.05
  });
  
  // Create normal map for bark texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Base color
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 512, 512);
  
  // Create bark pattern based on species
  if (species === 'birch') {
    // Birch has horizontal marks
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    for (let i = 0; i < 50; i++) {
      const y = Math.random() * 512;
      const length = 30 + Math.random() * 100;
      const x = Math.random() * (512 - length);
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y + (Math.random() - 0.5) * 10);
      ctx.stroke();
    }
  } else if (species === 'oak') {
    // Oak has deep vertical furrows
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 4;
    for (let i = 0; i < 30; i++) {
      const x = (i / 30) * 512;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < 512; y += 20) {
        ctx.lineTo(x + (Math.random() - 0.5) * 10, y);
      }
      ctx.stroke();
    }
  } else if (species === 'beech') {
    // Beech has smooth bark with slight variations
    ctx.fillStyle = '#888';
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 20;
      ctx.fillRect(x, y, size, size / 2);
    }
  } else {
    // Ash - diamond pattern
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += 40) {
      for (let x = 0; x < 512; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 20, y + 20);
        ctx.lineTo(x, y + 40);
        ctx.lineTo(x - 20, y + 20);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
  
  // Convert canvas to texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 4);
  
  material.map = texture;
  material.needsUpdate = true;
  
  return material;
}