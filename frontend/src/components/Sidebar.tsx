import { Link, useLocation } from 'react-router-dom';
import { Grid, ScanLine, X } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: Grid },
  { name: 'Ingestion', path: '/ingest', icon: ScanLine },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={`fixed top-0 left-0 h-screen w-64 bg-[#2B2F36] border-r border-[#3A3F47] flex flex-col z-30 transition-transform duration-200 ease-out lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="p-6 flex items-center h-24">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#2F5BFF] flex items-center justify-center">
            <span className="text-white font-bold text-sm leading-none">W</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">Wealth Wave</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto lg:hidden text-slate-300"
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive 
                  ? 'bg-[#2F5BFF] text-white font-medium' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 mt-auto border-t border-[#3A3F47]">
        <div className="text-xs text-slate-400">
          FlowIQ Finance Console
        </div>
      </div>
    </aside>
  );
}
