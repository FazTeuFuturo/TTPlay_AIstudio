
import React from 'react';
// FIX: The 'Tournament' type does not exist. Using TournamentCategory and TournamentEvent instead to provide all necessary data.
import { TournamentCategory, TournamentEvent, TournamentStatus, User } from '../types';
import { CalendarIcon, MapPinIcon, UsersIcon } from './Icons';

interface TournamentCardProps {
  // FIX: Changed props to be more explicit about data requirements, accepting a category and its parent event.
  category: TournamentCategory;
  event: TournamentEvent;
  onSelect: (category: TournamentCategory) => void;
  currentUser?: User | null;
  onRegister?: (categoryId: string) => void;
}

// FIX: Added styling for the REGISTRATION_CLOSED status to satisfy the Record<TournamentStatus, ...> type.
const statusStyles: Record<TournamentStatus, { bg: string; text: string; label: string }> = {
  [TournamentStatus.REGISTRATION]: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Inscrições Abertas' },
  [TournamentStatus.REGISTRATION_CLOSED]: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Inscrições Encerradas' },
  [TournamentStatus.GROUP_STAGE]: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Fase de Grupos' },
  [TournamentStatus.IN_PROGRESS]: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Em Andamento' },
  [TournamentStatus.COMPLETED]: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Concluído' },
};

export const TournamentCard: React.FC<TournamentCardProps> = ({ category, event, onSelect, currentUser, onRegister }) => {
  // FIX: Using 'category' prop for category-specific data.
  const status = statusStyles[category.status];
  const isRegistered = currentUser && category.registrations.some(r => r.userId === currentUser.id);

  const handleRegisterClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking the button
    if (onRegister) {
      // FIX: Passing category id to onRegister handler.
      onRegister(category.id);
    }
  };
  
  return (
    <div 
      // FIX: Using 'category' for onSelect handler.
      onClick={() => onSelect(category)}
      className="bg-slate-800/50 border border-slate-700 rounded-lg p-5 flex flex-col gap-4 hover:bg-slate-800 hover:border-blue-500 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex justify-between items-start">
        <div>
          {/* FIX: Using 'category.name' for the category title and 'event.club.name' for the club. */}
          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{category.name}</h3>
          <p className="text-sm text-slate-400">{event.club.name}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
          {status.label}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between text-slate-300 gap-4 mt-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-slate-500"/>
          {/* FIX: Using 'event.startDate' for the date. */}
          <span>{new Date(event.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPinIcon className="w-5 h-5 text-slate-500"/>
          {/* FIX: Using 'event.location' for the location. */}
          <span>{event.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-slate-500"/>
          {/* FIX: Using 'category' for registration counts. */}
          <span>{category.registrations.length} / {category.maxParticipants}</span>
        </div>
      </div>
      
      {/* FIX: Using 'category' for registration logic. */}
      {currentUser && onRegister && category.status === TournamentStatus.REGISTRATION && (
        <div className="border-t border-slate-700 mt-4 pt-4">
          {isRegistered ? (
            <p className="text-center text-green-400 font-semibold">✓ Inscrito</p>
          ) : (
            <button
              onClick={handleRegisterClick}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {/* FIX: Using 'category.entryFee' for the fee. */}
              Inscrever-se (R$ {category.entryFee.toFixed(2)})
            </button>
          )}
        </div>
      )}
    </div>
  );
};
