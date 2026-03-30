import React from 'react';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';

export function Layout({ children }) {
  return (
    <div className="flex bg-[#060e20] min-h-screen font-body text-white">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <TopNavbar />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
