import React from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50 flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <footer className="bg-white border-t border-gray-200 py-3 px-6 text-center text-sm text-gray-600">
        EPMA All Rights Reserved © 2025
      </footer>
    </div>
  );
};

export default Layout;