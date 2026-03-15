import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { generateRosterGapsText } from '../utils/whatsapp';

const ROLES = [
  { id: 'vocals', label: 'Vocals' },
  { id: 'rhythm_guitar', label: 'Rhythm Guitar' },
  { id: 'lead_guitar', label: 'Lead Guitar' },
  { id: 'bass', label: 'Bass' },
  { id: 'drums', label: 'Drums' },
];

export default function Roster() {
  const { songs, selections, fetchSongs, fetchSelections, viewMode, events, eventId } = useAppStore();
  const [expandedArtists, setExpandedArtists] = useState<Set<string>>(new Set());
  const [shareText, setShareText] = useState<string | null>(null);

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
    fetchSelections();
    
    // Auto-refresh roster every 10 seconds tracking incoming volunteers
    const interval = setInterval(() => {
      fetchSelections();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchSongs, fetchSelections]);

  const getMusiciansForRole = (songId: number, role: string) => {
    return selections
      .filter(s => s.song_id === songId && s.role === role)
      .map(s => s.musician_name);
  };

  const groupedSongs = songs.reduce((acc, song) => {
    const artist = song.artist || 'Unknown Artist';
    if (!acc[artist]) acc[artist] = [];
    acc[artist].push(song);
    return acc;
  }, {} as Record<string, typeof songs>);

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
      <div className="mb-8 flex flex-col items-start">
        <h2 className="text-3xl font-bold">Public Roster</h2>
        <p className="text-gray-400 mt-2">See who's signed up for what. Find the gaps and volunteer!</p>
        <div className="mt-4 flex gap-2">
          <button 
            onClick={toggleAll}
            className="text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded transition"
          >
            {expandedArtists.size === sortedArtists.length && sortedArtists.length > 0 ? 'Collapse All Bands' : 'Expand All Bands'}
          </button>
          
          <button 
            onClick={() => {
              const text = generateRosterGapsText(songs, selections, events.find(e => e.id === eventId));
              if (text) {
                setShareText(text);
              } else {
                alert("No roster gaps found! Every song is fully staffed.");
              }
            }}
            className="text-xs font-semibold bg-green-700 hover:bg-green-600 text-green-100 px-3 py-1.5 rounded transition flex items-center gap-1"
          >
            📤 Share Gaps to WhatsApp
          </button>
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
                        const volunteers = getMusiciansForRole(song.id, role.id);
                        return (
                          <td key={role.id} className="px-1 py-2 md:px-3 md:py-3 align-top">
                            {volunteers.length > 0 ? (
                              <ul className="space-y-1">
                                {volunteers.map((name, i) => (
                                  <li key={i} className="text-xs md:text-sm border-l-2 border-purple-500 pl-2 text-gray-300">
                                    {name}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-xs text-purple-400 italic">
                                0
                              </span>
                            )}
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
                <div key={song.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-md">
                  <div className="mb-2">
                    <h4 className="text-base font-bold text-white mb-1">{song.title}</h4>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                    {ROLES.map(role => {
                      const volunteers = getMusiciansForRole(song.id, role.id);
                      return (
                        <div key={role.id} className="bg-gray-900 border border-gray-700 rounded p-2">
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">{role.label}</h4>
                          {volunteers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {volunteers.map((name, i) => (
                                <span key={i} className="text-xs bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-purple-500/70 italic">None</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        ))}
      </div>
      )}

      {shareText && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-lg w-full p-6 space-y-4">
            <h3 className="text-xl font-bold">Share Roster Gaps</h3>
            <p className="text-sm text-gray-400 mb-2">Copy this text and paste it into WhatsApp:</p>
            <textarea 
              readOnly 
              value={shareText} 
              className="w-full h-64 bg-gray-900 border border-gray-700 rounded p-3 text-sm flex-1 whitespace-pre-wrap"
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setShareText(null)}
                className="px-4 py-2 rounded font-semibold bg-gray-700 hover:bg-gray-600 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareText);
                  alert('Text copied to clipboard!');
                }}
                className="px-4 py-2 rounded font-semibold bg-green-700 hover:bg-green-600 transition"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
