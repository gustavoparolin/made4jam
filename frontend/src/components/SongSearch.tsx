import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export default function SongSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const { eventId, fetchSongs } = useAppStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setSearching(true);
    setError('');
    
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`);
      const data = await res.json();
      setResults(data.results || []);
      if (data.results.length === 0) {
        setError('No songs found. Try a different search.');
      }
    } catch (err) {
      setError('Failed to search iTunes. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleAddSong = async (track: any) => {
    setAdding(true);
    try {
      const payload = {
        title: track.trackName,
        artist: track.artistName,
        genre: track.primaryGenreName,
      };

      const res = await fetch(`${import.meta.env.VITE_API_BASE}/events/${eventId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        await fetchSongs(); // refresh the list
        setResults([]);
        setQuery('');
        alert('Song added successfully!');
      } else {
        setError(data.error || 'Failed to add song.');
      }
    } catch (err) {
      setError('Connection error while adding song.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-bold text-white mb-1">Can't find your song? Add it!</h3>
      <p className="text-xs text-gray-400 mb-3">Search iTunes to add a new track to the event list without typos.</p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Master of Puppets Metallica"
          className="flex-grow min-w-0 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={searching}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
        >
          {searching ? 'Search...' : 'Search'}
        </button>
      </form>

      {error && <div className="text-purple-400 text-sm mb-4">{error}</div>}

      {results.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {results.map((track, i) => (
            <div key={i} className="bg-gray-900 border border-gray-700 p-3 rounded-lg flex justify-between items-center gap-4">
              <div className="flex-grow min-w-0">
                <div className="font-bold text-white truncate">{track.trackName}</div>
                <div className="text-sm text-gray-400 truncate">{track.artistName} <span className="text-gray-600 ml-2 text-xs">{track.primaryGenreName}</span></div>
              </div>
              <button
                onClick={() => handleAddSong(track)}
                disabled={adding}
                className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 px-4 rounded transition flex-shrink-0 disabled:opacity-50"
              >
                Add Song
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
