import React from 'react';
import { User, Role, Club, ClubMemberRole } from '../types';
import { LayoutDashboardIcon, TrophyIcon, UserCircleIcon } from './Icons';

interface SidebarProps {
  user: User;
  managedClub: Club | null;
  clubRole?: ClubMemberRole | null;
  managedClubsCount?: number;
  activeView: string;
  onNavigate: (view: 'dashboard' | 'events' | 'members' | 'profile') => void;
  onSwitchClub?: () => void;
}

const NavItem: React.FC<{ label: string; view: 'dashboard' | 'events' | 'members' | 'profile'; activeView: string; onClick: (view: 'dashboard' | 'events' | 'members' | 'profile') => void }> = ({ label, view, activeView, onClick }) => {
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

const Sidebar: React.FC<SidebarProps> = ({ user, managedClub, clubRole, managedClubsCount, activeView, onNavigate, onSwitchClub }) => {
  const playerNav = [
    { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboardIcon },
    { label: 'Eventos', view: 'events', icon: TrophyIcon },
    { label: 'Meu Perfil', view: 'profile', icon: UserCircleIcon },
  ];

  const adminNav = [
    { label: 'Dashboard', view: 'dashboard', icon: LayoutDashboardIcon },
    { label: 'Gerenciar Eventos', view: 'events', icon: TrophyIcon },
    { label: 'Membros', view: 'members', icon: UserCircleIcon },
    { label: 'Perfil do Clube', view: 'profile', icon: UserCircleIcon },
  ];

  const navItems = user.role === Role.PLAYER ? playerNav : adminNav;

  const getRoleLabel = (role?: ClubMemberRole) => {
    if (!role) return 'Admin do Clube';
    switch (role) {
      case ClubMemberRole.OWNER: return 'Proprietário';
      case ClubMemberRole.ADMIN: return 'Administrador';
      case ClubMemberRole.STAFF: return 'Auxiliar';
      case ClubMemberRole.PLAYER: return 'Atleta do Clube';
      default: return 'Admin do Clube';
    }
  };

  const displayInfo = managedClub ? {
      name: managedClub.name,
      avatar: managedClub.logo || `https://picsum.photos/seed/${managedClub.id}/100/100`,
      roleText: getRoleLabel(clubRole || undefined)
  } : {
      name: user.name,
      avatar: user.avatar || `https://i.pravatar.cc/150?u=${user.id}`,
      roleText: 'Atleta'
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 h-full hidden md:block">
      <div className="flex items-center gap-4 mb-6 p-2">
        <img src={displayInfo.avatar} alt={displayInfo.name} className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white truncate" title={displayInfo.name}>{displayInfo.name}</p>
          <p className="text-xs text-slate-400">{displayInfo.roleText}</p>
        </div>
      </div>
      <nav className="space-y-2">
        {navItems.map(item => (
          <NavItem
            key={item.view}
            label={item.label}
            view={item.view as 'dashboard' | 'events' | 'members' | 'profile'}
            activeView={activeView}
            onClick={onNavigate}
          />
        ))}
        
        {/* Botão Trocar Clube - Só mostra se gerenciar múltiplos clubes */}
        {managedClub && managedClubsCount && managedClubsCount > 1 && onSwitchClub && (
          <button
            onClick={onSwitchClub}
            className="w-full mt-4 px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-sm font-semibold flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Trocar Clube
          </button>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
