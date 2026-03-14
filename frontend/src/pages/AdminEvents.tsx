import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

import { formatDate } from '../utils';

export default function AdminEvents() {
  const { events, fetchEvents } = useAppStore();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newEventName, date: newEventDate || null })
      });
      if (res.ok) {
        setNewEventName('');
        setNewEventDate('');
        await fetchEvents();
      }
    } catch (err) {
      console.error(err);
      alert('Error creating event');
    }
  };

  const handleDeleteEvent = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the event "${name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/events/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchEvents();
      } else {
        alert('Failed to delete event.');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting event.');
    }
  };

  const startEdit = (ev: any) => {
    setEditingId(ev.id);
    setEditName(ev.name);
    setEditDate(ev.date || '');
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, date: editDate || null })
      });
      if (res.ok) {
        setEditingId(null);
        await fetchEvents();
      } else {
        alert('Failed to update event.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 text-white shadow-xl">
        <h2 className="text-2xl font-bold text-green-400 mb-4">Create New Event</h2>
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Event Name</label>
              <input type="text" required value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="e.g. Summer Jam 2026" className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Event Date (Optional)</label>
              <input 
                type="text" 
                onFocus={(e) => e.target.type = 'date'} 
                onBlur={(e) => { 
                  if (!e.target.value) e.target.type = 'text'; 
                }} 
                style={{ colorScheme: 'dark' }} 
                value={newEventDate} 
                onChange={e => setNewEventDate(e.target.value)} 
                placeholder="dd-mmm-yyyy"
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-green-500" 
              />
            </div>
          </div>
          <button type="submit" disabled={!newEventName} className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold transition">
            Create Event
          </button>
        </form>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 text-white shadow-xl">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Manage Events</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="p-3 text-gray-400 font-semibold">ID</th>
                <th className="p-3 text-gray-400 font-semibold">Name</th>
                <th className="p-3 text-gray-400 font-semibold">Date</th>
                <th className="p-3 text-gray-400 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={4} className="p-3 text-center text-gray-500">No events found.</td></tr>
              ) : (
                events.map(ev => (
                  <tr key={ev.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="p-3 text-gray-500">#{ev.id}</td>
                    <td className="p-3">
                      {editingId === ev.id ? (
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="bg-slate-800 border border-blue-500 rounded px-2 py-1 text-white w-full max-w-xs" />
                      ) : (
                        <span className="font-semibold text-gray-200">{ev.name}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {editingId === ev.id ? (
                        <input 
                          type="text" 
                          onFocus={(e) => e.target.type = 'date'} 
                          onBlur={(e) => {
                            if (!e.target.value) e.target.type = 'text';
                          }}
                          style={{ colorScheme: 'dark' }} 
                          value={editDate} 
                          onChange={e => setEditDate(e.target.value)} 
                          placeholder="dd-mmm-yyyy"
                          className="bg-slate-800 border border-blue-500 rounded px-2 py-1 text-white" 
                        />
                      ) : (
                        <span className="text-gray-400">{formatDate(ev.date)}</span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {editingId === ev.id ? (
                        <>
                          <button onClick={() => saveEdit(ev.id)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-semibold mr-2">Save</button>
                          <button onClick={() => setEditingId(null)} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs font-semibold">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(ev)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold mr-2">Edit</button>
                          <button onClick={() => handleDeleteEvent(ev.id, ev.name)} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-semibold">Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
