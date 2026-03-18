import { useEffect, useState } from 'react';

const ROLES = [
  { id: 'vocals', label: 'Vocals' },
  { id: 'rhythm_guitar', label: 'Rhythm Guitar' },
  { id: 'lead_guitar', label: 'Lead Guitar' },
  { id: 'bass', label: 'Bass' },
  { id: 'drums', label: 'Drums' },
];

export default function AdminCoverBands() {
  const [coverBands, setCoverBands] = useState<any[]>([]);
  const [musicians, setMusicians] = useState<any[]>([]);
  const [bandName, setBandName] = useState('');
  const [musicianId, setMusicianId] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCoverBands = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/cover-bands`);
      if (res.ok) {
        setCoverBands(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMusicians = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/musicians`);
      if (res.ok) {
        setMusicians(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchCoverBands(), fetchMusicians()]).finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bandName || !musicianId || !role) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/cover-bands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ band_name: bandName, musician_id: musicianId, role })
      });
      if (res.ok) {
        fetchCoverBands();
        setMusicianId('');
        setRole('');
      } else {
        alert('Failed to add cover band member.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove member from cover band?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/cover-bands/${id}`, { method: 'DELETE' });
      if (res.ok) fetchCoverBands();
    } catch (error) {
      console.error(error);
    }
  };

  const groupedBands = coverBands.reduce((acc, cb) => {
    if (!acc[cb.band_name]) acc[cb.band_name] = [];
    acc[cb.band_name].push(cb);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) return <div className="text-white mt-6">Loading cover bands...</div>;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 text-white shadow-xl mt-6">
      <h2 className="text-2xl font-bold text-blue-400 mb-4">Manage Cover Bands</h2>
      
      <form onSubmit={handleAdd} className="flex flex-wrap gap-4 items-end mb-8 bg-slate-800 p-4 rounded border border-slate-700">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Band Name</label>
          <input 
            type="text" 
            value={bandName} 
            onChange={e => setBandName(e.target.value)} 
            placeholder="e.g. Master of Justice"
            className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 focus:border-purple-500 focus:outline-none text-white w-full md:w-auto"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Musician</label>
          <select 
            value={musicianId} 
            onChange={e => setMusicianId(e.target.value)} 
            className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 focus:border-purple-500 focus:outline-none text-white"
            required
          >
            <option value="">-- Select --</option>
            {musicians.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Role</label>
          <select 
            value={role} 
            onChange={e => setRole(e.target.value)} 
            className="bg-gray-900 border border-gray-600 rounded px-3 py-1.5 focus:border-purple-500 focus:outline-none text-white"
            required
          >
            <option value="">-- Select --</option>
            {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <button type="submit" className="bg-green-700 hover:bg-green-600 px-4 py-1.5 rounded font-semibold transition">
          Add Member
        </button>
      </form>

      <div className="space-y-6">
        {Object.keys(groupedBands).length === 0 && <p className="text-gray-500">No cover bands defined.</p>}
        {Object.keys(groupedBands).map(band => (
          <div key={band} className="border border-slate-700 rounded bg-slate-800/50 p-4">
            <h3 className="text-xl font-bold mb-3">{band}</h3>
            <ul className="space-y-2">
              {groupedBands[band].map((member: any) => (
                <li key={member.id} className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded">
                  <span><span className="font-semibold text-purple-400">{member.musician_name}</span> - {ROLES.find(r => r.id === member.role)?.label || member.role}</span>
                  <button onClick={() => handleDelete(member.id)} className="text-red-500 hover:text-red-400 text-sm">Remove</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}