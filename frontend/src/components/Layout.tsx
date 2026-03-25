import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import { Bell, Menu, Search } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#2B2F36] font-sans flex">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      {mobileNavOpen && (
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          aria-label="Close navigation overlay"
        />
      )}
      
      {/* Main Container */}
      <div className="flex-1 lg:ml-64 ml-0 flex flex-col min-h-screen">
        
        {/* Header */}
        <header className="h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 bg-[#F4F6F8] z-10 border-b border-[#DDE3E8]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden w-9 h-9 rounded-md bg-white border border-[#DDE3E8] flex items-center justify-center text-[#2B2F36]"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-white border border-[#DDE3E8] rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#2F5BFF] w-56 placeholder-[#9CA3AF]"
              />
            </div>
            <button className="w-9 h-9 rounded-md bg-white border border-[#DDE3E8] flex items-center justify-center text-[#6B7280] relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#C4554D]"></span>
            </button>
            <div className="w-9 h-9 rounded-md bg-white overflow-hidden border border-[#DDE3E8] cursor-pointer">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
