import React from 'react';
// FIX: Import Club type to use in props.
import { User, Role, Club } from '../types';
import { LayoutDashboardIcon, TrophyIcon, UserCircleIcon } from './Icons';

interface SidebarProps {
  user: User;
  // FIX: Add managedClub prop to display club-specific info.
  managedClub: Club | null;
  activeView: string;
  onNavigate: (view: 'dashboard' | 'events' | 'profile') => void;
}

const NavItem: React.FC<{ label: string; view: 'dashboard' | 'events' | 'profile'; activeView: string; onClick: (view: 'dashboard' | 'events' | 'profile') => void }> = ({ label, view, activeView, onClick }) => {
  const isActive = activeView === view;
  return (
    <button
      onClick={() => onClick(view)}
      className={`w-full text-left px-4 py-2 rounded-lg transition-colors text-sm font-semibold ${
        isActive
          ? 'bg-blue-500/20 text-blue-300'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ user, managedClub, activeView, onNavigate }) => {
  const playerNav = [
    { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboardIcon },
    { label: 'Eventos', view: 'events', icon: TrophyIcon },
    { label: 'Meu Perfil', view: 'profile', icon: UserCircleIcon },
  ];

  const adminNav = [
    { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboardIcon },
    { label: 'Gerenciar Eventos', view: 'events', icon: TrophyIcon },
    { label: 'Perfil do Clube', view: 'profile', icon: UserCircleIcon },
  ];

  const navItems = user.role === Role.PLAYER ? playerNav : adminNav;

  // FIX: Use managedClub to display club info if available, similar to the Header component.
  const displayInfo = managedClub ? {
      name: managedClub.name,
      avatar: managedClub.logo || `https://picsum.photos/seed/${managedClub.id}/100/100`,
      roleText: 'Admin do Clube'
  } : {
      name: user.name,
      avatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
      roleText: 'Atleta'
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 h-full hidden md:block">
      <div className="flex items-center gap-4 mb-6 p-2">
        <img src={displayInfo.avatar} alt={displayInfo.name} className="w-12 h-12 rounded-full" />
        <div>
          <p className="font-bold text-white whitespace-nowrap">{displayInfo.name}</p>
          <p className="text-xs text-slate-400">{displayInfo.roleText}</p>
        </div>
      </div>
      <nav className="space-y-2">
        {navItems.map(item => (
          <NavItem
            key={item.view}
            label={item.label}
            view={item.view as 'dashboard' | 'events' | 'profile'}
            activeView={activeView}
            onClick={onNavigate}
          />
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;