# 3D Tree Visualization Prototype

Interactive 3D tree visualization with clickable parts and multiple species.

## Features

- **4 Tree Species**: Oak, Birch, Beech, and Ash with distinctive characteristics
- **Realistic Leaves**: Species-specific leaf shapes (lobed oak, triangular birch, oval beech, compound ash)
- **Detailed Bark**: Procedural bark textures unique to each species
- **Interactive Parts**: Click on trunk, branches, canopy, or roots to learn more
- **Smooth Controls**: Orbit, pan, and zoom camera controls
- **Mobile-Friendly**: Touch-optimized for smartphones and tablets
- **Realistic Proportions**: Species-specific shapes, colors, and structures

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. **Select Species**: Use the buttons on the left to switch between tree species
2. **Interact with Tree**: Click on different parts (trunk, branches, canopy, roots)
3. **Camera Controls**:
   - **Rotate**: Left-click and drag
   - **Pan**: Right-click and drag (or Shift + left-click)
   - **Zoom**: Scroll wheel or pinch (mobile)

## Species Characteristics

### Oak
- **Trunk**: Thick, deep brown with deep vertical furrows
- **Leaves**: Lobed leaves with wavy edges, dark green
- **Canopy**: Wide, spreading canopy
- **Shape**: Broad and squat, low branches

### Birch
- **Trunk**: Slender, white/cream with horizontal black marks
- **Leaves**: Small, triangular/diamond-shaped, light green
- **Canopy**: Conical, delicate
- **Shape**: Tall and elegant, fine branching

### Beech
- **Trunk**: Smooth, silver-gray bark
- **Leaves**: Oval with pointed tips, bright green
- **Canopy**: Dense, rounded, full
- **Shape**: Rounded crown, horizontal branching

### Ash
- **Trunk**: Medium, gray-brown with diamond bark pattern
- **Leaves**: Compound pinnate leaves (5-7 leaflets), light green
- **Canopy**: Oval, tall
- **Shape**: Tall and upright

## Project Structure

```
tree-viz-prototype/
├── src/
│   ├── components/
│   │   ├── TreeScene.jsx       # 3D canvas and scene setup
│   │   ├── Tree3D.jsx           # 3D tree model with clickable parts
│   │   ├── SpeciesSelector.jsx  # Species selection UI
│   │   └── InfoPanel.jsx        # Info display panel
│   ├── trees/
│   │   └── treePresets.js       # Species configuration
│   ├── App.jsx                  # Main application
│   ├── App.css                  # Styles
│   └── main.jsx                 # Entry point
├── package.json
├── vite.config.js
└── index.html
```

## Next Steps / Future Enhancements

### Phase 1: Enhanced Procedural Generation
- L-systems for realistic branching patterns
- Space colonization algorithm for natural growth
- Seasonal variations (winter/summer appearance)

### Phase 2: Advanced Features
- Detailed microhabitats (cavities, bark, fungi)
- Animations (wind, growth)
- Texture mapping (realistic bark, leaves)

### Phase 3: Integration
- Connect to species database
- Filter species by selected tree features
- Export selected habitats to main app

## Technical Notes

- Built with React + Three.js (via React Three Fiber)
- Optimized for both desktop and mobile devices
- Uses geometric primitives for quick prototyping
- Ready for procedural enhancement

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 12+)
- Mobile browsers: Optimized for touch

## Performance

- ~60 FPS on modern devices
- Mobile-optimized rendering
- Efficient geometry (low poly count)
- Ready to scale to 1000+ species

---

**Built as a prototype for tree-related microhabitats visualization**