import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GitCompare,
  Zap,
  FlaskConical,
  UploadCloud,
  CreditCard,
  Settings,
  Activity,
  ShieldAlert,
  Share2,
} from 'lucide-react';
import { clsx } from 'clsx';

const navGroups = [
  {
    label: 'Core',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/tradeoff', icon: GitCompare, label: 'Trade-Off Engine' },
      { to: '/actions', icon: Zap, label: 'Action Center' },
      { to: '/simulate', icon: FlaskConical, label: 'Scenario Simulator' },
      { to: '/canvas', icon: Share2, label: 'Scenario Canvas' },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/ingest', icon: UploadCloud, label: 'Ingestion Hub' },
      { to: '/audit', icon: ShieldAlert, label: 'Subscription Audit' },
      { to: '/transactions', icon: Activity, label: 'Transactions' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/cards', icon: CreditCard, label: 'Payment Cards' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 bottom-0 w-64 bg-figma-sidebar flex flex-col z-20 border-r border-slate-800">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-figma-yellow flex items-center justify-center flex-shrink-0">
            <span className="text-slate-900 font-black text-sm leading-none">FQ</span>
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">FlowIQ</p>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Decision Engine</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navGroups.map(group => (
          <div key={group.label} className="mb-5">
            <p className="px-3 mb-1.5 text-[9px] font-mono tracking-[2.5px] uppercase text-slate-600">
              {group.label}
            </p>
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 mb-0.5',
                    isActive
                      ? 'bg-figma-yellow/10 text-figma-yellow border-l-2 border-figma-yellow font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-l-2 border-transparent',
                  )
                }
              >
                <Icon size={15} className="flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span className="text-xs text-slate-400">Engine active</span>
        </div>
        <p className="text-[10px] text-slate-600 font-mono">Ravi Textiles Ltd. · Demo</p>
      </div>
    </aside>
  );
}
