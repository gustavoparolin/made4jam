CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    genre TEXT,
    reference_link TEXT
);

CREATE TABLE IF NOT EXISTS musicians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER,
    musician_id INTEGER,
    role TEXT,
    UNIQUE(song_id, musician_id, role)
);

CREATE TABLE IF NOT EXISTS lineups (
    song_id INTEGER PRIMARY KEY,
    vocals_id INTEGER,
    rhythm_guitar_id INTEGER,
    lead_guitar_id INTEGER,
    bass_id INTEGER,
    drums_id INTEGER
);

INSERT INTO events (name) VALUES ('Made4Jam Premiere Event');

INSERT INTO songs (event_id, title, artist, genre) VALUES
(1, 'Master of Puppets', 'Metallica', 'Metal'),
(1, 'The Trooper', 'Iron Maiden', 'Metal'),
(1, 'Paranoid', 'Black Sabbath', 'Metal'),
(1, 'Painkiller', 'Judas Priest', 'Metal'),
(1, 'Enter Sandman', 'Metallica', 'Metal'),
(1, 'Symphony of Destruction', 'Megadeth', 'Metal'),
(1, 'Rock You Like a Hurricane', 'Scorpions', 'Rock'),
(1, 'Pour Some Sugar on Me', 'Def Leppard', 'Rock'),
(1, 'Crazy Train', 'Ozzy Osbourne', 'Metal'),
(1, 'Walk', 'Pantera', 'Metal');