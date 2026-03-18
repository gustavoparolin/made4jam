# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-03-17
### Added
- **Bulk Lyrics Fetching**: Added a "🌐 Fetch Lyrics" button in the Admin Lineup Dashboard. Automatically fetches plain text lyrics from the internet (LRCLIB API) for every song in the database that is currently missing them.
- **Cover Band Management System**: Added "Manage Cover Bands" tab in Admin to associate musicians with default cover bands.
- **Song-by-Song Cover Band Pre-fills**: Added a "🎸 Fill..." dropdown directly beneath each song to rapidly auto-assign cover band members to their missing instruments without destructive overwrites.

## [1.2.0] - 2026-03-15
### Added
- **Unplayable Songs Filter**: Added a "🔍 Select Unplayable" button in the Admin Lineup Dashboard to automatically select songs missing critical instruments (no drummer, no bass, or no guitars).
- **Bulk Delete**: Added a "🗑️ Delete Selected" button to quickly remove unplayable or selected songs from the lineup.
- **Expand/Collapse**: Added "Expand All Bands" and "Collapse All Bands" toggles to the Admin Lineup and Public Setlist pages.

## [1.1.1] - 2026-03-15
### Changed
- Refactored "Share Gaps" functionality to display the content in a large text modal with an explicit "Copy to Clipboard" button rather than invoking device OS-level share sheets.

## [1.1.0] - 2026-03-15
### Added
- **Feature 3 (Smart Auto-Fill)**: Added a "⚡ Smart Auto-Fill" button in the Admin Setlist Builder to automatically assign musicians when they are the only volunteer for a role.
- **Feature 2 (WhatsApp Export)**: Added an "📤 Share Gaps" button to Admin and Public Roster pages, allowing 1-click sharing of missing roster slots directly to native WhatsApp/clipboard.

## [1.0.1] - 2026-03-15
### Added
- Expand and collapse all bands buttons in Jam and Roster pages.
- `GET /api/export` endpoint to download the entire MySQL database as a `.sql` file.
- Dynamic version number display in the application global footer.
- Centralized CHANGELOG.md for tracking project updates.

## [1.0.0] - 2026-03-15
### Added
- Initial stable release of the Made4Jam application.
- React 19 single-page UI built with Vite and TailwindCSS.
- PHP 8 REST API for dynamic data management.
- Dynamic routing and secure database configuration.
