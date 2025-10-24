
import React, { useState, useEffect } from 'react';
import { TournamentEvent, TournamentCategory, User, TournamentStatus, TournamentFormat } from '../types';
import { getTournamentCategories, startCategory, closeRegistration, deleteTournamentCategory, reopenRegistration } from '../data-service';
import { ArrowLeftIcon, UsersIcon, SpinnerIcon } from './Icons';
import AddCategoryFlow from './AddCategoryFlow';
import { CategoryDetails } from './TournamentDetails';
import CreateEventForm from './CreateTournamentForm';

interface ManageEventProps {
    event: TournamentEvent;
    onBack: () => void;
    onDataUpdate: () => void;
}

const statusStyles: Record<TournamentStatus, { bg: string; text: string; label: string }> = {
    [TournamentStatus.REGISTRATION]: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Inscrições' },
    [TournamentStatus.REGISTRATION_CLOSED]: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Inscrições Encerradas' },
    [TournamentStatus.GROUP_STAGE]: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Grupos' },
    [TournamentStatus.IN_PROGRESS]: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Em Andamento' },
    [TournamentStatus.COMPLETED]: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Concluído' },
};

const formatLabels: Record<TournamentFormat, string> = {
    [TournamentFormat.ELIMINATORIA_SIMPLES]: 'Eliminatória Simples',
    [TournamentFormat.ELIMINATORIA_DUPLA]: 'Eliminatória Dupla',
    [TournamentFormat.TODOS_CONTRA_TODOS]: 'Todos contra Todos',
    [TournamentFormat.GRUPOS_E_ELIMINATORIA]: 'Fase de Grupos e Eliminatória',
};


export const ManageEvent: React.FC<ManageEventProps> = ({ event, onBack, onDataUpdate }) => {
    const [currentEvent, setCurrentEvent] = useState<TournamentEvent>(event);
    const [categories, setCategories] = useState<TournamentCategory[]>([]);
    const [view, setView] = useState<'list' | 'add_category' | 'view_category' | 'edit_event'>('list');
    const [selectedCategory, setSelectedCategory] = useState<TournamentCategory | null>(null);
    const [loadingCategoryId, setLoadingCategoryId] = useState<string | null>(null);

    const fetchData = () => {
        setCategories(getTournamentCategories(currentEvent.id));
    };

    useEffect(() => {
        fetchData();
    }, [currentEvent]);

    const handleCloseRegistration = async (categoryId: string) => {
        setLoadingCategoryId(categoryId);
        try {
            closeRegistration(categoryId);
            alert("Inscrições encerradas com sucesso!");
            fetchData();
            onDataUpdate();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Erro ao encerrar inscrições: ${errorMessage}`);
        } finally {
            setLoadingCategoryId(null);
        }
    };
    
    const handleReopenRegistration = async (categoryId: string) => {
        setLoadingCategoryId(categoryId);
        try {
            reopenRegistration(categoryId);
            alert("Inscrições reabertas com sucesso!");
            fetchData();
            onDataUpdate();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Erro ao reabrir inscrições: ${errorMessage}`);
        } finally {
            setLoadingCategoryId(null);
        }
    }

    const handleGenerateBrackets = async (categoryId: string) => {
        setLoadingCategoryId(categoryId);
        try {
            startCategory(categoryId);
            alert("Grupos e chave gerados com sucesso! A competição começou.");
            fetchData();
            onDataUpdate();
        } catch (error) {
            console.error(error); // Log the full error for better debugging
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Erro ao gerar chaves: ${errorMessage}`);
        } finally {
            setLoadingCategoryId(null);
        }
    };

    const handleDeleteCategory = (categoryId: string) => {
        deleteTournamentCategory(categoryId);
        fetchData();
        onDataUpdate();
    }
    
    if (view === 'view_category' && selectedCategory) {
        return <CategoryDetails 
            category={selectedCategory} 
            onBack={() => {
                setSelectedCategory(null);
                setView('list');
                fetchData();
            }} 
            onDataUpdate={onDataUpdate}
        />
    }

    if (view === 'add_category') {
        return <AddCategoryFlow
            eventId={currentEvent.id}
            onFormClose={() => {
                setView('list');
                fetchData();
                onDataUpdate();
            }}
        />
    }
    
    if (view === 'edit_event') {
        return <CreateEventForm
            club={currentEvent.club}
            eventToEdit={currentEvent}
            onFormClose={(updatedEvent) => {
                if (updatedEvent) {
                    setCurrentEvent(updatedEvent);
                    onDataUpdate();
                }
                setView('list');
            }}
        />
    }

    const ActionButton: React.FC<{category: TournamentCategory}> = ({ category }) => {
        const isLoading = loadingCategoryId === category.id;
        
        if (category.status === TournamentStatus.REGISTRATION) {
            return (
                <button
                    onClick={() => handleCloseRegistration(category.id)}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed min-w-[150px] flex justify-center items-center"
                    disabled={isLoading}
                >
                    {isLoading ? <SpinnerIcon className="w-4 h-4"/> : 'Encerrar Inscrições'}
                </button>
            )
        }
        if (category.status === TournamentStatus.REGISTRATION_CLOSED) {
             return (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleReopenRegistration(category.id)}
                        className="bg-gray-500 hover:bg-gray-400 text-white font-bold py-1 px-3 rounded text-sm transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                        disabled={isLoading}
                    >
                        {isLoading ? <SpinnerIcon className="w-4 h-4"/> : 'Reabrir'}
                    </button>
                    <button
                        onClick={() => handleGenerateBrackets(category.id)}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed min-w-[150px] flex justify-center items-center"
                        disabled={category.registrations.length < 2 || isLoading}
                    >
                        {isLoading ? <SpinnerIcon className="w-4 h-4"/> : 'Gerar Grupos e Chave'}
                    </button>
                </div>
            )
        }
        return null;
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
             <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
                <ArrowLeftIcon className="w-5 h-5"/>
                Voltar para Eventos
            </button>
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white">{currentEvent.name}</h2>
                    <p className="text-lg text-slate-400">{currentEvent.location}</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setView('edit_event')}
                        className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        Editar Evento
                    </button>
                    <button
                        onClick={() => setView('add_category')}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        + Adicionar Categoria
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {categories.length > 0 ? categories.map(cat => {
                    const status = statusStyles[cat.status];
                     return (
                        <div key={cat.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex flex-wrap justify-between items-center gap-4">
                            <div 
                                className="cursor-pointer flex-grow"
                                onClick={() => {
                                    setSelectedCategory(cat)
                                    setView('view_category');
                                }}
                            >
                                <p className="text-lg font-bold text-white hover:text-blue-400">{cat.name}</p>
                                <div className="flex items-center gap-4 text-sm text-slate-400">
                                    <span>{formatLabels[cat.format]}</span>
                                    {cat.startTime && (
                                        <>
                                            <span className="text-slate-600">|</span>
                                            <span>Início: {cat.startTime}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                                    {status.label}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-300">
                                    <UsersIcon className="w-4 h-4" />
                                    <span>{cat.registrations.length} / {cat.maxParticipants}</span>
                                </div>
                                <ActionButton category={cat} />
                                <button 
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="bg-red-600/20 text-red-400 hover:bg-red-600/40 hover:text-red-300 text-xs font-bold py-1 px-2 rounded transition-colors"
                                    title="Remover categoria"
                                >
                                    Remover
                                </button>
                            </div>
                        </div>
                    )}
                ) : (
                    <div className="text-center py-16 bg-slate-800/30 rounded-lg">
                        <h2 className="text-2xl font-bold text-slate-300">Nenhuma categoria adicionada</h2>
                        <p className="text-slate-500 mt-2">Clique em "Adicionar Categoria" para começar a configurar seu evento.</p>
                    </div>
                )}
            </div>
        </div>
    )
}