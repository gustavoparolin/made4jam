🎸 Project Features & Capabilities
Core Musician Workflow
Smart Login & Onboarding: Stage name-based login with auto-reconnection using localStorage tokens. Allows musicians to select available events or join instantly via a direct ?e=slug invitation link.
The Jam Dashboard: A personal interactive command center where musicians can review the event's song pool and assign themselves to instruments (Vocals, Rhythm Guitar, Lead Guitar, Bass, Drums) via a unified toggle interface.
Live Roster: An aggregated, real-time view showing every registered musician, what songs they've opted into, and the specific instruments they are playing.
Generated Setlist: A dynamic, print-friendly view that acts as the final "source of truth" for the jam session, listing songs sequentially with the complete band lineup for each track.
Custom UI/UX: Responsive "cyber-purple" color scheme, paired with Global State toggles allowing users to instantly switch between 'Spacious' and 'Compact' (default) viewing modes across all pages.
Admin & Event Management Platform
Event Lifecycle Management: Admins (protected by a VITE_ADMIN_KEY environment variable) can create new jam sessions, assign dates, and entirely delete events.
Locked Invitation Links: Each created event automatically receives a unique 6-character hashed slug. This creates "Secure Share Links" that automatically lock incoming musicians into the proper context so they don't join the wrong rehearsal.
Repertoire Search & Integration: Instead of manual data entry, the Admin dashboard features an integrated Apple iTunes Search API interface. Searching a song dynamically fetches the title, artist, and track metadata and pushes it to the database.
Deep Song Editor: Admins can drill down into individual songs to modify their title, artist, genre, attach reference links (like Spotify/YouTube URLs), and manage plain-text lyrics for the setlist.
Backend Infrastructure (PHP / MySQL)
Single-Point REST API: Powered by a clean, frameless index.php router handling all CRUD actions via standard HTTP verbs (GET, POST, PUT, DELETE).
Self-Healing Mechanics: The API layer actively monitors database integrity, automatically applying retro-active slugs and patching tokens if database schemas ever shift or drift.
Multi-Environment Ready: Dynamically switches database credentials via .env injection depending on whether it's executing on localhost mapped to a WAMP environment, or running live on a standard cPanel Linux host.
Database Export: Dedicated `/api/export` endpoint allows administrators to download the entire MySQL database as a localized structurally complete `.sql` backup file.

System Architecture
Version Tracking: Global `__APP_VERSION__` variable passed strictly through the Vite bundler directly from `package.json` into the React application footprint, rendering dynamic footers effortlessly.
Changelog Standard: Strictly maintained `CHANGELOG.md` following the "Keep a Changelog" formatting ensures accurate historical documentation of modifications and semantic version implementations.