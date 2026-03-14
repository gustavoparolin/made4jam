import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../utils';
import logoUrl from '../assets/made4jam-logo-sm.png';

export default function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState(localStorage.getItem('jam_name') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { 
    setMusician, 
    events, 
    eventId, 
    setEventId, 
    fetchEvents, 
    eventLocked, 
    setEventLocked 
  } = useAppStore();

  // If URL has ?e=xxx, auto-select that event by slug and lock it
  useEffect(() => {
    // If we have a token but no name saved locally, fetch it to pre-fill
    const currentToken = localStorage.getItem('jam_token');
    const locallySavedName = localStorage.getItem('jam_name');
    if (currentToken && !locallySavedName && !name) {
      fetch(`${import.meta.env.VITE_API_BASE}/musicians/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: currentToken })
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.name) {
          setName(data.name);
          localStorage.setItem('jam_name', data.name);
        }
      })
      .catch(() => {});
    }

    fetchEvents().then(() => {
      const params = new URLSearchParams(window.location.search);
      const urlEvent = params.get('e');
      if (urlEvent) {
        // Need to access events from store after fetch
        const state = useAppStore.getState();
        const matchedEvent = state.events.find(ev => ev.slug === urlEvent || ev.id.toString() === urlEvent);
        if (matchedEvent) {
          setEventId(matchedEvent.id);
          setEventLocked(true);
        }
      }
    });
  }, [fetchEvents, setEventId, setEventLocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please tell us your name');
      return;
    }

    if (!eventId) {
      setError('Please select an event to join');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/musicians/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          eventId: eventId,
          token: localStorage.getItem('jam_token') || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMusician({
          id: data.id,
          name: data.name,
          token: data.token
        });
        navigate('/jam');
      } else {
        setError(data.error || 'Failed to join');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
      <div className="text-center mb-8">
        <img src={logoUrl} alt="Made4Jam Logo" className="mx-auto h-10 w-auto" />
        <p className="text-gray-400 mt-2">Pick your songs, tune your gear</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="event" className="block text-sm font-medium text-gray-300 mb-1">
            Rehearsal / Event
          </label>
          
          {eventLocked ? (
            <div className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 font-semibold cursor-not-allowed">
              {(() => {
                const ev = events.find(e => e.id === eventId);
                return ev ? `${ev.name} ${ev.date ? `(${formatDate(ev.date)})` : ''}` : 'Loading Event ...';
              })()}
            </div>
          ) : (
            <select
              id="event"
              value={eventId}
              onChange={(e) => setEventId(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-white"
            >
              <option value="" disabled>Select an Event</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name} {ev.date ? `(${formatDate(ev.date)})` : ''}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
            Your Stage Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jimi Hendrix"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors text-white"
            autoFocus
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900/30 text-red-400 text-sm rounded-lg border border-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'Joining...' : "Let's Jam"}
        </button>
      </form>
    </div>
  );
};
