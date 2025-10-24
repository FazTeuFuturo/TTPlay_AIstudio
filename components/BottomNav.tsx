import React from 'react';
import { User, Role } from '../types';
import { LayoutDashboardIcon, TrophyIcon, UserCircleIcon } from './Icons';

interface BottomNavProps {
  user: User;
  activeView: string;
  onNavigate: (view: 'dashboard' | 'events' | 'profile') => void;
}

const NavItem: React.FC<{ label: string; view: 'dashboard' | 'events' | 'profile'; activeView: string; onClick: (view: 'dashboard' | 'events' | 'profile') => void; icon: React.FC<{className?: string}> }> = ({ label, view, activeView, onClick, icon: Icon }) => {
  const isActive = activeView === view;
  return (
    <button
      onClick={() => onClick(view)}
      className={`flex flex-col items-center justify-center gap-1 w-full transition-colors ${
        isActive
          ? 'text-blue-400'
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ user, activeView, onNavigate }) => {
  const playerNav = [
    { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboardIcon },
    { label: 'Eventos', view: 'events', icon: TrophyIcon },
    { label: 'Perfil', view: 'profile', icon: UserCircleIcon },
  ];

  const adminNav = [
    { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboardIcon },
    { label: 'Eventos', view: 'events', icon: TrophyIcon },
    { label: 'Clube', view: 'profile', icon: UserCircleIcon },
  ];

  const navItems = user.role === Role.PLAYER ? playerNav : adminNav;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800 z-50">
      <nav className="w-full h-full flex items-center justify-around px-2">
        {navItems.map(item => (
          <NavItem
            key={item.view}
            label={item.label}
            view={item.view as 'dashboard' | 'events' | 'profile'}
            activeView={activeView}
            onClick={onNavigate}
            icon={item.icon}
          />
        ))}
      </nav>
    </div>
  );
};

export default BottomNav;