import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Ingestion from './pages/Ingestion';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans">
        <header className="border-b border-slate-800 p-4 sticky top-0 bg-slate-950/80 backdrop-blur z-10 flex justify-between items-center shadow-sm">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Decision Engine
          </h1>
          <nav className="flex gap-6 text-sm font-medium">
            <Link to="/" className="text-slate-300 hover:text-white transition-colors">Dashboard</Link>
            <Link to="/ingest" className="text-slate-300 hover:text-white transition-colors">Ingestion Config</Link>
          </nav>
        </header>
        
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ingest" element={<Ingestion />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
