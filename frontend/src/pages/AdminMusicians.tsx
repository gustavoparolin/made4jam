import { useEffect, useState } from 'react';

export default function AdminMusicians() {
  const [musicians, setMusicians] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMusicians = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/musicians`);
      if (res.ok) {
        const data = await res.json();
        setMusicians(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMusicians();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete musician "${name}"? This will also remove them from all lineups and selections.`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/musicians/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMusicians();
      } else {
        alert('Failed to delete musician.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (m: any) => {
    setEditingId(m.id);
    setEditName(m.name);
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/musicians/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName })
      });
      if (res.ok) {
        setEditingId(null);
        fetchMusicians();
      } else {
        alert('Failed to update musician.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="text-white">Loading musicians...</div>;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 text-white shadow-xl mt-6">
      <h2 className="text-2xl font-bold text-blue-400 mb-4">Manage Musicians</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="p-3 text-gray-400 font-semibold">ID</th>
              <th className="p-3 text-gray-400 font-semibold">Name</th>
              <th className="p-3 text-gray-400 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {musicians.length === 0 ? (
              <tr><td colSpan={3} className="p-3 text-center text-gray-500">No musicians found.</td></tr>
            ) : (
              musicians.map(m => (
                <tr key={m.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="p-3 text-gray-500">#{m.id}</td>
                  <td className="p-3">
                    {editingId === m.id ? (
                      <input 
                        type="text" 
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="bg-slate-800 border border-blue-500 rounded px-2 py-1 text-white w-full max-w-xs"
                      />
                    ) : (
                      <span className="font-semibold text-gray-200">{m.name}</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    {editingId === m.id ? (
                      <>
                        <button onClick={() => saveEdit(m.id)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-semibold mr-2">Save</button>
                        <button onClick={() => setEditingId(null)} className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-xs font-semibold">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(m)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold mr-2">Edit</button>
                        <button onClick={() => handleDelete(m.id, m.name)} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-semibold">Delete</button>
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
  );
}
