# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.2] - 2026-03-17
### Fixed
- **Dashboard musician count**: A musician filling multiple roles in one song (e.g. vocals + guitar) is now counted once per song, not once per role.

## [1.9.1] - 2026-03-17
### Added
- **Pre-commit hook**: Git hook at `hooks/pre-commit` that blocks every commit unless `CHANGELOG.md` is staged. Install with `cp hooks/pre-commit .git/hooks/pre-commit`. Bypass in emergencies with `git commit --no-verify`.

## [1.9.0] - 2026-03-17
### Added
- **Cumulative Block Dashboard**: New "📊 Dashboard" tab in Admin shows musician and band play counts accumulated block by block. Each collapsible section covers Block 1 up to that point. Inline bar charts visualise relative load. Amber highlight = musician not yet playing; red highlight = musician in >70% of cumulative songs (overplaying threshold). Reactive to lineup changes without page reload.

## [1.8.0] - 2026-03-17
### Changed
- **Block Drag-and-Drop Group Move**: Dragging a block header now moves the entire block (header + all child songs) as a unit. A `DragOverlay` card displays song count during drag. Blocks matching the `Set N - Suffix` naming pattern are automatically renumbered after every reorder and the updated names are persisted to the API.

## [1.7.0] - 2026-03-17
### Changed
- **Full-Width Layout**: Removed all `max-w-*` constraints from the navbar, main content area, Setlist, and SongEditor components so the UI uses the full browser width on wide screens.

## [1.6.0] - 2026-03-17
### Added
- **AI Setlist Algorithm Refactor**: Replaced the per-song ≥3 member overlap heuristic with a drummer-to-cover-band ownership map (`buildDrummerToCoverBand`). Cover band detection via `isFullCoverBandSong` is now O(1) per song. All 15 algorithm unit tests pass.
- **Extra Lineup Columns**: Added Vocals Extra, Guitar Extra, and Bass Extra columns to the lineup table. Dropdowns for extra roles show all musicians (not just volunteers). Extra role assignments are included in the lineup save payload and returned in the lineup API response.

## [1.5.0] - 2026-03-17
### Added
- **AI / Algorithmic Setlist Assistant**: New "🤖 AI Setlist" toolbar button that automatically organises songs into optimised blocks. Groups songs by drummer (Priority 1), places cover band songs at the start of each block (≥3 lineup member overlap detected), then uses a greedy nearest-neighbour algorithm to minimise instrument swaps between consecutive songs. Splits large drummer groups into multiple blocks using a configurable max block size (smart default: `min(6, max(3, round(totalSongs / (drummers × 3))))`). Interleaves blocks across drummers in round-robin order so no two consecutive sets share the same drummer. Songs without a drummer assigned go into an "Unassigned Songs" block at the end. Undo toast restores the previous layout. Includes Vitest unit tests for all algorithm behaviours.

## [1.4.0] - 2026-03-17
### Added
- **DnD Setlist Blocks**: Full drag-and-drop reordering of songs and blocks using @dnd-kit. Songs can be grouped into named blocks (sets) and reordered via drag handles. Includes block create/rename/delete and persistent sort order via API.

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
