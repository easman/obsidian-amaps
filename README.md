# Obsidian AMaps

A map view plugin for [Obsidian](https://obsidian.md) Bases using [AMap (高德地图)](https://lbs.amap.com/) API.

![Obsidian AMaps](images/map-view.png)

## Features

- Display your notes as interactive markers on a map
- Optimized for users in China mainland with fast loading
- Support for custom marker icons and colors via properties
- Built-in standard, satellite, and hybrid map types
- Right-click on map to create notes at specific locations

## Fork Information

This project is forked from [obsidian-maps](https://github.com/obsidianmd/obsidian-maps) by Obsidian.

### Changes from Original

- Replaced MapLibre GL JS with AMap JS API 2.0
- Optimized for China mainland users with domestic map data
- Added AMap API Key and Security Configuration support
- Uses GCJ-02 coordinate system (Gaode Maps format: [longitude, latitude])
- Removed multi-tile provider support (AMap only)

## Requirements

- Obsidian 1.10 or later
- AMap (Gaode Maps) API Key and Security Config

## Installation

1. Download the latest release from GitHub
2. Extract to your vault's `.obsidian/plugins/obsidian-amaps/` directory
3. Enable the plugin in Obsidian Settings → Community plugins
4. Configure your AMap API Key and Security Config in plugin settings, or use a `.env` file (see below)

## Getting an AMap API Key

1. Register an account at [AMap Developer Console](https://lbs.amap.com/dev/key)
2. Create a new Web platform application
3. Get your Key and Security Config (安全密钥)
4. Enter them in the plugin settings, or use a `.env` file:

### Using .env file (Recommended)

Create a `.env` file in your vault root:

```bash
AMAP_API_KEY=your_api_key_here
AMAP_SECURITY_JS_CODE=your_security_code_here
```

The plugin will automatically read API credentials from `.env`. This keeps sensitive data out of your settings and makes it easier to manage across devices.

> ⚠️ **Note**: `.env` files contain sensitive information. Do not commit them to Git!

1. Register an account at [AMap Developer Console](https://lbs.amap.com/dev/key)
2. Create a new Web platform application
3. Get your Key and Security Config (安全密钥)
4. Enter them in the plugin settings

## Usage

1. Create a Base with notes containing location coordinates
2. Add GCJ-02 coordinates to your notes:
   ```yaml
   ---
   coordinates:
     - "116.4074"  # longitude
     - "39.9042"   # latitude
   ---
   ```
3. In your Base, add a map view:
   ```yaml
   views:
     - type: map
       name: Map
       coordinates: note.coordinates
   ```

> **Note**: This plugin uses GCJ-02 coordinate system (Gaode Maps format).  
> Get coordinates from: https://lbs.amap.com/tools/picker

## Documentation

For detailed usage instructions, see the [Chinese README](README-zh.md).

## License

Copyright (c) 2025 Obsidian. Licensed under MIT License.
Copyright (c) 2025 Easman. Modifications licensed under MIT License.

See [LICENSE](./LICENSE) for the full license text.

See [NOTICE](./NOTICE) for modification details and third-party dependencies.
