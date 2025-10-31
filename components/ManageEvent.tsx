import React, { useState, useEffect } from 'react';
import { TournamentEvent, TournamentCategory, User, TournamentStatus, TournamentFormat, ClubMemberWithUser } from '../types';
import { getTournamentCategories, startCategory, closeRegistration, deleteTournamentCategory, reopenRegistration, addManualPlayerToCategory, getClubMembers, registerPlayerForCategory } from '../data-service';
import { ArrowLeftIcon, UsersIcon, SpinnerIcon } from './Icons';
import AddCategoryFlow from './AddCategoryFlow';
import { CategoryDetails } from './TournamentDetails';
import CreateEventForm from './CreateTournamentForm';
import CategoryForm from './CategoryForm';

interface ManageEventProps {
    event: TournamentEvent;
    onBack: () => void;
    onDataUpdate: () => void;
}

const statusStyles: Record<TournamentStatus, { bg: string; text: string; label: string }> = {
    [TournamentStatus.REGISTRATION]: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Inscrições' },
    [TournamentStatus.REGISTRATION_CLOSED]: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Inscrições Encerradas' },
    [TournamentStatus.GROUP_STAGE]: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Grupos' },
    [TournamentStatus.KNOCKOUT_PENDING]: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Aguardando Chaves' },
    [TournamentStatus.IN_PROGRESS]: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Em Andamento' },
    [TournamentStatus.COMPLETED]: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Concluído' },
};

const formatLabels: Record<TournamentFormat, string> = {
    [TournamentFormat.ELIMINATORIA_SIMPLES]: 'Eliminatória Simples',
    [TournamentFormat.ELIMINATORIA_DUPLA]: 'Eliminatória Dupla',
    [TournamentFormat.TODOS_CONTRA_TODOS]: 'Todos contra Todos',
    [TournamentFormat.GRUPOS_E_ELIMINATORIA]: 'Fase de Grupos e Eliminatória',
};

const AddManualPlayerModal: React.FC<{ category: TournamentCategory, onClose: () => void, onPlayerAdded: () => void }> = ({ category, onClose, onPlayerAdded }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showNewUserForm, setShowNewUserForm] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserPhone, setNewUserPhone] = useState('');

    useEffect(() => {
        const performSearch = async () => {
            if (searchTerm.trim().length < 3) {
                setSearchResults([]);
                setShowNewUserForm(false);
                return;
            }

            setIsSearching(true);
            try {
                const { searchUsers } = await import('../data-service');
                const results = await searchUsers(searchTerm);
                const registeredIds = new Set(category.registrations.map(r => r.userId));
                const availableResults = results.filter(u => !registeredIds.has(u.id));
                setSearchResults(availableResults);
                setShowNewUserForm(availableResults.length === 0);
            } catch (error) {
                console.error('Erro ao buscar atletas:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(performSearch, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, category.registrations]);

    const handleSelectUser = async (user: User) => {
        setSelectedUser(user);
        setIsLoading(true);
        try {
            const { registerPlayerForCategory } = await import('../data-service');
            const success = await registerPlayerForCategory(category.id, user.id);
            if (success) {
                alert(`Atleta "${user.name}" adicionado com sucesso!`);
                onPlayerAdded();
                onClose();
            } else {
                throw new Error("Não foi possível adicionar o atleta. Ele já pode estar inscrito ou a categoria está cheia.");
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Erro ao adicionar atleta: ${errorMessage}`);
        } finally {
            setIsLoading(false);
            setSelectedUser(null);
        }
    };

    const handleCreateNewUser = async () => {
        if (!newUserName.trim()) {
            alert("O nome do atleta é obrigatório.");
            return;
        }

        setIsLoading(true);
        try {
            const { addManualPlayerToCategory } = await import('../data-service');
            const success = await addManualPlayerToCategory(category.id, newUserName, newUserPhone);
            if (success) {
                alert(`Atleta "${newUserName}" criado e adicionado com sucesso!`);
                onPlayerAdded();
                onClose();
            } else {
                throw new Error("Não foi possível adicionar o atleta.");
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Erro ao adicionar atleta: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md animate-fade-in-up">
                <h3 className="text-xl font-bold text-white mb-4">Adicionar Atleta</h3>
                <p className="text-sm text-slate-400 mb-4">Busque por nome, e-mail ou telefone</p>

                <div className="mb-4">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500"
                        placeholder="Digite para buscar..."
                        autoFocus
                    />
                </div>

                {isSearching && (
                    <div className="flex justify-center py-4">
                        <SpinnerIcon className="w-6 h-6 text-blue-500" />
                    </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                    <div className="max-h-64 overflow-y-auto mb-4 border border-slate-600 rounded">
                        {searchResults.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleSelectUser(user)}
                                disabled={isLoading}
                                className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0 disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                                    <div className="flex-1">
                                        <div className="font-medium text-white">{user.name}</div>
                                        <div className="text-sm text-slate-400">
                                            {user.email} {user.phone && `• ${user.phone}`}
                                        </div>
                                        <div className="text-xs text-slate-500">Rating: {user.currentRating}</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {!isSearching && showNewUserForm && searchTerm.trim().length >= 3 && (
                    <div className="border border-slate-600 rounded p-4 mb-4">
                        <p className="text-sm text-slate-300 mb-4">Nenhum atleta encontrado. Criar novo cadastro?</p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Nome Completo</label>
                                <input
                                    type="text"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                                    placeholder="Nome do atleta"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Telefone (opcional)</label>
                                <input
                                    type="tel"
                                    value={newUserPhone}
                                    onChange={(e) => setNewUserPhone(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                                    placeholder="(XX) XXXXX-XXXX"
                                />
                            </div>
                            <button
                                onClick={handleCreateNewUser}
                                disabled={isLoading || !newUserName.trim()}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-slate-600 flex items-center justify-center"
                            >
                                {isLoading ? <SpinnerIcon className="w-5 h-5"/> : 'Criar e Adicionar'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

const GroupConfigModal: React.FC<{ category: TournamentCategory, onClose: () => void, onConfirm: (config: { playersPerGroup: number, numAdvancing: number }) => Promise<void> }> = ({ category, onClose, onConfirm }) => {
    const [playersPerGroup, setPlayersPerGroup] = useState(category.playersPerGroup || 4);
    const [numAdvancing, setNumAdvancing] = useState(2);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (playersPerGroup < 2) {
            alert("Deve haver pelo menos 2 jogadores por grupo.");
            return;
        }
        if (numAdvancing < 1 || numAdvancing >= playersPerGroup) {
            alert("O número de jogadores que avançam deve ser maior que 0 e menor que o total de jogadores no grupo.");
            return;
        }
        setIsLoading(true);
        await onConfirm({ playersPerGroup, numAdvancing });
        setIsLoading(false);
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md animate-fade-in-up">
                <h3 className="text-xl font-bold text-white mb-4">Configurar Fase de Grupos</h3>
                <p className="text-sm text-slate-400 mb-6">Defina as regras para os grupos antes de iniciar a competição.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="playersPerGroup" className="block text-sm font-medium text-slate-300 mb-2">Jogadores por Grupo</label>
                        <input
                            type="number"
                            id="playersPerGroup"
                            value={playersPerGroup}
                            onChange={(e) => setPlayersPerGroup(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                            required min="2"
                        />
                    </div>
                    <div>
                         <label htmlFor="numAdvancing" className="block text-sm font-medium text-slate-300 mb-2">Quantos Avançam por Grupo</label>
                        <input
                            type="number"
                            id="numAdvancing"
                            value={numAdvancing}
                            onChange={(e) => setNumAdvancing(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                            required min="1"
                        />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors">Cancelar</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-slate-600 flex items-center justify-center min-w-[150px]" disabled={isLoading}>
                            {isLoading ? <SpinnerIcon className="w-5 h-5"/> : 'Confirmar e Iniciar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export const ManageEvent: React.FC<ManageEventProps> = ({ event, onBack, onDataUpdate }) => {
    const [currentEvent, setCurrentEvent] = useState<TournamentEvent>(event);
    const [categories, setCategories] = useState<TournamentCategory[]>([]);
    const [view, setView] = useState<'list' | 'add_category' | 'view_category' | 'edit_event' | 'edit_category'>('list');
    const [selectedCategory, setSelectedCategory] = useState<TournamentCategory | null>(null);
    const [loadingCategoryId, setLoadingCategoryId] = useState<string | null>(null);
    const [showManualAddModal, setShowManualAddModal] = useState(false);
    const [showGroupConfigModal, setShowGroupConfigModal] = useState(false);

    const fetchData = async () => {
        setCategories(await getTournamentCategories(currentEvent.id));
    };

    useEffect(() => {
        fetchData();
    }, [currentEvent]);

    const handleCloseRegistration = async (categoryId: string) => {
        setLoadingCategoryId(categoryId);
        try {
            await closeRegistration(categoryId);
            alert("Inscrições encerradas com sucesso!");
            await fetchData();
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
            await reopenRegistration(categoryId);
            alert("Inscrições reabertas com sucesso!");
            await fetchData();
            onDataUpdate();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Erro ao reabrir inscrições: ${errorMessage}`);
        } finally {
            setLoadingCategoryId(null);
        }
    }

    const handleStartCategory = async (category: TournamentCategory) => {
        if (category.format === TournamentFormat.GRUPOS_E_ELIMINATORIA) {
            setSelectedCategory(category);
            setShowGroupConfigModal(true);
        } else {
            setLoadingCategoryId(category.id);
            try {
                const updatedCategory = await startCategory(category.id);
                alert("Grupos e chave gerados com sucesso! A competição começou.");
                setSelectedCategory(updatedCategory);
                setView('view_category');
            } catch (error) {
                console.error(error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                alert(`Erro ao gerar chaves: ${errorMessage}`);
            } finally {
                setLoadingCategoryId(null);
            }
        }
    };

    const handleStartCategoryWithGroups = async (config: { playersPerGroup: number, numAdvancing: number }) => {
        if (!selectedCategory) return;
        setLoadingCategoryId(selectedCategory.id);
        setShowGroupConfigModal(false);
        try {
            const updatedCategory = await startCategory(selectedCategory.id, config);
            alert("Grupos e chave gerados com sucesso! A competição começou.");
            setSelectedCategory(updatedCategory);
            setView('view_category');
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Erro ao gerar chaves: ${errorMessage}`);
        } finally {
            setLoadingCategoryId(null);
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (window.confirm('Tem certeza que deseja remover esta categoria? Esta ação não pode ser desfeita.')) {
            try {
                await deleteTournamentCategory(categoryId);
                alert('Categoria removida com sucesso.');
                await fetchData();
                onDataUpdate();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                alert(`Erro ao remover categoria: ${errorMessage}`);
            }
        }
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

    if (view === 'edit_category' && selectedCategory) {
        return <CategoryForm
            eventId={currentEvent.id}
            categoryToEdit={selectedCategory}
            onFormClose={() => {
                setView('list');
                setSelectedCategory(null);
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
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => { setSelectedCategory(category); setShowManualAddModal(true);}}
                        className="bg-teal-600/50 hover:bg-teal-600/80 text-teal-200 font-bold py-1 px-3 rounded text-sm transition-colors"
                        title="Adicionar atleta manualmente"
                    >
                        + Atleta
                    </button>
                     <button
                        onClick={() => {
                            setSelectedCategory(category);
                            setView('view_category');
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
                    >
                        Administrar
                    </button>
                    <button
                        onClick={() => handleCloseRegistration(category.id)}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed min-w-[150px] flex justify-center items-center"
                        disabled={isLoading}
                    >
                        {isLoading ? <SpinnerIcon className="w-4 h-4"/> : 'Encerrar Inscrições'}
                    </button>
                </div>
            )
        }
        
        // Para todos os outros status (REGISTRATION_CLOSED, GROUP_STAGE, KNOCKOUT_PENDING, IN_PROGRESS, COMPLETED)
        // Sempre mostrar o botão "Administrar"
        return (
            <div className="flex flex-col sm:flex-row gap-2">
                {category.status === TournamentStatus.REGISTRATION_CLOSED && (
                    <button
                        onClick={() => handleReopenRegistration(category.id)}
                        className="bg-gray-500 hover:bg-gray-400 text-white font-bold py-1 px-3 rounded text-sm transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                        disabled={isLoading}
                    >
                        {isLoading ? <SpinnerIcon className="w-4 h-4"/> : 'Reabrir'}
                    </button>
                )}
                <button
                    onClick={() => {
                        setSelectedCategory(category);
                        setView('view_category');
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
                >
                    Administrar
                </button>
            </div>
        )
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            {showManualAddModal && selectedCategory && (
                <AddManualPlayerModal
                    category={selectedCategory} 
                    onClose={() => {
                        setShowManualAddModal(false);
                        setSelectedCategory(null);
                    }}
                    onPlayerAdded={fetchData}
                />
            )}
             {showGroupConfigModal && selectedCategory && (
                <GroupConfigModal 
                    category={selectedCategory}
                    onClose={() => {
                        setShowGroupConfigModal(false);
                        setSelectedCategory(null);
                    }}
                    onConfirm={handleStartCategoryWithGroups}
                />
             )}
             <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
                <ArrowLeftIcon className="w-5 h-5"/>
                Voltar para Eventos
            </button>
            <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-8">
                <div className="flex-grow">
                    <h2 className="text-3xl font-extrabold tracking-tight text-white break-words">{currentEvent.name}</h2>
                    <p className="text-lg text-slate-400">{currentEvent.location}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0 w-full sm:w-auto">
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
                        <div key={cat.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div 
                                className="cursor-pointer flex-grow w-full"
                                onClick={() => {
                                    setSelectedCategory(cat)
                                    setView('view_category');
                                }}
                            >
                                <p className="text-lg font-bold text-white hover:text-blue-400 break-words">{cat.name}</p>
                                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400 mt-1">
                                    <span>{formatLabels[cat.format]}</span>
                                    {cat.startTime && (
                                        <>
                                            <span className="text-slate-600 hidden sm:inline">|</span>
                                            <span>Início: {cat.startTime}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                                <div className="flex items-center justify-between gap-4">
                                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                                        {status.label}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <UsersIcon className="w-4 h-4" />
                                        <span>{cat.registrations.length} / {cat.maxParticipants}</span>
                                    </div>
                                </div>
                                <div className="h-px sm:h-6 sm:w-px bg-slate-700"></div>
                                <div className="flex items-center gap-2 justify-end">
                                    <ActionButton category={cat} />
                                    <button 
                                        onClick={() => {setSelectedCategory(cat); setView('edit_category');}}
                                        className="bg-gray-600/50 text-gray-200 hover:bg-gray-600/80 hover:text-white text-xs font-bold py-1 px-2 rounded transition-colors"
                                        title="Editar categoria"
                                    >
                                        Editar
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        className="bg-red-600/20 text-red-400 hover:bg-red-600/40 hover:text-red-300 text-xs font-bold py-1 px-2 rounded transition-colors"
                                        title="Remover categoria"
                                    >
                                        Remover
                                    </button>
                                </div>
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
