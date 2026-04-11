## Basic map

Add coordinates to your notes:

```yaml
---
coordinates:
  - "116.3974"  # longitude
  - "39.9092"   # latitude
---
```

In your Base, add a map view:

```yaml
views:
  - type: map
    name: Map
    coordinates: note.coordinates
```

Click **Map** in the top left corner to configure view options. In the view configuration menu, open **Markers** to define how markers are displayed.

### Optional: Custom icons and colors

Add `icon` and `color` properties to customize markers:

```yaml
---
coordinates:
  - "116.3974"
  - "39.9092"
icon: "landmark"      # Lucide icon name
color: "#c41e3a"      # CSS color
---
```

## Coordinate Format

This plugin uses **GCJ-02 coordinate system** (Mars Coordinates).

Format: `[longitude, latitude]`

Get GCJ-02 coordinates from: https://lbs.amap.com/tools/picker

## Advanced: Type-based markers

You can also get icon and color from the note's assigned type using [formulas](https://help.obsidian.md/bases/functions):

```js
// Get icon from the type
list(type)[0].asFile().properties.icon

// Get color from the type
list(type)[0].asFile().properties.color
```
