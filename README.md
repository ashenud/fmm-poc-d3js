# Scholarship Analytics - Radial Network Visualization

A visually polished D3.js v7 radial hierarchical visualization for scholarship data analytics.

## Features

- ✨ **Radial Hierarchical Layout**: Center node with primary categories distributed in a circle
- 🎨 **Gradient Styling**: Soft pink-to-purple gradients matching the reference design
- 💫 **Smooth Animations**: Entrance transitions and hover effects
- 🖱️ **Interactive**: Hover tooltips and link highlighting
- 📱 **Responsive**: Adapts to window resizing

## File Structure

```
demo_2/
├── index.html      # Main HTML file
├── style.css       # Styling and visual effects
├── script.js       # D3.js visualization logic
├── data.json       # Hierarchical scholarship data
└── README.md       # This file
```

## How to Run

1. **Option 1: Simple HTTP Server (Recommended)**

   ```bash
   # Navigate to demo_2 folder
   cd demo_2

   # Python 3
   python -m http.server 8000

   # Node.js (if you have npx)
   npx serve
   ```

   Then open: http://localhost:8000

2. **Option 2: Live Server Extension**

   - Open `index.html` in VS Code
   - Right-click → "Open with Live Server"

3. **Option 3: Direct File Open**
   - Double-click `index.html`
   - Note: Some browsers may block local JSON loading; use HTTP server instead

## Data Structure

The visualization uses a hierarchical JSON structure in `data.json`:

```json
{
  "name": "15,875 Scholarships",
  "value": 15875,
  "type": "root",
  "children": [
    {
      "name": "Gender",
      "type": "category",
      "children": [
        { "name": "Female", "value": 12, "type": "leaf" },
        ...
      ]
    },
    ...
  ]
}
```

### Node Types:

- **root**: Central node (total scholarships)
- **category**: Primary categories (Gender, Religion, etc.)
- **leaf**: Individual values with counts

## Customization

### Adjust Layout Distances

In `script.js`, modify the `config` object:

```javascript
const config = {
  centerRadius: 100, // Size of center node
  categoryRadius: 60, // Size of category nodes
  leafRadius: 35, // Size of leaf nodes
  radialDistance: {
    category: 280, // Distance from center to categories
    leaf: 180, // Distance from category to leaves
  },
};
```

### Change Colors

Modify the `colors` object:

```javascript
const colors = {
  root: { start: '#ff6b9d', end: '#c44569' },
  category: { start: '#a29bfe', end: '#6c5ce7' },
  leaf: { start: '#ff9ff3', end: '#ff6b9d' },
  countBubble: '#74b9ff',
};
```

### Add More Categories

Edit `data.json` and add new category objects with children.

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Dependencies

- **D3.js v7**: Loaded from CDN (https://d3js.org/d3.v7.min.js)
- No other dependencies required

## Performance

- Handles 100+ nodes smoothly
- Optimized transitions and animations
- Responsive to real-time data updates

## Credits

Built for scholarship analytics POC using D3.js force simulation and radial layouts.
