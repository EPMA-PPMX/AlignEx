import React from 'react';
import Sidebar from './Sidebar';
import ChatbaseWidget from './ChatbaseWidget';
 
interface LayoutProps {
  children: React.ReactNode;
}
 
const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
<div className="flex h-screen bg-white">
<Sidebar />
<main className="flex-1 overflow-auto">
        {children}
</main>
<ChatbaseWidget />
</div>
  );
};
 
export default Layout;