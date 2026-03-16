# Made4Jam - Product Requirements Document (PRD)

## Project Overview
**Objective:** A lightweight, authentication-free web application to help event organizers and musicians curate a setlist, sign up for songs based on their instruments/vocals, and assemble temporary bands for any jam party — rock, metal, blues, pop, country, or any genre.

> **Commercial vision:** The app is intentionally genre-agnostic so it can serve any musical community, not just the metal/rock scene where it originated.

**Tech Stack (Pivoted to JS standard):**
- Backend: Node.js + Express + SQLite (better-sqlite3)
- Frontend: React + TypeScript + Vite + Tailwind CSS (plus Zustand for state if needed)

## Pages & Routes

| Route | Audience | Purpose |
|---|---|---|
| `/` | Everyone | Welcome / Musician sign-up by name |
| `/jam` | Musicians | Song picker — checkboxes per instrument |
| `/roster` | Everyone | Public "Looking for Band" feed |
| `/admin?key=SECRET` | Organizer | Manage songs, view matrix, assign lineups |
| `/setlist` | Everyone (read-only) | Final setlist with assigned bands |

The admin key is stored in a server-side `config.php` file (never in the DB or client).

## Features (MVP)

### 1. The Organizer View (`/admin?key=SECRET`)
- **Manage Setlist:** Add, edit, or remove songs per event.
  - **Pre-populated List:** Ships with ~80 curated classic rock/metal anthems (Iron Maiden, Metallica, Megadeth, Sepultura, Ozzy, Black Sabbath, Judas Priest, Scorpions, Def Leppard, etc.) as the default seed. Organizer can trim or expand per event.
  - **Web Scraper / Import:** A utility to scrape a public "Top Songs" list (e.g., a Wikipedia or Rolling Stone page) and import new songs into the database.
- **Form Bands:** A matrix view showing all songs × all musicians and their selected roles. The organizer can pick the final lineup for each song (1 vocalist, 1 lead guitar, 1 rhythm guitar, 1 bass, 1 drum).
- **Orphan Instrument Warnings:** Songs missing at least one instrument role are highlighted so the organizer can recruit musicians for those gaps.
- **Export Lineup:** A printer-friendly `/setlist` page with the full setlist and assigned bands.

### 2. The Musician View (`/` → `/jam`)
- **Sign Up (No Auth):** A musician opens the shared link, types their name, and enters the app.
  - A UUID token is generated and stored in both the DB and the browser (Cookie + LocalStorage).
  - On return visits from the **same device**, the token is recognized and the musician's profile loads automatically.
  - A personalized URL (`/jam?u=TOKEN`) is shown so the musician can bookmark it and return from **any device**.
- **Choose Songs:** The full song list for the event, with 5 checkboxes per row: `Vocals` · `Rhythm Guitar` · `Lead Guitar` · `Bass` · `Drums`. Selections are saved immediately (auto-save on check/uncheck — no submit button needed).
- **Volunteer Counter:** Each song row shows a small indicator (e.g., "2 guitarists signed up") so musicians know where they're needed most.

### 3. Public Roster (`/roster`)
- A read-only "Looking for Band" feed listing all songs and the instruments that still need volunteers, so musicians can see where to focus.

### Enhancements (Included in MVP)
- **Mobile First & Responsive:** Tailwind CSS ensures the layout works on all screen sizes. The song matrix collapses gracefully on mobile (stacked cards or horizontal scroll).
- **YouTube/Spotify Reference Links:** Each song can have an optional URL so all musicians learn the same version/arrangement.
- **Multi-Event Support:** A lightweight `events` table scopes all songs, selections, and lineups to a specific event. The organizer can create a new event for each jam party without losing historical data.

*(Note: Maximum song limits per musician has been intentionally excluded as per requirements.)*

## Database Structure (SQLite)

- **`events` table:**
  - `id` (PK), `name` ("Jam Party March 2026"), `created_at`
- **`songs` table:**
  - `id` (PK), `event_id` (FK), `title`, `artist`, `genre`, `reference_link`
- **`musicians` table:**
  - `id` (PK), `name`, `token` (UUID — auth-less session identifier)
- **`selections` table:**
  - `id` (PK), `song_id` (FK), `musician_id` (FK), `role` (vocals | rhythm_guitar | lead_guitar | bass | drums)
- **`lineups` table:**
  - `song_id` (FK), `vocals_id`, `rhythm_guitar_id`, `lead_guitar_id`, `bass_id`, `drums_id`

## Development Phases & GitHub Workflow
*(Following global project standards — feature branches, PRs linked to issues)*

1. **Setup:** Initialize Git repo, create Node/Express backend folder, create React/Vite frontend folder.
2. **Database & API:** Build SQLite schema/seed, wire up Express API endpoints.
3. **Frontend Foundations:** Tailwind config, React routing, global state (Zustand).
4. **Musician Flow:** React components for Sign-up, automatic token auth, Interactive song picker matrix.
5. **Organizer View:** Protected React route for Admin, lineup management layout.
6. **Polish:** Mobile QA, dark theme, public roster feed.

## Folder
`C:\Users\gusta\OneDrive\web\Made4Jam`
