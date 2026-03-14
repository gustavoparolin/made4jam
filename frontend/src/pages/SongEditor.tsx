import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function SongEditor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { songs } = useAppStore();
  
  const songId = parseInt(searchParams.get('songId') || '0', 10);
  const song = songs.find(s => s.id === songId);

  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    genre: '',
    lyrics: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newArtist, setNewArtist] = useState('');

  // Get unique artists from all songs, sorted alphabetically
  const uniqueArtists = Array.from(new Set(songs.map(s => s.artist)))
    .filter(Boolean)
    .sort();

  useEffect(() => {
    if (song) {
      setFormData({
        title: song.title || '',
        artist: song.artist || '',
        genre: song.genre || '',
        lyrics: song.lyrics || '',
      });
    }
  }, [song]);

  if (!song) {
    return (
      <div className="space-y-6">
        <div className="bg-purple-950/20 border border-purple-900 rounded-lg p-6 text-white">
          <h2 className="text-2xl font-bold text-purple-400">Song not found</h2>
          <p className="text-gray-300 mt-2">The song you're trying to edit doesn't exist.</p>
          <button
            onClick={() => navigate("/admin?key=${import.meta.env.VITE_ADMIN_KEY || 'rocknroll'}")}
            className="mt-4 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded font-semibold"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/songs/${songId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('✓ Song updated successfully!');
        // Refresh the songs data in the store
        const { fetchSongs } = useAppStore.getState();
        fetchSongs();
        
        setTimeout(() => {
          navigate("/admin?key=${import.meta.env.VITE_ADMIN_KEY || 'rocknroll'}");
        }, 1500);
      } else {
        setMessage(`✗ ${data.error || 'Failed to update song'}`);
      }
    } catch (e) {
      console.error(e);
      setMessage('✗ Error updating song: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-purple-950/20 border border-purple-900 rounded-lg p-6 mb-8 text-white">
        <h2 className="text-3xl font-bold text-purple-400 mb-2">Edit Song</h2>
        <p className="text-gray-300">Update band name, song details, and add lyrics.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Field */}
        <div>
          <label className="block text-white font-semibold mb-2">Song Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            required
          />
        </div>

        {/* Artist/Band Field - Dropdown */}
        <div>
          <label className="block text-white font-semibold mb-2">Band/Artist</label>
          <select
            name="artist"
            value={formData.artist}
            onChange={handleChange}
            className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            required
          >
            <option value="">-- Select Artist --</option>
            {uniqueArtists.map(artist => (
              <option key={artist} value={artist}>
                {artist}
              </option>
            ))}
            {formData.artist && !uniqueArtists.includes(formData.artist) && (
              <option value={formData.artist}>{formData.artist} (new)</option>
            )}
          </select>
          
          {/* Option to add new artist */}
          <div className="mt-3 text-xs text-gray-400">
            <p className="mb-2">Or add a new artist:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newArtist}
                onChange={(e) => setNewArtist(e.target.value)}
                placeholder="Type new artist name..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1 text-white focus:outline-none focus:border-purple-500 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (newArtist.trim()) {
                    setFormData(prev => ({ ...prev, artist: newArtist }));
                    setNewArtist('');
                  }
                }}
                className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-sm font-semibold"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Genre Field */}
        <div>
          <label className="block text-white font-semibold mb-2">Genre</label>
          <input
            type="text"
            name="genre"
            value={formData.genre}
            onChange={handleChange}
            className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Lyrics Field */}
        <div>
          <label className="block text-white font-semibold mb-2">Lyrics</label>
          <textarea
            name="lyrics"
            value={formData.lyrics}
            onChange={handleChange}
            rows={12}
            className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-purple-500 resize-none"
            placeholder="Paste song lyrics here..."
          />
        </div>

        {/* Message */}
        {message && (
          <div className={`text-center py-2 px-4 rounded ${
            message.startsWith('✓') 
              ? 'bg-green-900/30 text-green-300 border border-green-700' 
              : 'bg-purple-900/30 text-purple-300 border border-purple-700'
          }`}>
            {message}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-600 text-white px-4 py-3 rounded font-semibold transition"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin?key=${import.meta.env.VITE_ADMIN_KEY || 'rocknroll'}")}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
