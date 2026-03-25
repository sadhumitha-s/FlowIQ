import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { Bell, Search } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-figma-bg text-slate-50 font-sans flex text-slate-200">
      <Sidebar />
      
      {/* Main Container */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        
        {/* Header */}
        <header className="h-24 px-8 flex items-center justify-between sticky top-0 bg-figma-bg/80 backdrop-blur-md z-10 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
            <p className="text-sm text-slate-400">Welcome back, let's check your finances</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-figma-card border-none rounded-2xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-figma-yellow text-white w-64 placeholder-slate-500"
              />
            </div>
            <button className="w-10 h-10 rounded-full bg-figma-card flex items-center justify-center text-slate-400 hover:text-white transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-figma-coral"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-indigo-500 overflow-hidden ml-2 border-2 border-slate-800 cursor-pointer">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
