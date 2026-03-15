import { Routes, Route, Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAppStore } from './store/useAppStore'
import Home from './pages/Home'
import Jam from './pages/Jam'
import Roster from './pages/Roster'
import Setlist from './pages/Setlist'
import Admin from './pages/Admin'
import SongEditor from './pages/SongEditor'
import logoUrl from './assets/made4jam-logo-sm.png'

function App() {
  const { musician, logout, viewMode, setViewMode } = useAppStore();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-gray-800 border-b border-gray-700 p-4 shadow-md print:hidden">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link to="/" className="flex items-center">
              <img src={logoUrl} alt="Made4Jam Logo" className="h-10 w-auto" />
            </Link>
            <nav className="flex items-center gap-4">
              <div className="flex gap-4 text-sm font-semibold">
                {musician && <Link to="/jam" className="hover:text-purple-400 text-gray-200">Jam</Link>}
                <Link to="/roster" className="hover:text-purple-400 text-gray-200">Roster</Link>
                <Link to="/setlist" className="hover:text-purple-400 text-gray-200">Setlist</Link>
                {!musician && (
                  <Link to={`/admin?key=${import.meta.env.VITE_ADMIN_KEY || 'rocknroll'}`} className="hover:text-purple-400 text-gray-500">Admin</Link>
                )}
              </div>
              
              <div className="flex gap-2 bg-gray-700 p-1 rounded ml-auto">
                <button
                  onClick={() => setViewMode('spacious')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition ${
                    viewMode === 'spacious' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-transparent text-gray-400 hover:text-white'
                  }`}
                  title="Spacious view"
                >
                  ◻
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition ${
                    viewMode === 'compact' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-transparent text-gray-400 hover:text-white'
                  }`}
                  title="Compact view"
                >
                  ▦
                </button>
              </div>
              
              {musician && (
                <button onClick={logout} className="text-gray-400 hover:text-white" title="Logout">
                  <LogOut size={18} />
                </button>
              )}
            </nav>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto w-full p-4 md:p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jam" element={<Jam />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/setlist" element={<Setlist />} />
          <Route path="/song-editor" element={<SongEditor />} />
        </Routes>
      </main>
      
      <footer className="bg-gray-800 border-t border-gray-700 p-4 text-center text-xs text-gray-500 mt-8 print:hidden">
        &copy; {new Date().getFullYear()} Made4Jam v{__APP_VERSION__} - Gustavo Parolin
      </footer>
    </div>
  )
}

export default App
