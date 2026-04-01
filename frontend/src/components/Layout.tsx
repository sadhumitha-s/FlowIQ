import { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell, Search, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const pageMeta: Record<string, { title: string; sub: string }> = {
  '/': { title: 'Dashboard', sub: 'Financial overview & runway analysis' },
  '/tradeoff': { title: 'Trade-Off Engine', sub: 'Deterministic consequence simulation' },
  '/actions': { title: 'Action Center', sub: 'Execution directives & negotiation drafts' },
  '/simulate': { title: 'Scenario Simulator', sub: 'What-if analysis on your cash position' },
  '/ingest': { title: 'Ingestion Hub', sub: 'Upload invoices, receipts, bank statements' },
  '/transactions': { title: 'Transactions', sub: 'Historical cash flow activity' },
  '/cards': { title: 'Payment Cards', sub: 'Manage your payment methods' },
  '/settings': { title: 'Settings', sub: 'Configure your workspace' },
  '/audit': { title: 'Subscription Audit', sub: 'Security & cost analysis of SaaS spend' },
  '/canvas': { title: 'Scenario Canvas', sub: 'Interactive visual cashflow routing' },
};

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const meta = pageMeta[pathname] ?? { title: 'FlowIQ', sub: '' };
  
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-figma-bg text-slate-50 font-sans flex">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-h-screen relative z-0">
        <header className="h-20 px-8 flex items-center justify-between sticky top-0 bg-figma-bg/90 backdrop-blur-md z-10 border-b border-slate-800/80">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{meta.title}</h1>
            <p className="text-xs text-slate-500">{meta.sub}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
              <input
                type="text"
                placeholder="Search..."
                className="bg-figma-card border border-slate-700/50 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-figma-yellow/50 focus:border-figma-yellow/30 text-white w-56 placeholder-slate-600 transition-all"
              />
            </div>
            <button className="relative w-9 h-9 rounded-xl bg-figma-card border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-figma-coral" />
            </button>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <div 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700/50 cursor-pointer hover:border-slate-500 transition-colors bg-slate-800 flex items-center justify-center text-slate-300"
              >
                {user ? (
                  <span className="text-sm font-bold">{user.email.charAt(0).toUpperCase()}</span>
                ) : (
                  <UserIcon size={16} />
                )}
              </div>
              
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-figma-card border border-slate-800 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-800 mb-2">
                    <p className="text-xs text-slate-500">Signed in as</p>
                    <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                  </div>
                  <button 
                    onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <UserIcon size={14} /> Profile Settings
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors flex items-center gap-2"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>

        
        {/* Overlay to close dropdown when clicking outside */}
        {dropdownOpen && (
          <div 
            className="fixed inset-0 z-0"
            onClick={() => setDropdownOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
