# Made4Jam V2.0 - Feature Roadmap

This document outlines the planned features for the upcoming 2.0 release based on our brainstorming sessions.

## 1. "Cover Band" Pre-fills & Reservations ✅ (Completed in v1.3.0)
**Concept**: Allow full bands (e.g., Master of Justice, Chaos BC) to select all spots of a song, occupying all instrument slots instantly without individuals having to click them one-by-one.
**Selected Approach (Hybrid A/Admin-Assigned)**: 
- Link a musician's name to a specific cover band function (e.g., "Patrick plays drums for Master of Justice", "Marley plays bass for Chaos BC").
- The Admin can manage and make these assignments.
- *Goal*: Keep it simple while allowing the admin to dynamically assign seats for known band groupings directly on a song-by-song basis.

## 5. Bulk Lyrics Fetcher ✅ (Completed in v1.3.0)
**Concept**: Easily fetch lyrics from the internet for all songs that are missing them.
**Approach**:
- Added a "🌐 Fetch Lyrics" button in the Admin Lineups Dashboard.
- Scans all songs without lyrics and automatically queries the public LRCLIB API to ingest plain lyrics directly into the database.

## 2. WhatsApp "Roster Gaps" Export ✅ (Completed in v1.1.0/v1.1.1)
**Concept**: A quick way to blast the current state of the jam to WhatsApp groups to encourage people to fill empty slots.
**Approach**:
- Place an "📤 Share to WhatsApp" button on the Admin and Public Roster pages.
- When clicked, JavaScript scans the current selections and identifies songs with missing core instruments.
- Opens a modal with text ready to copy directly to the clipboard.

## 3. Smart Lineup Auto-Fill ✅ (Completed in v1.1.0/v1.2.0)
**Concept**: Save Admin time during Setlist creation.
**Approach**:
- Frontend Logic Only (React state).
- Includes "⚡ Smart Auto-Fill" to default the Setlist builder dropdowns for solo volunteers.
- Includes bulk unplayable logic and deleting to filter out songs lacking core instruments.

## 4. AI / Algorithmic Setlist Assistant
**Concept**: Optimize the running order of the Setlist to minimize logistical friction (reducing drum/bass swaps).
**Approach**:
- Implement an algorithm/AI payload that blocks the setlist by:
  1. Drummer (Priority 1)
  2. Bassist (Priority 2)
  3. Tuning/Artist (Priority 3)
- We will leverage AI dynamically when necessary to assist the admin with sorting the perfect show progression.

---

*Note: As we complete these features, we will bump minor/major versions respectively and document them in our `CHANGELOG.md`.*
