import { create } from 'zustand';

export interface AppEvent {
  id: number;
  name: string;
  date: string | null;
  slug: string;
}

export interface Musician {
  id: number;
  name: string;
  token: string;
}

export interface Song {
  id: number;
  event_id: number;
  title: string;
  artist: string;
  genre: string | null;
  lyrics?: string | null;
  reference_link: string | null;
}

export interface Selection {
  song_id: number;
  musician_id: number;
  musician_name: string;
  role: 'vocals' | 'rhythm_guitar' | 'lead_guitar' | 'bass' | 'drums';
}

interface AppState {
  // Global State
  events: AppEvent[];
  eventId: number;
  eventLocked: boolean;
  musician: Musician | null;
  songs: Song[];
  selections: Selection[];
  viewMode: 'spacious' | 'compact';

  // Actions
  setEventId: (id: number) => void;
  setEventLocked: (locked: boolean) => void;
  fetchEvents: () => Promise<void>;
  setMusician: (musician: Musician) => void;
  logout: () => void;
  fetchSongs: () => Promise<void>;
  fetchSelections: () => Promise<void>;
  toggleSelection: (songId: number, role: string, checked: boolean) => Promise<void>;
  setViewMode: (mode: 'spacious' | 'compact') => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  events: [],
  eventId: parseInt(localStorage.getItem('jam_eventId') || '1'),
  eventLocked: localStorage.getItem('jam_eventLocked') === 'true',
  musician: null,
  songs: [],
  selections: [],
  viewMode: (localStorage.getItem('viewMode') as 'spacious' | 'compact') || 'compact',

  setEventId: (id) => {
    localStorage.setItem('jam_eventId', id.toString());
    set({ eventId: id });
  },

  setEventLocked: (locked) => {
    if (locked) {
      localStorage.setItem('jam_eventLocked', 'true');
    } else {
      localStorage.removeItem('jam_eventLocked');
    }
    set({ eventLocked: locked });
  },

  fetchEvents: async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/events`);
      if (res.ok) {
        const events = await res.json();
        set({ events });
        // Auto-select first event if the locally stored one doesn't exist
        const currentEventId = get().eventId;
        if (events.length > 0 && !events.some((e: AppEvent) => e.id === currentEventId)) {
          get().setEventId(events[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  },

  setMusician: (musician) => {
    localStorage.setItem('jam_token', musician.token);
    localStorage.setItem('jam_name', musician.name);
    set({ musician });
  },

  logout: () => {
    localStorage.removeItem('jam_token');
    set({ musician: null });
  },

  fetchSongs: async () => {
    const { eventId } = get();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/events/${eventId}/songs`);
      if (res.ok) {
        const songs = await res.json();
        set({ songs });
      }
    } catch (error) {
      console.error('Failed to fetch songs:', error);
    }
  },

  fetchSelections: async () => {
    const { eventId } = get();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/events/${eventId}/selections`);
      if (res.ok) {
        const selections = await res.json();
        set({ selections });
      }
    } catch (error) {
      console.error('Failed to fetch selections:', error);
    }
  },

  toggleSelection: async (songId, role, checked) => {
    const { musician, fetchSelections } = get();
    if (!musician) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/selections/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId,
          musicianId: musician.id,
          role,
          checked
        })
      });

      if (res.ok) {
        // Optimistic update could go here, but for simplicity we re-fetch to ensure sync with matrix
        await fetchSelections();
      }
    } catch (error) {
      console.error('Failed to toggle selection:', error);
    }
  },

  setViewMode: (mode) => {
    localStorage.setItem('viewMode', mode);
    set({ viewMode: mode });
  }
}));

