import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableRow } from '../components/SortableRow';
import { useAppStore } from '../store/useAppStore';
import AdminMusicians from './AdminMusicians';
import AdminEvents from './AdminEvents';
import AdminCoverBands from './AdminCoverBands';
import { formatDate } from '../utils';
import { generateRosterGapsText } from '../utils/whatsapp';
import { generateSetlist, suggestBlockSize } from '../utils/setlistAlgorithm';

const ROLES = [
  { id: 'vocals', dbField: 'vocals_id', label: 'Vocals', isExtra: false },
  { id: 'rhythm_guitar', dbField: 'rhythm_guitar_id', label: 'Rhythm Guitar', isExtra: false },
  { id: 'lead_guitar', dbField: 'lead_guitar_id', label: 'Lead Guitar', isExtra: false },
  { id: 'bass', dbField: 'bass_id', label: 'Bass', isExtra: false },
  { id: 'drums', dbField: 'drums_id', label: 'Drums', isExtra: false },
  { id: 'extra_vocals', dbField: 'extra_vocals_id', label: 'Vocals Extra', isExtra: true },
  { id: 'extra_guitar', dbField: 'extra_guitar_id', label: 'Guitar Extra', isExtra: true },
  { id: 'extra_bass', dbField: 'extra_bass_id', label: 'Bass Extra', isExtra: true },
];

export default function Admin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'lineups' | 'events' | 'musicians' | 'cover_bands'>('lineups');
  const { eventId, setEventId, songs, blocks, selections, fetchSongs, fetchBlocks, fetchSelections, events, fetchEvents } = useAppStore();

  const [lineups, setLineups] = useState<any[]>([]);
  const [shareText, setShareText] = useState<string | null>(null);
  const [selectedSongs, setSelectedSongs] = useState<Set<number>>(new Set());
  const [fetchingLyrics, setFetchingLyrics] = useState(false);
  const [coverBands, setCoverBands] = useState<any[]>([]);
  const [musicians, setMusicians] = useState<any[]>([]);
  const [aiToast, setAiToast] = useState<string | null>(null);
  const undoSnapshotRef = useRef<{ blocks: any[]; songAssignments: Array<{ id: number; block_id: number | null; sort_order: number }> } | null>(null);

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
    fetchBlocks();
    fetchSelections();
    fetchLineups();
    fetchCoverBands();
    fetchMusicians();
  }, [searchParams, navigate]);

  useEffect(() => {
    fetchSongs();
    fetchBlocks();
    fetchSelections();
    fetchLineups();
    fetchMusicians();
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

  const fetchCoverBands = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/cover-bands`);
      if (res.ok) setCoverBands(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMusicians = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/musicians`);
      if (res.ok) setMusicians(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const runAiSetlist = async () => {
    const songsWithLineups = songs.filter(s => lineups.some((l: any) => l.song_id === s.id));
    if (songsWithLineups.length === 0) {
      alert('No songs with assigned lineups found. Assign lineups first.');
      return;
    }

    const drummerIds = new Set(
      lineups.map((l: any) => l.drums_id).filter(Boolean)
    );
    const suggested = suggestBlockSize(songs.length, drummerIds.size);
    const input = prompt(
      `AI Setlist Assistant\n\nGroups songs by drummer, places cover band songs first, and minimises instrument swaps.\n\nMax songs per block (suggested: ${suggested}):`,
      String(suggested)
    );
    if (input === null) return;
    const maxBlockSize = Math.max(1, parseInt(input, 10) || suggested);

    // Snapshot current state for undo
    undoSnapshotRef.current = {
      blocks: blocks.map(b => ({ ...b })),
      songAssignments: songs.map(s => ({ id: s.id, block_id: s.block_id ?? null, sort_order: s.sort_order ?? 0 })),
    };

    const plan = generateSetlist({
      songIds: songs.map(s => s.id),
      lineups: lineups.map((l: any) => ({
        song_id: l.song_id,
        drums_id: l.drums_id ?? null,
        bass_id: l.bass_id ?? null,
        rhythm_guitar_id: l.rhythm_guitar_id ?? null,
        lead_guitar_id: l.lead_guitar_id ?? null,
        vocals_id: l.vocals_id ?? null,
      })),
      coverBands: coverBands.map((cb: any) => ({
        band_name: cb.band_name,
        musician_id: cb.musician_id,
        role: cb.role,
      })),
      musicians: [
        ...new Map(
          lineups
            .filter((l: any) => l.drums_id && l.drums_name)
            .map((l: any) => [l.drums_id, { id: l.drums_id, name: l.drums_name }])
        ).values(),
      ],
      maxBlockSize,
    });

    try {
      // Delete existing blocks
      await Promise.all(
        blocks.map(b =>
          fetch(`${import.meta.env.VITE_API_BASE}/blocks/${b.id}`, { method: 'DELETE' })
        )
      );

      // Create new blocks and collect {name → id} mapping
      const dataBlocks = plan.blocks.filter(b => b.name !== 'Unassigned Songs');
      const createdBlocks: Array<{ id: number; name: string }> = [];
      for (let i = 0; i < dataBlocks.length; i++) {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: eventId, name: dataBlocks[i].name, sort_order: i }),
        });
        if (res.ok) {
          const created = await res.json();
          createdBlocks.push({ id: created.id, name: dataBlocks[i].name });
        }
      }

      // Build song assignments
      const songUpdates: Array<{ id: number; sort_order: number; block_id: number | null }> = [];
      for (let bi = 0; bi < dataBlocks.length; bi++) {
        const blockId = createdBlocks[bi]?.id ?? null;
        dataBlocks[bi].songIds.forEach((songId, si) => {
          songUpdates.push({ id: songId, sort_order: si, block_id: blockId });
        });
      }
      const unassignedBlock = plan.blocks.find(b => b.name === 'Unassigned Songs');
      if (unassignedBlock) {
        unassignedBlock.songIds.forEach((songId, si) => {
          songUpdates.push({ id: songId, sort_order: si, block_id: null });
        });
      }

      if (songUpdates.length > 0) {
        await fetch(`${import.meta.env.VITE_API_BASE}/songs/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(songUpdates),
        });
      }

      await fetchBlocks();
      await fetchSongs();
      setAiToast(`✅ Setlist reorganised into ${dataBlocks.length} block(s).`);
      setTimeout(() => setAiToast(null), 8000);
    } catch (e) {
      console.error('AI Setlist error:', e);
      alert('Something went wrong applying the AI setlist. Check console.');
    }
  };

  const undoAiSetlist = async () => {
    const snap = undoSnapshotRef.current;
    if (!snap) return;

    try {
      // Delete all current blocks
      const currentBlocks = await fetch(`${import.meta.env.VITE_API_BASE}/blocks?event_id=${eventId}`);
      const currentBlockData = currentBlocks.ok ? await currentBlocks.json() : [];
      await Promise.all(
        currentBlockData.map((b: any) =>
          fetch(`${import.meta.env.VITE_API_BASE}/blocks/${b.id}`, { method: 'DELETE' })
        )
      );

      // Recreate snapshot blocks
      const idMap = new Map<number, number>(); // old id → new id
      for (const b of snap.blocks) {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: eventId, name: b.name, sort_order: b.sort_order }),
        });
        if (res.ok) {
          const created = await res.json();
          idMap.set(b.id, created.id);
        }
      }

      // Restore song assignments
      const songUpdates = snap.songAssignments.map(s => ({
        id: s.id,
        sort_order: s.sort_order,
        block_id: s.block_id !== null ? (idMap.get(s.block_id) ?? null) : null,
      }));
      if (songUpdates.length > 0) {
        await fetch(`${import.meta.env.VITE_API_BASE}/songs/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(songUpdates),
        });
      }

      undoSnapshotRef.current = null;
      await fetchBlocks();
      await fetchSongs();
      setAiToast(null);
    } catch (e) {
      console.error('Undo error:', e);
      alert('Undo failed. Check console.');
    }
  };

  const prefillFromCoverBand = async (songId: number, bandName: string) => {
    const members = coverBands.filter(cb => cb.band_name === bandName);
    if (members.length === 0) return;

    const currentLineup = lineups.find((l: any) => l.song_id === songId) || {};
    const payload: any = {
      songId,
      vocalsId: currentLineup.vocals_id || null,
      rhythmGuitarId: currentLineup.rhythm_guitar_id || null,
      leadGuitarId: currentLineup.lead_guitar_id || null,
      bassId: currentLineup.bass_id || null,
      drumsId: currentLineup.drums_id || null,
      extraVocalsId: currentLineup.extra_vocals_id || null,
      extraGuitarId: currentLineup.extra_guitar_id || null,
      extraBassId: currentLineup.extra_bass_id || null,
    };

    members.forEach((m: any) => {
      const hasVolunteers = getVolunteers(songId, m.role).length > 0;
      if (m.role === 'vocals' && !payload.vocalsId && !hasVolunteers) payload.vocalsId = m.musician_id;
      else if (m.role === 'rhythm_guitar' && !payload.rhythmGuitarId && !hasVolunteers) payload.rhythmGuitarId = m.musician_id;
      else if (m.role === 'lead_guitar' && !payload.leadGuitarId && !hasVolunteers) payload.leadGuitarId = m.musician_id;
      else if (m.role === 'bass' && !payload.bassId && !hasVolunteers) payload.bassId = m.musician_id;
      else if (m.role === 'drums' && !payload.drumsId && !hasVolunteers) payload.drumsId = m.musician_id;
    });

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

  const autoFillLineups = async () => {
    const updates: Promise<any>[] = [];

    songs.forEach(song => {
      const currentLineup = lineups.find((l: any) => l.song_id === song.id) || {
        songId: song.id, vocalsId: null, rhythmGuitarId: null, leadGuitarId: null, bassId: null, drumsId: null
      };

      const payload = {
        songId: song.id,
        vocalsId: currentLineup.vocals_id,
        rhythmGuitarId: currentLineup.rhythm_guitar_id,
        leadGuitarId: currentLineup.lead_guitar_id,
        bassId: currentLineup.bass_id,
        drumsId: currentLineup.drums_id,
        extraVocalsId: currentLineup.extra_vocals_id || null,
        extraGuitarId: currentLineup.extra_guitar_id || null,
        extraBassId: currentLineup.extra_bass_id || null,
      };
      
      let changed = false;

      ROLES.forEach(role => {
        const volunteers = getVolunteers(song.id, role.id);
        const selectedId = (currentLineup as any)[role.dbField] || null;

        if (volunteers.length === 1 && !selectedId) {
          const musicianId = volunteers[0].musician_id;
          
          if (role.dbField === 'vocals_id') payload.vocalsId = musicianId;
          else if (role.dbField === 'rhythm_guitar_id') payload.rhythmGuitarId = musicianId;
          else if (role.dbField === 'lead_guitar_id') payload.leadGuitarId = musicianId;
          else if (role.dbField === 'bass_id') payload.bassId = musicianId;
          else if (role.dbField === 'drums_id') payload.drumsId = musicianId;
          
          changed = true;
        }
      });

      if (changed) {
        updates.push(
          fetch(`${import.meta.env.VITE_API_BASE}/lineups/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        );
      }
    });

    if (updates.length > 0) {
      if (confirm(`Found ${updates.length} songs with straightforward assignments to auto-fill. Proceed?`)) {
        try {
          await Promise.all(updates);
          fetchLineups();
          alert('Auto-fill complete!');
        } catch (e) {
          console.error(e);
          alert('Error during auto-fill.');
        }
      }
    } else {
      alert('No obvious auto-fill gaps found (need exactly 1 volunteer for an empty slot).');
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
      extraVocalsId: field === 'extra_vocals_id' ? musicianId : currentLineup.extra_vocals_id,
      extraGuitarId: field === 'extra_guitar_id' ? musicianId : currentLineup.extra_guitar_id,
      extraBassId: field === 'extra_bass_id' ? musicianId : currentLineup.extra_bass_id,
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

  const selectUnplayableSongs = () => {
    const unplayable = new Set<number>();
    songs.forEach((song: any) => {
      const drummers = getVolunteers(song.id, 'drums').length;
      const bassists = getVolunteers(song.id, 'bass').length;
      const leadGuitars = getVolunteers(song.id, 'lead_guitar').length;
      const rhythmGuitars = getVolunteers(song.id, 'rhythm_guitar').length;

      if (drummers === 0 || bassists === 0 || (leadGuitars === 0 && rhythmGuitars === 0)) {
        unplayable.add(song.id);
      }
    });

    if (unplayable.size === 0) {
      alert("No unplayable songs found!");
    } else {
      setSelectedSongs(unplayable);
    }
  };

  const deleteSelectedSongs = async () => {
    if (selectedSongs.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedSongs.size} selected song(s)?`)) return;

    try {
      const promises = Array.from(selectedSongs).map(songId => 
        fetch(`${import.meta.env.VITE_API_BASE}/songs/${songId}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      fetchSongs();
      setSelectedSongs(new Set());
    } catch (e) {
      console.error('Error deleting multiple songs', e);
    }
  };

  const fetchAllLyrics = async () => {
    const songsWithoutLyrics = songs.filter(s => !s.lyrics);
    if (songsWithoutLyrics.length === 0) {
      alert('All songs already have lyrics!');
      return;
    }
    if (!confirm(`Fetch lyrics for ${songsWithoutLyrics.length} song(s) from LRCLIB?`)) return;

    setFetchingLyrics(true);
    let found = 0;
    let failed = 0;

    for (const song of songsWithoutLyrics) {
      try {
        const params = new URLSearchParams({ track_name: song.title, artist_name: song.artist });
        const res = await fetch(`https://lrclib.net/api/search?${params}`);
        if (res.ok) {
          const results = await res.json();
          const match = results[0];
          if (match && (match.plainLyrics || match.syncedLyrics)) {
            const lyrics = match.plainLyrics || match.syncedLyrics;
            await fetch(`${import.meta.env.VITE_API_BASE}/songs/${song.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: song.title, artist: song.artist, genre: song.genre, lyrics })
            });
            found++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setFetchingLyrics(false);
    fetchSongs();
    alert(`Lyrics fetch complete!\n✅ Found: ${found}\n❌ Not found: ${failed}`);
  };

  // --- DnD Flat Items ---
  const sortedBlocks = [...(blocks || [])].sort((a, b) => a.sort_order - b.sort_order);
  const derivedFlatItems: Array<{ type: 'block' | 'song'; id: string; data: any }> = [];

  sortedBlocks.forEach(block => {
    derivedFlatItems.push({ type: 'block', id: 'block-' + block.id, data: block });
    const blockSongs = songs
      .filter(s => s.block_id === block.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    blockSongs.forEach(song => {
      derivedFlatItems.push({ type: 'song', id: 'song-' + song.id, data: song });
    });
  });

  const unassignedSongs = songs
    .filter(s => !s.block_id)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  if (unassignedSongs.length > 0 || sortedBlocks.length === 0) {
    derivedFlatItems.push({ type: 'block', id: 'block-unassigned', data: { id: 0, name: 'Unassigned Songs', sort_order: 999 } });
    unassignedSongs.forEach(song => {
      derivedFlatItems.push({ type: 'song', id: 'song-' + song.id, data: song });
    });
  }

  const [activeItems, setActiveItems] = useState(derivedFlatItems);

  useEffect(() => {
    setActiveItems(derivedFlatItems);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, blocks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeItems.findIndex(i => i.id === active.id);
    const newIndex = activeItems.findIndex(i => i.id === over.id);
    const newItems = arrayMove(activeItems, oldIndex, newIndex);
    setActiveItems(newItems);

    let currentBlockId: number | null = null;
    let blockSort = 0;
    const songsToUpdate: Array<{ id: number; sort_order: number; block_id: number | null }> = [];
    const blocksToUpdate: Array<{ id: number; sort_order: number }> = [];

    newItems.forEach((item, index) => {
      if (item.type === 'block') {
        if (item.data.id !== 0) {
          currentBlockId = item.data.id;
          blocksToUpdate.push({ id: currentBlockId!, sort_order: ++blockSort });
        } else {
          currentBlockId = null;
        }
      } else if (item.type === 'song') {
        songsToUpdate.push({ id: item.data.id, sort_order: index, block_id: currentBlockId });
      }
    });

    try {
      if (blocksToUpdate.length > 0) {
        await fetch(`${import.meta.env.VITE_API_BASE}/blocks/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blocksToUpdate)
        });
      }
      if (songsToUpdate.length > 0) {
        await fetch(`${import.meta.env.VITE_API_BASE}/songs/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(songsToUpdate)
        });
      }
      fetchSongs();
      fetchBlocks();
    } catch (e) {
      console.error('DnD reorder error:', e);
    }
  };

  const handleCreateBlock = async () => {
    const name = prompt('Enter Block/Set Name (e.g., Set 1 - Gustavo):');
    if (!name) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, name, sort_order: (blocks || []).length })
    });
    fetchBlocks();
  };

  const handleRenameBlock = async (id: number, oldName: string) => {
    const name = prompt('New Block Name:', oldName);
    if (!name || name === oldName) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/blocks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sort_order: blocks.find(b => b.id === id)?.sort_order })
    });
    fetchBlocks();
  };

  const handleDeleteBlock = async (id: number) => {
    if (!confirm('Delete this block? Songs inside will become Unassigned.')) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/blocks/${id}`, { method: 'DELETE' });
    fetchBlocks();
    fetchSongs();
  };

  if (!authorized) return null;

  const currentUrl = window.location.origin;


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-slate-700 pb-2 mb-6 gap-4">
        <div className="flex flex-wrap gap-4">
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
          <button
            onClick={() => setActiveTab('cover_bands')}
            className={`px-4 py-2 font-semibold transition ${activeTab === 'cover_bands' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Cover Bands
          </button>
        </div>
        <a 
          href={`${import.meta.env.VITE_API_BASE}/export`} 
          download="made4jam_backup.sql"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-800 border border-gray-600 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded text-sm font-semibold transition flex items-center gap-2 w-fit"
          title="Download full SQL backup of all database tables"
        >
          💽 Export Backup
        </a>
      </div>
      {activeTab === 'musicians' && <AdminMusicians />}
      {activeTab === 'events' && <AdminEvents />}
      {activeTab === 'cover_bands' && <AdminCoverBands />}
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
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-3xl font-bold text-purple-400">Lineup Dashboard</h2>
          <div className="flex gap-2">
              <button onClick={() => {
                const text = generateRosterGapsText(songs, selections, events.find(e => e.id === eventId));
                if (text) {
                  setShareText(text);
                } else {
                  alert("No roster gaps found! Every song is fully staffed.");
                }
              }}
              className="bg-green-700 hover:bg-green-600 text-green-100 px-4 py-2 rounded text-sm font-semibold transition flex items-center gap-2"
              title="Share missing musicians to WhatsApp"
            >
              📤 Share Gaps
            </button>
            <button
              onClick={autoFillLineups}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded text-sm font-semibold transition flex items-center gap-2"
              title="Automatically assign musicians to roles where they are the only volunteer"
            >
              ⚡ Smart Auto-Fill
            </button>
            <button
              onClick={selectUnplayableSongs}
              className="bg-orange-700 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-semibold transition flex items-center gap-2"
              title="Select songs without drummer, or missing both bass and guitar"
            >
              🔍 Select Unplayable
            </button>
            <button
              onClick={fetchAllLyrics}
              disabled={fetchingLyrics}
              className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
              title="Fetch lyrics from LRCLIB for all songs without lyrics"
            >
              {fetchingLyrics ? '⏳ Fetching...' : '🌐 Fetch Lyrics'}
            </button>
            <button
              onClick={runAiSetlist}
              disabled={songs.length === 0 || lineups.length === 0}
              className="bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
              title="Auto-sort setlist by drummer, minimising swap time between songs"
            >
              🤖 AI Setlist
            </button>
            {selectedSongs.size > 0 && (
              <button
                onClick={deleteSelectedSongs}
                className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-semibold transition flex items-center gap-2"
                title="Delete selected songs"
              >
                🗑️ Delete Selected ({selectedSongs.size})
              </button>
            )}
          </div>
        </div>
        <p className="text-gray-300">Assign musicians to their final lineup spots based on the volunteer roster for this event.</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={handleCreateBlock} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded text-sm transition">
          + New Block
        </button>
      </div>

      <div className="overflow-x-auto pb-20">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activeItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-700 bg-gray-900">
                  <th className="px-2 py-2 w-8"></th>
                  <th className="text-left px-2 py-2 md:px-4 md:py-3 text-white font-bold text-xs md:text-sm">Band</th>
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
                {activeItems.map(item => {
                  if (item.type === 'block') {
                    const blockSongCount = item.data.id === 0
                      ? songs.filter(s => !s.block_id).length
                      : songs.filter(s => s.block_id === item.data.id).length;
                    return (
                      <SortableRow key={item.id} id={item.id} isBlock={true}>
                        <td colSpan={ROLES.length + 4} className="px-4 py-3">
                          <div className="flex justify-between items-center w-full">
                            <h2 className="text-lg font-bold text-purple-400">
                              {'≡ '}{item.data.name}{' '}
                              <span className="text-gray-400 text-sm font-normal">({blockSongCount} songs)</span>
                            </h2>
                            {item.data.id !== 0 && (
                              <div className="flex gap-2">
                                <button
                                  onPointerDown={(e) => { e.stopPropagation(); handleRenameBlock(item.data.id, item.data.name); }}
                                  className="text-sm text-gray-400 hover:text-white px-2 cursor-pointer z-50 relative"
                                >Rename</button>
                                <button
                                  onPointerDown={(e) => { e.stopPropagation(); handleDeleteBlock(item.data.id); }}
                                  className="text-sm text-red-500 hover:text-red-400 px-2 cursor-pointer z-50 relative"
                                >Delete</button>
                              </div>
                            )}
                          </div>
                        </td>
                      </SortableRow>
                    );
                  }

                  const song = item.data;
                  const lineup = lineups.find((l: any) => l.song_id === song.id) || {};

                  return (
                    <SortableRow key={item.id} id={item.id}>
                      <td className="px-2 py-2 text-gray-500 cursor-grab">{'≡'}</td>
                      <td className="px-2 py-2 md:px-4 md:py-3 text-gray-300 font-bold text-sm">{song.artist}</td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2 cursor-pointer" onPointerDown={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedSongs.has(song.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedSongs);
                              if (e.target.checked) newSet.add(song.id);
                              else newSet.delete(song.id);
                              setSelectedSongs(newSet);
                            }}
                            className="w-4 h-4 text-red-600 bg-gray-900 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
                          />
                          <p className="text-white font-semibold">{song.title}</p>
                        </label>
                      </td>
                      {ROLES.map(role => {
                        const volunteers = role.isExtra ? [] : getVolunteers(song.id, role.id);
                        const selectedId = lineup[role.dbField] || '';
                        const selectedName = lineup[role.dbField.replace('_id', '_name')] || null;
                        // Musician was assigned (e.g. via prefill) but never volunteered — still show their name
                        const assignedNotInList = !role.isExtra && selectedId && !volunteers.some((v: any) => String(v.musician_id) === String(selectedId));

                        return (
                          <td key={role.id} className="px-3 py-3" onPointerDown={e => e.stopPropagation()}>
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
                                {assignedNotInList && (
                                  <option value={selectedId}>{selectedName ?? `#${selectedId}`}</option>
                                )}
                                {role.isExtra
                                  ? musicians.map((m: any) => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))
                                  : volunteers.map((v: any) => (
                                      <option key={v.musician_id} value={v.musician_id}>
                                        {v.musician_name}
                                      </option>
                                    ))
                                }
                              </select>
                              {!role.isExtra && volunteers.length === 0 && !selectedId && (
                                <div className="text-xs text-purple-400 mt-1">0 volunteers</div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center" onPointerDown={e => e.stopPropagation()}>
                        <div className="flex gap-2 justify-center items-center">
                          {coverBands.length > 0 && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  prefillFromCoverBand(song.id, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              className="bg-gray-800 border border-gray-600 rounded px-1 py-1 text-xs text-gray-300 focus:outline-none focus:border-purple-500 max-w-[90px]"
                              title="Pre-fill lineup from a cover band"
                            >
                              <option value="">🎸 Fill...</option>
                              {[...new Set(coverBands.map(cb => cb.band_name))].map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={() => navigate(`/song-editor?songId=${song.id}`)}
                            className="bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm font-semibold"
                            title="Edit song"
                          >
                            {'✏️'}
                          </button>
                          <button
                            onClick={() => deleteSong(song.id)}
                            className="bg-purple-900 hover:bg-purple-800 text-white px-2 py-1 rounded text-sm font-semibold"
                            title="Delete song"
                          >
                            {'🗑️'}
                          </button>
                        </div>
                      </td>
                    </SortableRow>
                  );
                })}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>
      </>
      )}

      {aiToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-indigo-900 border border-indigo-500 text-white px-5 py-3 rounded-lg shadow-2xl text-sm font-semibold">
          <span>{aiToast}</span>
          <button
            onClick={undoAiSetlist}
            className="underline text-indigo-300 hover:text-white transition"
          >
            Undo
          </button>
          <button
            onClick={() => setAiToast(null)}
            className="ml-2 text-indigo-400 hover:text-white transition"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {shareText && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Share Roster Gaps</h3>
            <textarea 
              readOnly 
              className="w-full h-64 bg-gray-800 text-gray-300 p-3 rounded border border-gray-600 mb-4 font-mono text-sm focus:outline-none"
              value={shareText}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShareText(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(shareText);
                  alert("Copied to clipboard!");
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-semibold transition"
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



