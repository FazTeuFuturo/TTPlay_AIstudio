import React from 'react';
import { User, Club } from '../types';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

interface AppLayoutProps {
  user: User;
  managedClub: Club | null;
  activeView: string;
  onNavigate: (view: 'dashboard' | 'events' | 'profile') => void;
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ user, managedClub, activeView, onNavigate, children }) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-grow flex flex-col md:flex-row">
      {/* Sidebar for desktop */}
      <div className="hidden md:block w-64 flex-shrink-0 pr-8 py-8">
        <Sidebar user={user} managedClub={managedClub} activeView={activeView} onNavigate={onNavigate} />
      </div>
      
      {/* Main content */}
      <div className="flex-grow py-8 min-w-0 pb-24 md:pb-8">
        {children}
      </div>
      
      {/* BottomNav for mobile */}
      <BottomNav user={user} activeView={activeView} onNavigate={onNavigate} />
    </div>
  );
};

export default AppLayout;