import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

const ROLES = [
  { id: 'vocals_name', label: 'Vocals' },
  { id: 'rhythm_guitar_name', label: 'Rhythm Guitar' },
  { id: 'lead_guitar_name', label: 'Lead Guitar' },
  { id: 'bass_name', label: 'Bass' },
  { id: 'drums_name', label: 'Drums' },
];

export default function Setlist() {
  const { eventId, songs, fetchSongs, viewMode } = useAppStore();
  const [lineups, setLineups] = useState<any[]>([]);
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
    fetchSongs();
    
    // Fetch lineups
    fetch(`${import.meta.env.VITE_API_BASE}/events/${eventId}/lineups`)
      .then(res => res.json())
      .then(data => setLineups(data))
      .catch(err => console.error(err));
      
  }, [eventId, fetchSongs]);

  const getLineupForSong = (songId: number) => {
    return lineups.find(l => l.song_id === songId);
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
  let songIndex = 0;

  const toggleAll = () => {
    if (expandedArtists.size === sortedArtists.length && sortedArtists.length > 0) {
      setExpandedArtists(new Set());
    } else {
      setExpandedArtists(new Set(sortedArtists));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-end border-b border-gray-700 pb-4">
        <div>
          <h2 className="text-4xl font-bold uppercase tracking-wider bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent inline-block">Official Setlist</h2>
          <p className="text-gray-400 mt-2">The final bands organized for the stage.</p>
          <div className="mt-4 flex gap-2 print:hidden">
            <button
              onClick={toggleAll}
              className="text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded transition"
            >
              {expandedArtists.size === sortedArtists.length && sortedArtists.length > 0 ? 'Collapse All Bands' : 'Expand All Bands'}
            </button>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm font-semibold print:hidden"
        >
          Print Setlist
        </button>
      </div>

      {viewMode === 'spacious' ? (
        <div className="space-y-8 print:space-y-4 print:text-black">
          {sortedArtists.map(artist => (
            <div key={artist}>
              <button
                onClick={() => toggleArtist(artist)}
                className="w-full text-left text-[18px] font-bold text-white border-b border-gray-700 pb-2 hover:text-purple-400 transition flex items-center gap-2 group py-2"
              >
                <span className="inline-block transform transition group-hover:translate-x-1 print:hidden">
                  {expandedArtists.has(artist) ? '▼' : '▶'}
                </span>
                {artist}
              </button>
              {expandedArtists.has(artist) && (
              <div className="space-y-4 print:space-y-2">
                {groupedSongs[artist].map(song => {
                  const lineup = getLineupForSong(song.id);
                  songIndex++;
                  
                  return (
                    <div key={song.id} className="bg-gray-800 border border-gray-700 rounded-lg p-5 flex flex-col md:flex-row gap-6 print:border-b print:border-gray-300 print:bg-white print:rounded-none print:p-2">
                      <div className="md:w-1/3">
                        <div className="text-sm bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent inline-block font-bold mb-1">#{songIndex}</div>
                        <h4 className="text-xl font-bold print:text-black">{song.title}</h4>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 flex-grow">
                        {ROLES.map(role => {
                          const player = lineup ? lineup[role.id as keyof typeof lineup] : null;
                          return (
                            <div key={role.id} className="print:text-xs">
                              <div className="text-xs uppercase text-gray-500 font-bold mb-1 print:text-black">{role.label}</div>
                              <div className={`font-medium ${player ? 'text-white print:text-black' : 'text-gray-600 italic print:text-gray-400'}`}>
                                {player || 'TBD'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          ))}
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
              <div className="space-y-1">
                {groupedSongs[artist].map(song => {
                  const lineup = getLineupForSong(song.id);
                  songIndex++;
                  
                  return (
                    <div key={song.id} className="bg-gray-800 border border-gray-700 p-2 text-sm flex gap-3 items-center hover:bg-gray-700 transition">
                      <div className="flex-shrink-0 w-8">
                        <div className="text-xs bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent inline-block font-bold">#{songIndex}</div>
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="font-semibold truncate">{song.title}</div>
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-xs flex-shrink-0">
                        {ROLES.map(role => {
                          const player = lineup ? lineup[role.id as keyof typeof lineup] : null;
                          return (
                            <div key={role.id} className="text-right w-12 truncate" title={player ? player : '-'}>
                              <span className={player ? 'text-white' : 'text-gray-500'}>
                                {player ? player.substring(0, 5) : '-'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
