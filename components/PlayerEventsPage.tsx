import React, { useState, useEffect } from 'react';
import { TournamentEvent, TournamentCategory, User, TournamentStatus, CartItem, TournamentFormat } from '../types';
import { getTournamentEvents, getTournamentCategories, isPlayerEligible, getUserById, cancelPlayerRegistration, getCart } from '../data-service';
import { CalendarIcon, MapPinIcon, UsersIcon, ArrowLeftIcon } from './Icons';
import { CategoryDetails } from './TournamentDetails';

interface PlayerEventsPageProps {
    playerUser: User;
    onAddToCart: (categoryId: string, eventId: string) => void;
}

const formatLabels: Record<TournamentFormat, string> = {
    [TournamentFormat.ELIMINATORIA_SIMPLES]: 'Eliminatória Simples',
    [TournamentFormat.ELIMINATORIA_DUPLA]: 'Eliminatória Dupla',
    [TournamentFormat.TODOS_CONTRA_TODOS]: 'Todos contra Todos',
    [TournamentFormat.GRUPOS_E_ELIMINATORIA]: 'Fase de Grupos e Eliminatória',
};

const EventCard: React.FC<{ event: TournamentEvent, onSelect: () => void }> = ({ event, onSelect }) => (
    <div onClick={onSelect} className="bg-slate-800/50 border border-slate-700 rounded-lg p-5 hover:bg-slate-800 hover:border-blue-500 transition-all duration-300 cursor-pointer group">
        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{event.name}</h3>
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

const CategoryList: React.FC<{ 
    event: TournamentEvent, 
    categories: TournamentCategory[], 
    playerUser: User,
    onAddToCart: (categoryId: string, eventId: string) => void,
    onCancelRegistration: (categoryId: string) => void,
    onSelectCategory: (category: TournamentCategory) => void,
    cartItems: CartItem[],
}> = ({ event, categories, playerUser, onAddToCart, onCancelRegistration, onSelectCategory, cartItems }) => (
    <div className="space-y-4">
        {categories.map(category => {
            const eligible = isPlayerEligible(playerUser, category);
            const isRegistered = category.registrations.some(r => r.userId === playerUser.id);
            const isInCart = cartItems.some(item => item.categoryId === category.id);
            const canRegister = eligible && category.status === TournamentStatus.REGISTRATION && !isRegistered && !isInCart;
            
            const deadline = new Date(event.startDate);
            deadline.setDate(deadline.getDate() - 5);
            const canCancel = new Date() < deadline && isRegistered && (category.status === TournamentStatus.REGISTRATION || category.status === TournamentStatus.REGISTRATION_CLOSED);

            const getButtonState = () => {
                if (isRegistered) return { label: 'Inscrito', disabled: true };
                if (isInCart) return { label: 'No Carrinho', disabled: true };
                if (!eligible) return { label: 'Não elegível', disabled: true };
                if (category.status !== TournamentStatus.REGISTRATION) return { label: 'Inscrições encerradas', disabled: true };
                return { label: `Adicionar ao Carrinho (R$ ${category.entryFee})`, disabled: false };
            }

            const buttonState = getButtonState();

            return (
                <div key={category.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <p 
                            className="text-lg font-bold text-white hover:text-blue-400 cursor-pointer"
                            onClick={() => onSelectCategory(category)}
                        >
                            {category.name}
                        </p>
                        <p className="text-sm text-slate-400">{formatLabels[category.format]}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <UsersIcon className="w-4 h-4" />
                            <span>{category.registrations.length} / {category.maxParticipants}</span>
                        </div>
                        
                        {isRegistered ? (
                             <button
                                onClick={() => canCancel && onCancelRegistration(category.id)}
                                disabled={!canCancel}
                                className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                                    canCancel ? 'bg-red-600/80 hover:bg-red-600 text-white' : 
                                    'bg-slate-700 text-slate-500 cursor-not-allowed'
                                }`}
                                title={!canCancel && (category.status === TournamentStatus.REGISTRATION || category.status === TournamentStatus.REGISTRATION_CLOSED) ? 'Prazo de cancelamento expirado' : ''}
                            >
                                Cancelar Inscrição
                            </button>
                        ) : (
                             <button
                                onClick={() => !buttonState.disabled && onAddToCart(category.id, event.id)}
                                disabled={buttonState.disabled}
                                className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
                                    !buttonState.disabled ? 'bg-blue-600 hover:bg-blue-500 text-white' : 
                                    'bg-slate-700 text-slate-500 cursor-not-allowed'
                                }`}
                            >
                                {buttonState.label}
                            </button>
                        )}
                    </div>
                </div>
            )
        })}
    </div>
);

const PlayerEventsPage: React.FC<PlayerEventsPageProps> = ({ playerUser, onAddToCart }) => {
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [categories, setCategories] = useState<TournamentCategory[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TournamentEvent | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory | null>(null);
  const [currentUser, setCurrentUser] = useState<User>(playerUser);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const fetchData = () => {
    const allEvents = getTournamentEvents();
    const allCategories = getTournamentCategories();

    const activeEvents = allEvents.filter(event => 
        allCategories.some(cat => cat.eventId === event.id && cat.status !== TournamentStatus.COMPLETED)
    );

    setEvents(activeEvents);
    setCategories(allCategories);
    setCurrentUser(getUserById(playerUser.id) || playerUser);
    setCartItems(getCart());
  }

  useEffect(() => {
    fetchData();
  }, [playerUser]);

  const handleCancelRegistration = (categoryId: string) => {
    // REMOVED window.confirm check
    const success = cancelPlayerRegistration(categoryId, playerUser.id);
    if (success) {
        alert('Inscrição cancelada com sucesso.');
        fetchData();
    } else {
        alert('Não foi possível cancelar a inscrição. O prazo pode ter expirado.');
    }
  }

  const handleAddToCart = (categoryId: string, eventId: string) => {
    onAddToCart(categoryId, eventId);
    fetchData(); // Refresh cart state
  }

  if (selectedCategory) {
    return <CategoryDetails 
        category={selectedCategory}
        onBack={() => setSelectedCategory(null)}
        onDataUpdate={fetchData}
    />
  }
  
  if (selectedEvent) {
    const eventCategories = categories.filter(c => c.eventId === selectedEvent.id);
    return (
        <div className="animate-fade-in">
            <button onClick={() => setSelectedEvent(null)} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
                <ArrowLeftIcon className="w-5 h-5"/>
                Voltar para Eventos
            </button>
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">{selectedEvent.name}</h2>
            <p className="text-lg text-slate-400 mb-8">Categorias Disponíveis</p>
            <CategoryList 
                event={selectedEvent}
                categories={eventCategories}
                playerUser={currentUser}
                onAddToCart={handleAddToCart}
                onCancelRegistration={handleCancelRegistration}
                onSelectCategory={setSelectedCategory}
                cartItems={cartItems}
            />
        </div>
    );
  }

  return (
    <div className="animate-fade-in">
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-8">Eventos Disponíveis</h2>
      <div className="grid grid-cols-1 gap-6">
        {events.map(event => (
          <EventCard 
            key={event.id} 
            event={event} 
            onSelect={() => setSelectedEvent(event)}
          />
        ))}
      </div>
    </div>
  );
};

export default PlayerEventsPage;