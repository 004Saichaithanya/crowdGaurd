import React from 'react';
import { Search, Bell, User } from 'lucide-react';

export function TopNavbar() {
  return (
    <header className="h-20 w-full flex items-center justify-between px-8 bg-background border-b ghost-border backdrop-blur-md sticky top-0 z-10 transition-all">
      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_12px_rgba(107,254,156,0.6)] animate-pulse"></div>
          <span className="text-xs font-bold tracking-widest text-secondary uppercase">Live Feed</span>
        </div>
        
        <nav className="flex space-x-6">
          <a href="#" className="text-sm font-medium text-on-surface-variant hover:text-white transition-colors">ANALYTICS</a>
          <a href="#" className="text-sm font-medium text-on-surface-variant hover:text-white transition-colors">REPORTS</a>
          <a href="#" className="text-sm font-medium text-on-surface-variant hover:text-white transition-colors">SETTINGS</a>
        </nav>
      </div>

      <div className="flex items-center space-x-6">
        <div className="relative group">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Global system search..." 
            className="bg-surface-container-low border ghost-border text-sm text-white rounded-lg pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/50"
          />
        </div>

        <button className="relative text-on-surface-variant hover:text-white transition-colors p-2 rounded-lg hover:bg-surface-container-low">
          <Bell size={20} />
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error border border-background"></div>
        </button>

        <div className="flex items-center space-x-2 pl-4 border-l ghost-border">
          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border ghost-border">
            <User size={16} className="text-primary"/>
          </div>
          <span className="text-xs font-bold text-on-surface tracking-wider">OP_ADMIN_01</span>
        </div>
      </div>
    </header>
  );
}
