import { Link, useLocation } from 'react-router-dom';
import { Grid, ArrowRightLeft, BarChart2, CreditCard, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: Grid },
  { name: 'Transactions', path: '/transactions', icon: ArrowRightLeft },
  { name: 'Analytics', path: '/analytics', icon: BarChart2 },
  { name: 'Cards', path: '/cards', icon: CreditCard },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-figma-sidebar border-r border-slate-800 flex flex-col z-20">
      <div className="p-6 flex items-center h-24">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-figma-yellow flex items-center justify-center">
            <span className="text-figma-bg font-bold text-lg leading-none">W</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Wealth Wave</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                isActive 
                  ? 'bg-figma-yellow text-figma-bg font-semibold shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-figma-bg' : 'text-slate-400'} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 mt-auto">
        <div className="bg-figma-card rounded-3xl p-4 relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="absolute inset-0 bg-gradient-to-r from-figma-yellow/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-sm font-medium text-white mb-1">Upgrade to Pro</p>
          <p className="text-xs text-slate-400 mb-3">Get advanced analytics</p>
          <button className="w-full py-2 bg-figma-bg hover:bg-slate-800 text-figma-yellow text-sm font-medium rounded-xl transition-colors">
            Upgrade
          </button>
        </div>
      </div>
    </aside>
  );
}
