import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import AdminMusicians from './AdminMusicians';
import AdminEvents from './AdminEvents';
import { formatDate } from '../utils';

const ROLES = [
  { id: 'vocals', dbField: 'vocals_id', label: 'Vocals' },
  { id: 'rhythm_guitar', dbField: 'rhythm_guitar_id', label: 'Rhythm Guitar' }, 
  { id: 'lead_guitar', dbField: 'lead_guitar_id', label: 'Lead Guitar' },       
  { id: 'bass', dbField: 'bass_id', label: 'Bass' },
  { id: 'drums', dbField: 'drums_id', label: 'Drums' },
];

export default function Admin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const { eventId, setEventId, songs, selections, fetchSongs, fetchSelections, events, fetchEvents } = useAppStore();

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

  const deleteSong = async (songId: number) => {
    if (!confirm('Are you sure you want to delete this song?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/songs/${songId}`, { method: 'DELETE' });                                                              
      if (res.ok) {
        fetchSongs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const key = searchParams.get('key');
    const expectedKey = import.meta.env.VITE_ADMIN_KEY || 'rocknroll';

    if (key === expectedKey) {
      setAuthorized(true);
    } else {
      navigate('/');
      return;
    }

    fetchEvents();
    fetchSongs();
    fetchSelections();
    fetchLineups();
  }, [searchParams, navigate]);

  useEffect(() => {
    fetchSongs();
    fetchSelections();
    fetchLineups();
  }, [eventId]);

  const fetchLineups = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/events/${eventId}/lineups`);                                                                          
      if (res.ok) {
        const data = await res.json();
        setLineups(data);
      }
    } catch (e) {
      console.error(e);
    }
  };



const saveLineup = async (songId: number, field: string, musicianId: number | null) => {                                                                          
    const currentLineup = lineups.find((l: any) => l.song_id === songId) || {
      songId, vocalsId: null, rhythmGuitarId: null, leadGuitarId: null, bassId: null, drumsId: null                                                                 
    };

    const payload = {
      songId,
      vocalsId: field === 'vocals_id' ? musicianId : currentLineup.vocals_id,   
      rhythmGuitarId: field === 'rhythm_guitar_id' ? musicianId : currentLineup.rhythm_guitar_id,                                                                     
      leadGuitarId: field === 'lead_guitar_id' ? musicianId : currentLineup.lead_guitar_id,                                                                           
      bassId: field === 'bass_id' ? musicianId : currentLineup.bass_id,
      drumsId: field === 'drums_id' ? musicianId : currentLineup.drums_id,      
    };

    try {
      await fetch(`${import.meta.env.VITE_API_BASE}/lineups/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      fetchLineups();
    } catch (e) {
      console.error(e);
    }
  };

  const getVolunteers = (songId: number, roleId: string) => {
    return selections.filter(s => s.song_id === songId && s.role === roleId);   
  };

  const [activeTab, setActiveTab] = useState<'lineups' | 'events' | 'musicians'>('lineups');

  if (!authorized) return null;

  const groupedSongs = songs.reduce((acc, song) => {
    const artist = song.artist || 'Unknown Artist';
    if (!acc[artist]) acc[artist] = [];
    acc[artist].push(song);
    return acc;
  }, {} as Record<string, typeof songs>);

  Object.keys(groupedSongs).forEach(artist => {
    groupedSongs[artist].sort((a, b) => a.title.localeCompare(b.title));        
  });

  const sortedArtists = Object.keys(groupedSongs).sort();
  const currentUrl = window.location.origin;


  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-700 pb-2 mb-6">
        <button 
          onClick={() => setActiveTab('lineups')} 
          className={`px-4 py-2 font-semibold transition ${activeTab === 'lineups' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Songs & Lineups
        </button>
        <button 
          onClick={() => setActiveTab('events')} 
          className={`px-4 py-2 font-semibold transition ${activeTab === 'events' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Manage Events
        </button>
        <button 
          onClick={() => setActiveTab('musicians')} 
          className={`px-4 py-2 font-semibold transition ${activeTab === 'musicians' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Manage Musicians
        </button>
      </div>

      {activeTab === 'musicians' && <AdminMusicians />}
      {activeTab === 'events' && <AdminEvents />}
      {activeTab === 'lineups' && (
      <>
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 text-white shadow-xl">
          <h2 className="text-2xl font-bold text-blue-400 mb-4">Event Manager</h2>
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Select Active Event To Manage:</label>
            <select
              value={eventId}
              onChange={(e) => setEventId(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name} {ev.date ? `(${formatDate(ev.date)})` : ''}</option>
              ))}
            </select>
            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded text-sm text-blue-200">
              <p className="font-semibold mb-1">🔗 Locked Enrollment Link:</p>
              <input
                type="text"
                readOnly
                value={events.length > 0 ? `${currentUrl}?e=${(events.find(e => e.id === eventId) || events[0])?.slug || ''}` : 'Loading...'}
                className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-gray-300 text-xs cursor-text"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <p className="mt-2 text-xs text-blue-300">Share this link to lock musicians to this event during sign-up.</p>
            </div>
          </div>
        </div>

      <div className="bg-purple-950/20 border border-purple-900 rounded-lg p-6 mt-8 text-white">
        <h2 className="text-3xl font-bold text-purple-400 mb-2">Lineup Dashboard</h2>                                                                                   
        <p className="text-gray-300">Assign musicians to their final lineup spots based on the volunteer roster for this event.</p>                                                  
      </div>

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
                    <th className="text-center px-3 py-3 text-white font-bold text-sm">Actions</th>                                                                               
                  </tr>
                </thead>
                <tbody>
                  {groupedSongs[artist].map(song => {
                    const lineup = lineups.find((l: any) => l.song_id === song.id) || {};                                                                              
                    return (
                      <tr key={song.id} className="border-b border-gray-700 hover:bg-gray-800/50 transition">                                                                           
                        <td className="px-4 py-3">
                          <p className="text-white font-semibold">{song.title}</p>                                                                                                      
                        </td>
                        {ROLES.map(role => {
                          const volunteers = getVolunteers(song.id, role.id);   
                          const selectedId = lineup[role.dbField] || '';        

                          return (
                            <td key={role.id} className="px-3 py-3">
                              <div className="relative">
                                <select
                                  value={selectedId}
                                  onChange={(e) => {
                                    const val = e.target.value ? parseInt(e.target.value, 10) : null;                                                                                               
                                    saveLineup(song.id, role.dbField, val);     
                                  }}
                                  className={`w-full bg-gray-800 border rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500 ${selectedId ? 'border-purple-500/50 text-white' : 'border-gray-700 text-gray-400'}`}                                                                          
                                >
                                  <option value="">-- Select --</option>        
                                  {volunteers.map(v => (
                                    <option key={v.musician_id} value={v.musician_id}>                                                                                                                
                                      {v.musician_name}
                                    </option>
                                  ))}
                                </select>
                                {volunteers.length === 0 && (
                                  <div className="text-xs text-purple-400 mt-1">0 volunteers</div>                                                                                                 
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => navigate(`/song-editor?songId=${song.id}`)}                                                                                                      
                              className="bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm font-semibold"                                                                    
                              title="Edit song"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteSong(song.id)}
                              className="bg-purple-900 hover:bg-purple-800 text-white px-2 py-1 rounded text-sm font-semibold"                                                                      
                              title="Delete song"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  );
}



