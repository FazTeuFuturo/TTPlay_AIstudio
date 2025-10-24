import React, { useState, useEffect } from 'react';
import { Club, TournamentEvent, User, SubscriptionPlan, TournamentFormat } from '../types';
import { getClubByAdminId, getTournamentEvents, deleteTournamentEvent } from '../data-service';
import CreateEventForm from './CreateTournamentForm';
import { ManageEvent } from './ManageEvent';
import { CalendarIcon, MapPinIcon } from './Icons';

interface ClubEventsPageProps {
    adminUser: User;
    onNavigate: (view: 'dashboard' | 'checkout' | 'subscription') => void;
}

const EventCardAdmin: React.FC<{ event: TournamentEvent, onSelect: () => void }> = ({ event, onSelect }) => (
    <div onClick={onSelect} className="bg-slate-800/50 border border-slate-700 rounded-lg p-5 hover:bg-slate-800 hover:border-blue-500 transition-all duration-300 cursor-pointer group/card">
        <h3 className="text-xl font-bold text-white group-hover/card:text-blue-400 transition-colors">{event.name}</h3>
        <div className="flex flex-col sm:flex-row justify-between text-slate-300 gap-4 mt-2">
            <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-slate-500"/>
                <span>{new Date(event.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
                <MapPinIcon className="w-5 h-5 text-slate-500"/>
                <span>{event.location}</span>
            </div>
        </div>
    </div>
);

const ClubEventsPage: React.FC<ClubEventsPageProps> = ({ adminUser, onNavigate }) => {
  const [club, setClub] = useState<Club | null>(null);
  const [clubEvents, setClubEvents] = useState<TournamentEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TournamentEvent | null>(null);
  const [view, setView] = useState<'list' | 'create_event'>('list');

  const fetchData = () => {
    const adminClub = getClubByAdminId(adminUser.id);
    if (adminClub) {
      setClub(adminClub);
      const allEvents = getTournamentEvents();
      setClubEvents(allEvents.filter(e => e.club.id === adminClub.id));
    }
  }

  useEffect(() => {
    fetchData();
  }, [adminUser]);
  
  const handleEventCreated = (event: TournamentEvent) => {
    fetchData();
    setSelectedEvent(event); 
    setView('list');
  }

  const handleDeleteEvent = (eventId: string) => {
    // REMOVED window.confirm check
    deleteTournamentEvent(eventId);
    fetchData();
  }

  if (!club) {
    return <div className="text-center p-12">Carregando dados do clube...</div>;
  }
  
  if (selectedEvent) {
    return <ManageEvent event={selectedEvent} onBack={() => {
        setSelectedEvent(null)
        fetchData()
    }} onDataUpdate={fetchData} />
  }
  
  if (view === 'create_event') {
    return <CreateEventForm 
        club={club} 
        onFormClose={(event) => {
            setView('list');
            if (event) handleEventCreated(event);
            else fetchData();
        }} 
    />
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Gerenciar Eventos</h2>
        <button
            onClick={() => setView('create_event')}
            className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors"
        >
            + Criar Novo Evento
        </button>
      </div>
      
      {club.subscription === SubscriptionPlan.FREE && (
        <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-6 mb-8 flex flex-wrap justify-between items-center gap-4">
            <div>
                <h3 className="text-xl font-bold text-white">Desbloqueie todo o potencial da plataforma!</h3>
                <p className="text-blue-200">Crie eventos ilimitados, configure descontos e muito mais com o Plano Pro.</p>
            </div>
            <button 
                onClick={() => onNavigate('subscription')}
                className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2 px-6 rounded transition-colors whitespace-nowrap"
            >
                Faça Upgrade para o Plano Pro
            </button>
        </div>
      )}

      <div className="space-y-6">
        {clubEvents.length > 0 ? (
            clubEvents.map(event => (
                <div key={event.id} className="relative group">
                    <EventCardAdmin 
                        event={event}
                        onSelect={() => setSelectedEvent(event)}
                    />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                        }}
                        className="absolute top-4 right-4 bg-red-600/50 text-red-200 hover:bg-red-600 hover:text-white px-2 py-1 text-xs font-bold rounded transition-all opacity-0 group-hover:opacity-100 duration-300"
                    >
                        Remover
                    </button>
                </div>
            ))
        ) : (
            <div className="text-center py-16 bg-slate-800/30 rounded-lg">
                <h2 className="text-2xl font-bold text-slate-300">Nenhum evento encontrado</h2>
                <p className="text-slate-500 mt-2">Clique em "Criar Novo Evento" para começar.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ClubEventsPage;