import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import SongSearch from '../components/SongSearch';

const ROLES = [
  { id: 'vocals', label: 'Vocals' },
  { id: 'rhythm_guitar', label: 'Rhythm Guitar' },
  { id: 'lead_guitar', label: 'Lead Guitar' },
  { id: 'bass', label: 'Bass' },
  { id: 'drums', label: 'Drums' },
];

export default function Jam() {
  const { musician, songs, selections, fetchSongs, fetchSelections, toggleSelection, viewMode } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set());

  const toggleArtist = (artist: string) => {
    const newExpanded = new Set(expandedArtists);
    if (newExpanded.has(artist)) {
      newExpanded.delete(artist);
    } else {
      newExpanded.add(artist);
    }
    setExpandedArtists(newExpanded);
  };

  useEffect(() => {
    // If not logged in, try checking url token, else bounce to home
    if (!musician) {
      const urlToken = searchParams.get('u');
      if (urlToken) {
        // Just send back to Home to process login
        navigate(`/?u=${urlToken}`);
        return;
      }
      navigate('/');
      return;
    }

    fetchSongs();
    fetchSelections();
    
    // Auto-refresh selections every 10 seconds for concurrent viewing
    const interval = setInterval(() => {
      fetchSelections();
    }, 10000);

    return () => clearInterval(interval);
  }, [musician, navigate, fetchSongs, fetchSelections, searchParams]);

  if (!musician) return null;

  const isChecked = (songId: number, role: string) => {
    return selections.some(s => s.song_id === songId && s.musician_id === musician.id && s.role === role);
  };

  const getRoleCount = (songId: number, role: string) => {
    return selections.filter(s => s.song_id === songId && s.role === role).length;
  };

  const groupedSongs = songs.reduce((acc, song) => {
    const artist = song.artist || 'Unknown Artist';
    if (!acc[artist]) acc[artist] = [];
    acc[artist].push(song);
    return acc;
  }, {} as Record<string, typeof songs>);

  // Sort songs within each artist and then sort artists alphabetically
  Object.keys(groupedSongs).forEach(artist => {
    groupedSongs[artist].sort((a, b) => a.title.localeCompare(b.title));
  });

  const sortedArtists = Object.keys(groupedSongs).sort();

  const toggleAll = () => {
    if (expandedArtists.size === sortedArtists.length && sortedArtists.length > 0) {
      setExpandedArtists(new Set());
    } else {
      setExpandedArtists(new Set(sortedArtists));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Rock on, <span className="text-purple-500">{musician.name}</span>!</h2>
          <p className="text-gray-400 mt-1">Select the instruments you want to play for each song below.</p>
          <button 
            onClick={toggleAll}
            className="mt-4 text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded transition"
          >
            {expandedArtists.size === sortedArtists.length && sortedArtists.length > 0 ? 'Collapse All Bands' : 'Expand All Bands'}
          </button>
        </div>
        <div className="flex-1 w-full max-w-md bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
          <SongSearch />
        </div>
      </div>

      {viewMode === 'spacious' ? (
      <div className="space-y-2">
        {sortedArtists.map(artist => (
          <div key={artist}>
            <button
              onClick={() => toggleArtist(artist)}
              className="w-full text-left text-[18px] font-bold text-white border-b border-gray-700 pb-2 hover:text-purple-400 transition flex items-center gap-2 group py-2"
            >
              <span className="inline-block transform transition group-hover:translate-x-1">
                {expandedArtists.has(artist) ? '▼' : '▶'}
              </span>
              {artist}
            </button>
            {expandedArtists.has(artist) && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-700 bg-gray-900">
                    <th className="text-left px-2 py-2 md:px-4 md:py-3 text-white font-bold text-xs md:text-sm w-1/4">Song</th>
                    {ROLES.map(role => (
                      <th key={role.id} className="text-left px-1 py-2 md:px-3 md:py-3 text-white font-bold text-[10px] md:text-xs">
                        {role.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupedSongs[artist].map(song => (
                    <tr key={song.id} className="border-b border-gray-700 hover:bg-gray-800/50 transition">
                      <td className="px-2 py-2 md:px-4 md:py-4 align-top">
                        <p className="text-white font-semibold text-xs md:text-sm">{song.title}</p>
                      </td>
                      {ROLES.map(role => {
                        const checked = isChecked(song.id, role.id);
                        const count = getRoleCount(song.id, role.id);
                        
                        return (
                          <td key={role.id} className="text-center px-3 py-3">
                            <label className="flex flex-col items-center justify-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="w-5 h-5 accent-purple-500 rounded bg-gray-800 border-gray-600" 
                                checked={checked}
                                onChange={(e) => toggleSelection(song.id, role.id, e.target.checked)}
                              />
                              <span className={`text-xs mt-1 font-medium ${checked ? 'text-red-300' : 'text-gray-400'}`}>
                                {count}
                              </span>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        ))}
        {songs.length === 0 && (
          <div className="text-center py-12 text-gray-500">No songs available for this event yet.</div>
        )}
      </div>
      ) : (
      <div className="space-y-2">
        {sortedArtists.map(artist => (
          <div key={artist}>
            <button
              onClick={() => toggleArtist(artist)}
              className="w-full text-left text-[18px] font-bold text-white border-b border-gray-700 pb-2 hover:text-purple-400 transition flex items-center gap-2 group py-2"
            >
              <span className="inline-block transform transition group-hover:translate-x-1">
                {expandedArtists.has(artist) ? '▼' : '▶'}
              </span>
              {artist}
            </button>
            {expandedArtists.has(artist) && (
            <div className="space-y-2">
              {groupedSongs[artist].map(song => (
                <div key={song.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-md transition hover:border-gray-600">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-2">
                    <div>
                      <h4 className="text-base font-bold text-white">{song.title}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {ROLES.map(role => {
                      const checked = isChecked(song.id, role.id);
                      const count = getRoleCount(song.id, role.id);
                      
                      return (
                        <label 
                          key={role.id} 
                          className={`flex flex-col items-center justify-center p-2 rounded border cursor-pointer transition select-none text-xs
                            ${checked 
                              ? 'bg-purple-900/30 border-purple-500 text-purple-100' 
                              : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'}`}
                        >
                          <span className="font-semibold text-center mb-1">{role.label}</span>
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 accent-purple-500 rounded bg-gray-800 border-gray-600" 
                            checked={checked}
                            onChange={(e) => toggleSelection(song.id, role.id, e.target.checked)}
                          />
                          <span className="text-xs mt-0.5 opacity-70">
                            {count}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        ))}
        {songs.length === 0 && (
          <div className="text-center py-12 text-gray-500">No songs available for this event yet.</div>
        )}
      </div>
      )}
    </div>
  );
}
