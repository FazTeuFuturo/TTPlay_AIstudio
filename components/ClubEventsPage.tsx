import React, { useState, useEffect } from 'react';
import { Club, TournamentEvent, User, SubscriptionPlan } from '../types';
import { getClubByAdminId, getTournamentEvents, deleteTournamentEvent, createTestTournament } from '../data-service';
import CreateEventForm from './CreateTournamentForm';
import { ManageEvent } from './ManageEvent';
import { CalendarIcon, MapPinIcon, SparklesIcon } from './Icons';

interface ClubEventsPageProps {
    adminUser: User;
    onNavigate: (view: 'dashboard' | 'checkout' | 'subscription') => void;
}

const EventCardAdmin: React.FC<{ event: TournamentEvent, onSelect: () => void, onDelete: () => void }> = ({ event, onSelect, onDelete }) => (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-5 hover:bg-slate-800 hover:border-blue-500 transition-all duration-300 group/card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div onClick={onSelect} className="flex-grow cursor-pointer w-full">
            <h3 className="text-xl font-bold text-white group-hover/card:text-blue-400 transition-colors break-words">{event.name}</h3>
            <div className="flex flex-col sm:flex-row sm:items-center text-slate-300 gap-x-6 gap-y-2 mt-2">
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
        <button
            onClick={(e) => {
                e.stopPropagation();
                onDelete();
            }}
            className="bg-red-600/50 text-red-200 hover:bg-red-600 hover:text-white px-3 py-1 text-xs font-bold rounded transition-all duration-300 sm:opacity-0 sm:group-hover/card:opacity-100 flex-shrink-0 self-start sm:self-center"
        >
            Remover
        </button>
    </div>
);


const ClubEventsPage: React.FC<ClubEventsPageProps> = ({ adminUser, onNavigate }) => {
  const [club, setClub] = useState<Club | null>(null);
  const [clubEvents, setClubEvents] = useState<TournamentEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TournamentEvent | null>(null);
  const [view, setView] = useState<'list' | 'create_event'>('list');
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  const fetchData = async () => {
    const adminClub = await getClubByAdminId(adminUser.id);
    if (adminClub) {
      setClub(adminClub);
      const allEvents = await getTournamentEvents();
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

  const handleCreateTestTournament = async () => {
    if (!club) return;
    setIsCreatingTest(true);
    try {
        const newTestEvent = await createTestTournament(club.id);
        await fetchData(); // Refresh the list
        setSelectedEvent(newTestEvent); // Navigate to the new event's manage page
    } catch (error) {
        console.error("Failed to create test tournament:", error);
        alert((error as Error).message || 'Ocorreu um erro ao criar o torneio de teste.');
    } finally {
        setIsCreatingTest(false);
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('Tem certeza que deseja remover este evento e todas as suas categorias? Esta ação não pode ser desfeita.')) {
        await deleteTournamentEvent(eventId);
        fetchData();
    }
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
        <div className="flex flex-wrap gap-4">
            <button
                onClick={handleCreateTestTournament}
                disabled={isCreatingTest}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors flex items-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
                {isCreatingTest ? (
                    'Criando...'
                ) : (
                    <>
                        <SparklesIcon className="w-5 h-5" />
                        Criar Torneio de Testes
                    </>
                )}
            </button>
            <button
                onClick={() => setView('create_event')}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors"
            >
                + Criar Novo Evento
            </button>
        </div>
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
                <EventCardAdmin 
                    key={event.id}
                    event={event}
                    onSelect={() => setSelectedEvent(event)}
                    onDelete={() => handleDeleteEvent(event.id)}
                />
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
