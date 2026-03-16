import express from 'express';
import cors from 'cors';
import db, { initDb } from './db.js';

const app = express();
const port = process.env.PORT || 3001;

// Use CORS for frontend communication during dev
app.use(cors());
app.use(express.json());

// Initialize Database Schema and Data
initDb();

// Endpoint: Test
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

// Endpoint: Get all events
app.get('/api/events', (req, res) => {
  const events = db.prepare('SELECT * FROM events ORDER BY created_at DESC').all();
  res.json(events);
});

// Endpoint: Get songs for an event
app.get('/api/events/:eventId/songs', (req, res) => {
  const eventId = req.params.eventId;
  const songs = db.prepare('SELECT * FROM songs WHERE event_id = ?').all(eventId);
  res.json(songs);
});

// Endpoint: Register or get Musician by Token
app.post('/api/musicians/login', (req, res) => {
  const { token, name } = req.body;
  if (!token) return res.status(400).json({ error: 'Token is required' });
  
  const existingUser = db.prepare('SELECT * FROM musicians WHERE token = ?').get(token);
  if (existingUser) {
    return res.json(existingUser);
  } else if (name) {
    const result = db.prepare('INSERT INTO musicians (name, token) VALUES (?, ?)').run(name, token);
    const newUser = db.prepare('SELECT * FROM musicians WHERE id = ?').get(result.lastInsertRowid);
    return res.json(newUser);
  } else {
    return res.status(404).json({ error: 'Musician not found and no name provided to register.' });
  }
});

// Endpoint: Get selections for an event (roster matrix)
app.get('/api/events/:eventId/selections', (req, res) => {
  const eventId = req.params.eventId;
  const selections = db.prepare(`
    SELECT s.song_id, s.musician_id, m.name as musician_name, s.role 
    FROM selections s
    JOIN musicians m ON s.musician_id = m.id
    JOIN songs sg ON s.song_id = sg.id
    WHERE sg.event_id = ?
  `).all(eventId);
  res.json(selections);
});

// Endpoint: Toggle a selection for a musician
app.post('/api/selections/toggle', (req, res) => {
  const { songId, musicianId, role, checked } = req.body;
  if (!songId || !musicianId || !role) return res.status(400).json({ error: 'Missing required fields' });
  
  try {
    if (checked) {
      db.prepare('INSERT OR IGNORE INTO selections (song_id, musician_id, role) VALUES (?, ?, ?)')
        .run(songId, musicianId, role);
    } else {
      db.prepare('DELETE FROM selections WHERE song_id = ? AND musician_id = ? AND role = ?')
        .run(songId, musicianId, role);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update selection' });
  }
});

// Endpoint: Get the finalized setlist/lineups for an event
app.get('/api/events/:eventId/lineups', (req, res) => {
  const eventId = req.params.eventId;
  const lineups = db.prepare(`
    SELECT l.*, 
      v.name as vocals_name,
      rg.name as rhythm_guitar_name,
      lg.name as lead_guitar_name,
      b.name as bass_name,
      d.name as drums_name
    FROM lineups l
    JOIN songs s ON l.song_id = s.id
    LEFT JOIN musicians v ON l.vocals_id = v.id
    LEFT JOIN musicians rg ON l.rhythm_guitar_id = rg.id
    LEFT JOIN musicians lg ON l.lead_guitar_id = lg.id
    LEFT JOIN musicians b ON l.bass_id = b.id
    LEFT JOIN musicians d ON l.drums_id = d.id
    WHERE s.event_id = ?
  `).all(eventId);
  res.json(lineups);
});

// Endpoint: Save a finalized lineup
app.post('/api/lineups/save', (req, res) => {
  const { songId, vocalsId, rhythmGuitarId, leadGuitarId, bassId, drumsId } = req.body;
  if (!songId) return res.status(400).json({ error: 'Song ID is required' });

  try {
    db.prepare(`
      INSERT INTO lineups (song_id, vocals_id, rhythm_guitar_id, lead_guitar_id, bass_id, drums_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(song_id) DO UPDATE SET
        vocals_id = excluded.vocals_id,
        rhythm_guitar_id = excluded.rhythm_guitar_id,
        lead_guitar_id = excluded.lead_guitar_id,
        bass_id = excluded.bass_id,
        drums_id = excluded.drums_id
    `).run(songId, vocalsId, rhythmGuitarId, leadGuitarId, bassId, drumsId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save lineup' });
  }
});

// Endpoint: Delete a song
app.delete('/api/songs/:songId', (req, res) => {
  const songId = req.params.songId;
  if (!songId) return res.status(400).json({ error: 'Song ID is required' });

  try {
    db.prepare('DELETE FROM songs WHERE id = ?').run(songId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// Endpoint: Update a song
app.put('/api/songs/:songId', (req, res) => {
  const songId = parseInt(req.params.songId, 10);
  const { title, artist, genre, lyrics } = req.body;
  
  console.log('PUT /api/songs/:songId', { songId, title, artist, genre });
  
  if (!songId || isNaN(songId)) {
    return res.status(400).json({ error: 'Valid Song ID is required' });
  }
  if (!title || !artist) {
    return res.status(400).json({ error: 'Title and artist are required' });
  }

  try {
    const stmt = db.prepare('UPDATE songs SET title = ?, artist = ?, genre = ?, lyrics = ? WHERE id = ?');
    const result = stmt.run(title, artist, genre || null, lyrics || null, songId);
    
    console.log('Update result:', result);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    const updated = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId);
    res.json(updated);
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ error: 'Failed to update song', details: String(error) });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});