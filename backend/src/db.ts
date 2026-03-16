import Database from 'better-sqlite3';
import path from 'path';

// Using a persistent local file for SQLite database
const dbPath = path.resolve('jam.db');
const db = new Database(dbPath, { verbose: console.log });

// Enable Write-Ahead Logging for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      genre TEXT,
      reference_link TEXT,
      lyrics TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS musicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS selections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id INTEGER NOT NULL,
      musician_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('vocals', 'rhythm_guitar', 'lead_guitar', 'bass', 'drums')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(song_id, musician_id, role),
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
      FOREIGN KEY (musician_id) REFERENCES musicians(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lineups (
      song_id INTEGER PRIMARY KEY,
      vocals_id INTEGER,
      rhythm_guitar_id INTEGER,
      lead_guitar_id INTEGER,
      bass_id INTEGER,
      drums_id INTEGER,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
      FOREIGN KEY (vocals_id) REFERENCES musicians(id) ON DELETE SET NULL,
      FOREIGN KEY (rhythm_guitar_id) REFERENCES musicians(id) ON DELETE SET NULL,
      FOREIGN KEY (lead_guitar_id) REFERENCES musicians(id) ON DELETE SET NULL,
      FOREIGN KEY (bass_id) REFERENCES musicians(id) ON DELETE SET NULL,
      FOREIGN KEY (drums_id) REFERENCES musicians(id) ON DELETE SET NULL
    );
  `);
  
  // Seed a default event if none exists
  const count = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
  if (count.count === 0) {
    console.log('Seeding initial event and sample songs...');
    const result = db.prepare('INSERT INTO events (name) VALUES (?)').run('Initial Jam Session');
    const eventId = result.lastInsertRowid;
    
    const insertSong = db.prepare('INSERT INTO songs (event_id, title, artist, genre) VALUES (?, ?, ?, ?)');
    
    const seedSongs = [
      { artist: 'AC/DC', title: 'Back in Black', genre: 'Hard Rock' },
      { artist: 'AC/DC', title: 'Highway to Hell', genre: 'Hard Rock' },
      { artist: 'AC/DC', title: 'Thunderstruck', genre: 'Hard Rock' },
      { artist: 'Black Sabbath', title: 'Paranoid', genre: 'Heavy Metal' },
      { artist: 'Black Sabbath', title: 'War Pigs', genre: 'Heavy Metal' },
      { artist: 'Black Sabbath', title: 'Iron Man', genre: 'Heavy Metal' },
      { artist: 'Black Sabbath', title: 'Changes', genre: 'Heavy Metal' },
      { artist: 'Black Sabbath', title: 'Bark at the Moon', genre: 'Heavy Metal' },
      { artist: 'Black Sabbath', title: 'Sabbath Bloody Sabbath', genre: 'Heavy Metal' },
      { artist: 'Black Sabbath', title: 'N.I.B.', genre: 'Heavy Metal' },
      { artist: 'Black Sabbath', title: 'Children of the Grave', genre: 'Heavy Metal' },
      { artist: 'Black Sabbath', title: 'The Wizard', genre: 'Heavy Metal' },
      { artist: 'Black Sabbath', title: 'Planet Caravan', genre: 'Heavy Metal' },
      { artist: 'Black Label Society', title: 'Stillborn', genre: 'Heavy Metal' },
      { artist: 'Guns N\' Roses', title: 'Sweet Child O\' Mine', genre: 'Hard Rock' },
      { artist: 'Guns N\' Roses', title: 'Welcome to the Jungle', genre: 'Hard Rock' },
      { artist: 'Guns N\' Roses', title: 'Paradise City', genre: 'Hard Rock' },
      { artist: 'Iron Maiden', title: 'The Trooper', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Run to the Hills', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Fear of the Dark', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Aces High', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: '2 Minutes to Midnight', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Revelations', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Flight of Icarus', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Rime of the Ancient Mariner', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Powerslave', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'The Number of the Beast', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Hallowed Be Thy Name', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Iron Maiden', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Running Free', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Wrathchild', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: '22 Acacia Avenue', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Children of the Damned', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Die With Your Boots On', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Phantom of the Opera', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Flash of the Blade', genre: 'Heavy Metal' },
      { artist: 'Iron Maiden', title: 'Moonchild', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Breaking the Law', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Painkiller', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'You\'ve Got Another Thing Coming', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'The Sentinel', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Living After Midnight', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Electric Eye', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Turbo Lover', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Night Crawler', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Heading Out to the High', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Beyond the Realms of Death', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Hell Patrol', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'The Hellion', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'A Touch of Evil', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'No Surrender', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Grinder', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Hell Bent for Leather', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'All Guns Blazing', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Jawbreaker', genre: 'Heavy Metal' },
      { artist: 'Judas Priest', title: 'Desert Plains', genre: 'Heavy Metal' },
      { artist: 'Megadeth', title: 'Symphony of Destruction', genre: 'Thrash Metal' },
      { artist: 'Megadeth', title: 'Holy Wars... The Punishment Due', genre: 'Thrash Metal' },
      { artist: 'Megadeth', title: 'Hangar 18', genre: 'Thrash Metal' },
      { artist: 'Metallica', title: 'Master of Puppets', genre: 'Thrash Metal' },
      { artist: 'Metallica', title: 'Enter Sandman', genre: 'Heavy Metal' },
      { artist: 'Metallica', title: 'For Whom the Bell Tolls', genre: 'Thrash Metal' },
      { artist: 'Metallica', title: 'Fuel', genre: 'Heavy Metal' },
      { artist: 'Metallica', title: 'Whiplash', genre: 'Thrash Metal' },
      { artist: 'Metallica', title: 'Welcome Home', genre: 'Heavy Metal' },
      { artist: 'Metallica', title: 'Fade to Black', genre: 'Thrash Metal' },
      { artist: 'Metallica', title: 'Until It Sleeps', genre: 'Heavy Metal' },
      { artist: 'Metallica', title: 'Turn the Page', genre: 'Heavy Metal' },
      { artist: 'Metallica', title: 'The Unforgiven', genre: 'Heavy Metal' },
      { artist: 'Metallica', title: 'Seek & Destroy', genre: 'Thrash Metal' },
      { artist: 'Metallica', title: 'Wherever I May Roam', genre: 'Heavy Metal' },
      { artist: 'Metallica', title: 'One', genre: 'Thrash Metal' },
      { artist: 'Metallica', title: 'Nothing Else Matters', genre: 'Heavy Metal' },
      { artist: 'Metallica', title: 'Whiskey in the Jar', genre: 'Hard Rock' },
      { artist: 'Metallica', title: 'Sad But True', genre: 'Heavy Metal' },
      { artist: 'Metallica', title: 'Pulling Teeth', genre: 'Heavy Metal' },
      { artist: 'Metallica', title: 'Am I Evil?', genre: 'Heavy Metal' },
      { artist: 'Metallica', title: 'Creeping Death', genre: 'Thrash Metal' },
      { artist: 'Motörhead', title: 'Ace of Spades', genre: 'Heavy Metal' },
      { artist: 'Ozzy Osbourne', title: 'Crazy Train', genre: 'Heavy Metal' },
      { artist: 'Ozzy Osbourne', title: 'Mr. Crowley', genre: 'Heavy Metal' },
      { artist: 'Ozzy Osbourne', title: 'Bark at the Moon', genre: 'Heavy Metal' },
      { artist: 'Ozzy Osbourne', title: 'Mama I\'m Coming Home', genre: 'Heavy Metal' },
      { artist: 'Ozzy Osbourne', title: 'No More Tears', genre: 'Heavy Metal' },
      { artist: 'Ozzy Osbourne', title: 'I Don\'t Wanna Stop', genre: 'Heavy Metal' },
      { artist: 'Ozzy Osbourne', title: 'I Don\'t Know', genre: 'Heavy Metal' },
      { artist: 'Ozzy Osbourne', title: 'Shot in the Dark', genre: 'Heavy Metal' },
      { artist: 'Ozzy Osbourne', title: 'Dreamer', genre: 'Heavy Metal' },
      { artist: 'Ozzy Osbourne', title: 'Hellraiser', genre: 'Heavy Metal' },
      { artist: 'Ozzy Osbourne', title: 'Close My Eyes Forever', genre: 'Heavy Metal' },
      { artist: 'Ozzy Osbourne', title: 'Suicide Solution', genre: 'Heavy Metal' },
      { artist: 'Pantera', title: 'Walk', genre: 'Groove Metal' },
      { artist: 'Pantera', title: 'Cowboys from Hell', genre: 'Groove Metal' },
      { artist: 'Pantera', title: 'This Love', genre: 'Groove Metal' },
      { artist: 'Pantera', title: 'Fucking Hostile', genre: 'Groove Metal' },
      { artist: 'Rage Against the Machine', title: 'Killing in the Name', genre: 'Alternative Metal' },
      { artist: 'Rage Against the Machine', title: 'Bulls on Parade', genre: 'Alternative Metal' },
      { artist: 'Sepultura', title: 'Roots Bloody Roots', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Refuse/Resist', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'The Place', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Dead Embryonic Cells', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Inner Self', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Ratamahatta', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Territory', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Arise', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Symptom of the Universe', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Attitude', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Slave New World', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Orgasmatron', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Slaves of Pain', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Cut-Throat', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Propaganda', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Desperate Cry', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Beneath the Remains', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Troops of Doom', genre: 'Groove Metal' },
      { artist: 'Sepultura', title: 'Mouth for War', genre: 'Groove Metal' },
      { artist: 'Slayer', title: 'South of Heaven', genre: 'Thrash Metal' },
      { artist: 'Slayer', title: 'Mandatory Suicide', genre: 'Thrash Metal' },
      { artist: 'Slayer', title: 'Seasons in the Abyss', genre: 'Thrash Metal' },
      { artist: 'Slayer', title: 'Angel of Death', genre: 'Thrash Metal' },
      { artist: 'System of a Down', title: 'Chop Suey!', genre: 'Alternative Metal' },
      { artist: 'System of a Down', title: 'Toxicity', genre: 'Alternative Metal' },
    ];

    for (const song of seedSongs) {
      insertSong.run(eventId, song.title, song.artist, song.genre);
    }
  }
}

export default db;