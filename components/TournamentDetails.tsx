import React, { useState, useEffect } from 'react';
import { TournamentCategory, Match, User, Group, TournamentStatus, TournamentFormat } from '../types';
import { getMatches, getUsers, getGroups, updateMatchResultAndAdvance, drawGroupsAndGenerateMatches, getCategoryById } from '../data-service';
import { Bracket } from './Bracket';
import { GroupStageView } from './GroupStageView';
import { UsersIcon, PingPongPaddleIcon, ArrowLeftIcon, SpinnerIcon } from './Icons';

interface CategoryDetailsProps {
  category: TournamentCategory;
  onBack: () => void;
  onDataUpdate: () => void;
}

const formatLabels: Record<TournamentFormat, string> = {
    [TournamentFormat.ELIMINATORIA_SIMPLES]: 'Eliminatória Simples',
    [TournamentFormat.ELIMINATORIA_DUPLA]: 'Eliminatória Dupla',
    [TournamentFormat.TODOS_CONTRA_TODOS]: 'Todos contra Todos',
    [TournamentFormat.GRUPOS_E_ELIMINATORIA]: 'Fase de Grupos e Eliminatória',
};

const GroupConfigModal: React.FC<{ category: TournamentCategory, onClose: () => void, onConfirm: (config: { playersPerGroup: number, numAdvancing: number }) => Promise<void> }> = ({ category, onClose, onConfirm }) => {
    const [playersPerGroup, setPlayersPerGroup] = useState(category.playersPerGroup || 4);
    const [numAdvancing, setNumAdvancing] = useState(category.numAdvancingFromGroup || 2);
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
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md animate-fade-in-up border border-slate-700 shadow-xl">
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


export const CategoryDetails: React.FC<CategoryDetailsProps> = ({ category, onBack, onDataUpdate }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<TournamentCategory>(category);
  const [showGroupConfigModal, setShowGroupConfigModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'registrations' | 'groups' | 'bracket'>(
    'registrations'
  );

  const fetchData = async (catId: string) => {
    setIsLoadingData(true);
    const freshCategory = await getCategoryById(catId);
    if (freshCategory) {
      setCurrentCategory(freshCategory);
      setMatches(await getMatches(freshCategory.id));
      setUsers(await getUsers());
      if (freshCategory.format === TournamentFormat.GRUPOS_E_ELIMINATORIA || freshCategory.status === TournamentStatus.GROUP_STAGE) {
        setGroups(await getGroups(freshCategory.id));
      }
      if (freshCategory.status === TournamentStatus.GROUP_STAGE) {
        setActiveTab('groups');
      } else if (freshCategory.status === TournamentStatus.IN_PROGRESS || freshCategory.status === TournamentStatus.COMPLETED) {
        setActiveTab('bracket');
      } else {
        setActiveTab('registrations');
      }
    }
    setIsLoadingData(false);
  };

  useEffect(() => {
    fetchData(category.id);
  }, [category.id]);

  const handleScoreUpdate = async (matchId: string, setScores: { p1: number, p2: number }[]) => {
    const updatedCategory = await updateMatchResultAndAdvance(currentCategory.id, matchId, setScores);
    if (updatedCategory) {
        await fetchData(currentCategory.id);
        onDataUpdate();
    }
  };

  const handleConfirmDrawGroups = async (config: { playersPerGroup: number, numAdvancing: number }) => {
    setIsProcessing(true);
    setShowGroupConfigModal(false);
    try {
        const updatedCategory = await drawGroupsAndGenerateMatches(currentCategory.id, config);
        alert("Grupos sorteados e partidas geradas com sucesso!");
        await fetchData(updatedCategory.id);
        onDataUpdate();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Erro ao gerar grupos: ${errorMessage}`);
    } finally {
        setIsProcessing(false);
    }
  };

  const knockoutMatches = matches.filter(m => m.stage === 'KNOCKOUT');
  const groupMatches = matches.filter(m => m.stage === 'GROUP');
  const registeredUsers = users.filter(user => currentCategory.registrations.some(reg => reg.userId === user.id))
      .sort((a, b) => b.currentRating - a.currentRating);


  const renderContent = () => {
    const isStarted = currentCategory.status !== TournamentStatus.REGISTRATION && currentCategory.status !== TournamentStatus.REGISTRATION_CLOSED;

    if (isLoadingData) {
        return (
            <div className="flex justify-center items-center py-16">
                <SpinnerIcon className="w-8 h-8 text-blue-500" />
            </div>
        );
    }

    if (currentCategory.status === TournamentStatus.REGISTRATION) {
       return (
        <div className="text-center py-16 bg-slate-800/30 rounded-lg">
            <h2 className="text-2xl font-bold text-slate-300">Aguardando Encerramento das Inscrições</h2>
            <p className="text-slate-500 mt-2">A área de administração da categoria ficará disponível assim que as inscrições forem encerradas.</p>
        </div>
       )
    }
    
    return (
      <>
        <div className="mb-6 border-b border-slate-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('registrations')}
              className={`${
                activeTab === 'registrations'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Inscritos
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              disabled={!isStarted}
              className={`${
                activeTab === 'groups'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors disabled:cursor-not-allowed disabled:text-slate-600`}
            >
              Fase de Grupos
            </button>
            <button
              onClick={() => setActiveTab('bracket')}
               disabled={!isStarted}
              className={`${
                activeTab === 'bracket'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors disabled:cursor-not-allowed disabled:text-slate-600`}
            >
              Fase Eliminatória
            </button>
          </nav>
        </div>
        
        {activeTab === 'registrations' && (
             <div className="bg-slate-800/30 rounded-lg p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-300">Inscrições Encerradas</h2>
                        <p className="text-slate-500 mt-1">{currentCategory.registrations.length} atletas inscritos. Pronto para começar?</p>
                    </div>
                    {currentCategory.status === TournamentStatus.REGISTRATION_CLOSED && (
                      <button
                          onClick={() => setShowGroupConfigModal(true)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded transition-colors disabled:bg-slate-600 flex items-center justify-center min-w-[280px]"
                          disabled={isProcessing || currentCategory.registrations.length < 2}
                      >
                          {isProcessing ? <SpinnerIcon className="w-5 h-5"/> : 'Sortear Grupos e Gerar Partidas'}
                      </button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-800">
                            <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">#</th>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white">Atleta</th>
                                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">Rating</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                            {registeredUsers.map((user, index) => (
                                <tr key={user.id}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6 text-slate-400">{index + 1}</td>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0">
                                                <img className="h-10 w-10 rounded-full object-cover" src={user.avatar} alt={user.name} />
                                            </div>
                                            <div className="ml-4">
                                                <div className="font-medium text-white">{user.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-300 text-center font-bold">{user.currentRating}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'groups' && (
            groups.length > 0 ? (
                <GroupStageView 
                    groups={groups} 
                    matches={groupMatches} 
                    players={users} 
                    onScoreUpdate={handleScoreUpdate}
                    tournamentStatus={currentCategory.status}
                />
            ) : (
                 <div className="text-center py-16 bg-slate-800/30 rounded-lg">
                    <h2 className="text-2xl font-bold text-slate-300">Grupos não gerados</h2>
                    <p className="text-slate-500 mt-2">Vá para a aba "Inscritos" para iniciar a competição.</p>
                </div>
            )
        )}

        {activeTab === 'bracket' && (
          knockoutMatches.length > 0 ? (
            <Bracket matches={knockoutMatches} players={users} onScoreUpdate={handleScoreUpdate} tournamentStatus={currentCategory.status} />
          ) : (
            <div className="text-center py-16 bg-slate-800/30 rounded-lg">
                <h2 className="text-2xl font-bold text-slate-300">Chaveamento Indisponível</h2>
                <p className="text-slate-500 mt-2">A fase eliminatória ainda não começou ou não há dados para esta categoria.</p>
            </div>
          )
        )}
      </>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {showGroupConfigModal && (
        <GroupConfigModal 
            category={currentCategory}
            onClose={() => setShowGroupConfigModal(false)}
            onConfirm={handleConfirmDrawGroups}
        />
      )}
      <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
        <ArrowLeftIcon className="w-5 h-5"/>
        Voltar
      </button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
        <h1 className="text-4xl font-extrabold text-white mb-2">{currentCategory.name}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-slate-300 mt-4">
            <div className="flex items-center gap-3"><UsersIcon className="w-6 h-6 text-blue-500"/><span>{currentCategory.registrations.length} / {currentCategory.maxParticipants} Inscritos</span></div>
            <div className="flex items-center gap-3"><PingPongPaddleIcon className="w-6 h-6 text-blue-500"/><span>{formatLabels[currentCategory.format]}</span></div>
        </div>
      </div>
      
      {renderContent()}
    </div>
  );
};