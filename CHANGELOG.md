# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-04-11

### Added
- Initial release of Obsidian AMaps
- AMap (Gaode Maps) JS API 2.0 integration
- Support for AMap API Key and Security Configuration
- Automatic WGS-84 to GCJ-02 coordinate conversion
- Support for standard, satellite, and hybrid map types
- Custom marker icons using Obsidian's Lucide icons
- Custom marker colors support
- Right-click context menu for creating notes
- Bilingual documentation (English and Chinese)

### Changed
- Forked from obsidian-maps by Obsidian
- Replaced MapLibre GL JS with AMap JS API 2.0
- Optimized for China mainland users
- Updated test data to use Chinese locations

### Removed
- MapLibre GL JS dependency
- Mapbox RTL text plugin
- Multi-tile provider support
- Custom tile set configuration (replaced with AMap built-in types)

## Original Project

See [obsidian-maps changelog](https://github.com/obsidianmd/obsidian-maps/blob/master/CHANGELOG.md) for history prior to forking.
