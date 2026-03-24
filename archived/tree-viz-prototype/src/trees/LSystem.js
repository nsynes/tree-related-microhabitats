/**
 * L-System Tree Generator
 * Generates realistic tree structures using Lindenmayer systems
 */

export class LSystem {
  constructor(axiom, rules, iterations) {
    this.axiom = axiom;
    this.rules = rules;
    this.iterations = iterations;
  }

  generate() {
    let current = this.axiom;
    
    for (let i = 0; i < this.iterations; i++) {
      let next = '';
      
      for (let char of current) {
        next += this.rules[char] || char;
      }
      
      current = next;
    }
    
    return current;
  }
}

/**
 * L-System Interpreter for 3D tree geometry
 * Interprets L-system string as turtle graphics commands
 */
export class TreeInterpreter {
  constructor(lSystemString, config) {
    this.string = lSystemString;
    this.config = {
      initialLength: 1.0,
      lengthScale: 0.7,      // How much branches shrink
      initialRadius: 0.1,
      radiusScale: 0.7,      // How much radius shrinks
      angle: 25,             // Branch angle in degrees
      ...config
    };
  }

  interpret() {
    const branches = [];
    const leafPositions = [];
    
    // Turtle state with random initial tilt for trunk lean
    const initialTilt = (Math.random() - 0.5) * 0.15; // Slight random lean
    const initialRotation = Math.random() * Math.PI * 2;
    
    const state = {
      position: { x: 0, y: 0, z: 0 },
      direction: { 
        x: Math.sin(initialTilt) * Math.cos(initialRotation), 
        y: Math.cos(initialTilt), 
        z: Math.sin(initialTilt) * Math.sin(initialRotation)
      },
      right: { x: 1, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 1 },
      length: this.config.initialLength,
      radius: this.config.initialRadius
    };
    
    // Add tropism (tendency to grow upward despite turns)
    const tropism = { x: 0, y: 1, z: 0 };
    const tropismStrength = 0.1;
    
    const stack = [];
    
    for (let char of this.string) {
      switch (char) {
        case 'F': // Draw forward
          // Add random kinks to trunk/branches
          const kinkAmount = (Math.random() - 0.5) * 5; // Random kink up to ±5 degrees
          this.rotate(state, 'yaw', kinkAmount);
          this.rotate(state, 'pitch', kinkAmount * 0.5);
          
          // Apply tropism (tendency to grow upward)
          this.applyTropism(state, tropism, tropismStrength);
          
          this.drawBranch(state, branches);
          this.moveForward(state);
          break;
          
        case 'f': // Move forward without drawing
          this.moveForward(state);
          break;
          
        case '+': // Turn right (yaw) with random variation
          const angleVariation1 = (Math.random() - 0.5) * this.config.angle * 0.3;
          this.rotate(state, 'yaw', this.config.angle + angleVariation1);
          break;
          
        case '-': // Turn left (yaw) with random variation
          const angleVariation2 = (Math.random() - 0.5) * this.config.angle * 0.3;
          this.rotate(state, 'yaw', -(this.config.angle + angleVariation2));
          break;
          
        case '&': // Pitch down with random variation
          const angleVariation3 = (Math.random() - 0.5) * this.config.angle * 0.3;
          this.rotate(state, 'pitch', this.config.angle + angleVariation3);
          break;
          
        case '^': // Pitch up with random variation
          const angleVariation4 = (Math.random() - 0.5) * this.config.angle * 0.3;
          this.rotate(state, 'pitch', -(this.config.angle + angleVariation4));
          break;
          
        case '\\': // Roll left
          this.rotate(state, 'roll', this.config.angle);
          break;
          
        case '/': // Roll right
          this.rotate(state, 'roll', -this.config.angle);
          break;
          
        case '[': // Push state
          stack.push(JSON.parse(JSON.stringify(state)));
          break;
          
        case ']': // Pop state
          if (stack.length > 0) {
            Object.assign(state, stack.pop());
          }
          break;
          
        case '!': // Decrease radius
          state.radius *= this.config.radiusScale;
          break;
          
        case '#': // Increase radius
          state.radius /= this.config.radiusScale;
          break;
          
        case 'L': // Place leaf
          leafPositions.push({
            position: { ...state.position },
            direction: { ...state.direction }
          });
          break;
      }
    }
    
    return { branches, leafPositions };
  }

  drawBranch(state, branches) {
    const startPos = { ...state.position };
    const endPos = {
      x: state.position.x + state.direction.x * state.length,
      y: state.position.y + state.direction.y * state.length,
      z: state.position.z + state.direction.z * state.length
    };
    
    branches.push({
      start: startPos,
      end: endPos,
      startRadius: state.radius,
      endRadius: state.radius * this.config.radiusScale
    });
  }

  moveForward(state) {
    // Add slight random variation to length
    const lengthVariation = 0.9 + Math.random() * 0.2; // 90-110% of expected length
    const actualLength = state.length * lengthVariation;
    
    state.position.x += state.direction.x * actualLength;
    state.position.y += state.direction.y * actualLength;
    state.position.z += state.direction.z * actualLength;
    
    // Random variation in scaling
    const scaleVariation = 0.95 + Math.random() * 0.1; // 95-105% of expected scale
    state.length *= this.config.lengthScale * scaleVariation;
    
    // Random variation in radius reduction
    const radiusVariation = 0.95 + Math.random() * 0.1;
    state.radius *= this.config.radiusScale * radiusVariation;
  }

  applyTropism(state, tropism, strength) {
    // Gradually bend branches toward tropism direction (usually upward)
    const factor = strength;
    state.direction.x += tropism.x * factor;
    state.direction.y += tropism.y * factor;
    state.direction.z += tropism.z * factor;
    
    this.normalize(state.direction);
    
    // Recompute right and up vectors
    const worldUp = { x: 0, y: 1, z: 0 };
    
    // right = direction × worldUp
    state.right.x = state.direction.y * worldUp.z - state.direction.z * worldUp.y;
    state.right.y = state.direction.z * worldUp.x - state.direction.x * worldUp.z;
    state.right.z = state.direction.x * worldUp.y - state.direction.y * worldUp.x;
    this.normalize(state.right);
    
    // up = right × direction
    state.up.x = state.right.y * state.direction.z - state.right.z * state.direction.y;
    state.up.y = state.right.z * state.direction.x - state.right.x * state.direction.z;
    state.up.z = state.right.x * state.direction.y - state.right.y * state.direction.x;
    this.normalize(state.up);
  }

  rotate(state, type, angleDeg) {
    const angle = angleDeg * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    let axis, v1, v2;
    
    if (type === 'yaw') {
      // Rotate around up vector
      axis = state.up;
      v1 = state.direction;
      v2 = state.right;
    } else if (type === 'pitch') {
      // Rotate around right vector
      axis = state.right;
      v1 = state.direction;
      v2 = state.up;
    } else if (type === 'roll') {
      // Rotate around direction vector
      axis = state.direction;
      v1 = state.right;
      v2 = state.up;
    }
    
    // Rodrigues rotation formula
    const newV1 = {
      x: v1.x * cos + v2.x * sin,
      y: v1.y * cos + v2.y * sin,
      z: v1.z * cos + v2.z * sin
    };
    
    const newV2 = {
      x: -v1.x * sin + v2.x * cos,
      y: -v1.y * sin + v2.y * cos,
      z: -v1.z * sin + v2.z * cos
    };
    
    if (type === 'yaw') {
      state.direction = newV1;
      state.right = newV2;
    } else if (type === 'pitch') {
      state.direction = newV1;
      state.up = newV2;
    } else if (type === 'roll') {
      state.right = newV1;
      state.up = newV2;
    }
    
    // Normalize
    this.normalize(state.direction);
    this.normalize(state.right);
    this.normalize(state.up);
  }

  normalize(vec) {
    const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    if (len > 0) {
      vec.x /= len;
      vec.y /= len;
      vec.z /= len;
    }
  }
}