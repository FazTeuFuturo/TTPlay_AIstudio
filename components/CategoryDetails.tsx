import React, { useState, useEffect } from 'react';
import { TournamentCategory, Match, User, Group, TournamentStatus, TournamentFormat } from '../types';
// FIX: Import `getCategoryById` to fetch the latest category data.
import { getMatches, getUsers, getGroups, updateMatchResultAndAdvance, drawGroupsAndGenerateMatches, getCategoryById, advanceFromGroupStage, finalizeGroupStage } from '../data-service';
import { Bracket } from './Bracket';
import { GroupStageView } from './GroupStageView';
import { GroupManager } from './GroupManager';
import { UsersIcon, PingPongPaddleIcon, ArrowLeftIcon, SpinnerIcon, SettingsIcon } from './Icons';

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
  console.log('[DEBUG-INIT] Valores das enums:', {
    TournamentFormat: {
      GRUPOS_E_ELIMINATORIA: TournamentFormat.GRUPOS_E_ELIMINATORIA,
      rawValue: 'GRUPOS_E_ELIMINATORIA'
    },
    TournamentStatus: {
      GROUP_STAGE: TournamentStatus.GROUP_STAGE,
      rawValue: 'GROUP_STAGE'
    }
  });

  // Estados principais
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [knockoutMatches, setKnockoutMatches] = useState<Match[]>([]);
  const [groupMatches, setGroupMatches] = useState<Match[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<TournamentCategory>(category);
  const [showGroupConfigModal, setShowGroupConfigModal] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [allGroupMatchesCompleted, setAllGroupMatchesCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'registrations' | 'groups' | 'bracket'>(
    'registrations'
  );

  const fetchData = async () => {
    console.log('[DEBUG-FETCH] ========== INICIANDO FETCHDATA ==========');
    setIsLoadingData(true);
    try {
      // Buscar categoria e dados básicos
      const cat = await getCategoryById(currentCategory.id) || currentCategory;
      console.log('[DEBUG-FETCH] Categoria carregada:', {
        id: cat.id,
        name: cat.name,
        format: cat.format,
        formatValue: cat.format,
        formatExpected: TournamentFormat.GRUPOS_E_ELIMINATORIA,
        isCorrectFormat: cat.format === TournamentFormat.GRUPOS_E_ELIMINATORIA,
        status: cat.status,
        statusValue: cat.status,
        numAdvancingFromGroup: cat.numAdvancingFromGroup
      });
      setCurrentCategory(cat);
      
      // Buscar todas as partidas
      const allMatches = await getMatches(cat.id);
      console.log('Categoria carregada:', {
        id: cat.id,
        nome: cat.name,
        formato: cat.format,
        formatoEsperado: TournamentFormat.GRUPOS_E_ELIMINATORIA,
        status: cat.status,
        partidasTotal: allMatches.length,
        isFormatsEqual: cat.format === TournamentFormat.GRUPOS_E_ELIMINATORIA,
        isFormatsTypeEqual: typeof cat.format === typeof TournamentFormat.GRUPOS_E_ELIMINATORIA,
      });
      
      setMatches(allMatches);
      
      // Separar partidas por tipo e verificar status
      const filteredGroupMatches = allMatches.filter(m => m.stage === 'GROUP');
      const filteredKnockoutMatches = allMatches.filter(m => m.stage === 'KNOCKOUT');
      
      setGroupMatches(filteredGroupMatches);
      setKnockoutMatches(filteredKnockoutMatches);
      
      // Adicionar verificação detalhada das partidas
      console.log('[DEBUG-MATCHES] Análise detalhada das partidas:', {
        todas: {
          total: allMatches.length,
          porStage: allMatches.map(m => ({ id: m.id, stage: m.stage, status: m.status }))
        },
        grupos: {
          total: filteredGroupMatches.length, // <-- CORREÇÃO AQUI
          matches: filteredGroupMatches.map(m => ({ id: m.id, status: m.status })), // <-- CORREÇÃO AQUI
          completas: filteredGroupMatches.filter(m => m.status === 'COMPLETED').length // <-- CORREÇÃO AQUI
        },
        knockout: {
          total: filteredKnockoutMatches.length, // <-- CORREÇÃO AQUI
          matches: filteredKnockoutMatches.map(m => ({ id: m.id, status: m.status })) // <-- CORREÇÃO AQUI
        }
      });
      
      console.log('[DEBUG] ========== CATEGORIA ==========');
      console.log('Detalhes da Categoria:', {
        id: cat.id,
        nome: cat.name,
        formato: cat.format,
        status: cat.status,
      });
      
      console.log('Estado das Partidas:', {
        total: {
          todas: allMatches.length,
          grupos: filteredGroupMatches.length, // <-- CORREÇÃO AQUI
          knockout: filteredKnockoutMatches.length // <-- CORREÇÃO AQUI
        },
        grupos: {
          total: filteredGroupMatches.length, // <-- CORREÇÃO AQUI
          completas: filteredGroupMatches.filter(m => m.status === 'COMPLETED').length, // <-- CORREÇÃO AQUI
          todasCompletas: filteredGroupMatches.length > 0 && filteredGroupMatches.every(m => m.status === 'COMPLETED') // <-- CORREÇÃO AQUI
        },
        deveExibirBotao: cat.format === TournamentFormat.GRUPOS_E_ELIMINATORIA && 
                         filteredGroupMatches.length > 0 && // <-- CORREÇÃO AQUI
                         filteredGroupMatches.every(m => m.status === 'COMPLETED') && // <-- CORREÇÃO AQUI
                         filteredKnockoutMatches.length === 0 // <-- CORREÇÃO AQUI
      });
      console.log('==========================================');
      
      console.log('Análise das partidas:', {
        total: allMatches.length,
        grupos: {
          total: filteredGroupMatches.length, // <-- CORREÇÃO AQUI
          completas: filteredGroupMatches.filter(m => m.status === 'COMPLETED').length, // <-- CORREÇÃO AQUI
          status: filteredGroupMatches.map(m => m.status) // <-- CORREÇÃO AQUI
        },
        knockout: {
          total: filteredKnockoutMatches.length // <-- CORREÇÃO AQUI
        }
      });

      // --- INÍCIO DA CORREÇÃO 1 ---
      // Use as variáveis LOCAIS (filtered...) que você acabou de criar,
      // pois o estado (groupMatches, knockoutMatches) ainda não foi atualizado.
      
      const hasGroupMatches = filteredGroupMatches.length > 0;
      const allCompleted = hasGroupMatches && filteredGroupMatches.every(m => m.status === 'COMPLETED');
      const hasKnockout = filteredKnockoutMatches.length > 0;
      
      console.log('[DEBUG-STATE] ========== ANÁLISE DO ESTADO ==========');
      console.log('[DEBUG-STATE] Partidas dos Grupos:', {
        total: filteredGroupMatches.length,
        completas: filteredGroupMatches.filter(m => m.status === 'COMPLETED').length,
        pendentes: filteredGroupMatches.filter(m => m.status !== 'COMPLETED').length,
        statusDeCadaPartida: filteredGroupMatches.map(m => ({
          id: m.id,
          status: m.status,
          player1Id: m.player1Id,
          player2Id: m.player2Id
        }))
      });
      
      console.log('[DEBUG-STATE] Condições:', {
        hasGroupMatches,
        allCompleted,
        hasKnockout,
        format: cat.format,
        status: cat.status,
        isFormatCorrect: cat.format === TournamentFormat.GRUPOS_E_ELIMINATORIA
      });
      
      // Verificar se todas as partidas dos grupos estão completas
      const shouldShowButton = cat.format === TournamentFormat.GRUPOS_E_ELIMINATORIA && allCompleted && !hasKnockout;
      console.log('[DEBUG-STATE] ========== RESULTADO FINAL ==========');
      console.log('[DEBUG-STATE] Deve mostrar botão "Finalizar Fase de Grupos"?', shouldShowButton);
      console.log('[DEBUG-STATE] allGroupMatchesCompleted será definido como:', shouldShowButton);
      setAllGroupMatchesCompleted(shouldShowButton);
      
      // --- FIM DA CORREÇÃO 1 ---
      
      // Buscar outros dados necessários
      setUsers(await getUsers());
      if (cat.format === TournamentFormat.GRUPOS_E_ELIMINATORIA || cat.status === TournamentStatus.GROUP_STAGE) {
        setGroups(await getGroups(cat.id));
      }

      // --- INÍCIO DA CORREÇÃO 2 ---
      // Definir aba ativa com base no estado ATUAL (usando as variáveis locais)
      if (hasKnockout) {
        setActiveTab('bracket');
      } else if (hasGroupMatches) {
        setActiveTab('groups');
      } else {
        setActiveTab('registrations');
      }
      // --- FIM DA CORREÇÃO 2 ---

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    console.log('[DEBUG-LIFECYCLE] CategoryDetails montado:', {
      category: {
        id: category.id,
        format: category.format,
        status: category.status
      }
    });
    fetchData();

    // DEBUG: Monitorar mudanças de estado
    const interval = setInterval(() => {
      console.log('[DEBUG-STATE] Estado atual:', {
        activeTab,
        format: currentCategory.format,
        status: currentCategory.status,
        matches: {
          group: groupMatches.length,
          completed: groupMatches.filter(m => m.status === 'COMPLETED').length,
          knockout: knockoutMatches.length
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [category.id]);

  const handleScoreUpdate = async (matchId: string, setScores: { p1: number, p2: number }[]) => {
    console.log('Atualizando placar da partida:', matchId, setScores);
    try {
      const updatedCategory = await updateMatchResultAndAdvance(currentCategory.id, matchId, setScores);
      console.log('Categoria atualizada:', updatedCategory);
      if (updatedCategory) {
        await fetchData(); // Refetch all data to ensure consistency
        onDataUpdate(); // Notify parent to refresh all data if needed
        console.log('Dados recarregados com sucesso');
      }
    } catch (error) {
      console.error('Erro ao atualizar placar:', error);
      alert('Erro ao salvar placar: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleConfirmDrawGroups = async (config: { playersPerGroup: number, numAdvancing: number }) => {
    setIsProcessing(true);
    try {
        const updatedCategory = await drawGroupsAndGenerateMatches(currentCategory.id, config);
        alert("Grupos sorteados e partidas geradas com sucesso!");
        await fetchData(); // Refetch all data
        onDataUpdate();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Erro ao gerar grupos: ${errorMessage}`);
    } finally {
        setShowGroupConfigModal(false);
        setIsProcessing(false);
    }
  };

  const handleGenerateKnockoutStage = async () => {
    setIsProcessing(true);
    try {
        const updatedCategory = await advanceFromGroupStage(currentCategory.id);
        alert("Chaves da fase eliminatória geradas com sucesso!");
        await fetchData(); // Refetch all data
        onDataUpdate();
        setActiveTab('bracket'); // Muda para a aba de chaves
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Erro ao gerar chaves: ${errorMessage}`);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleFinalizeGroupStage = async () => {
    setIsProcessing(true);
    try {
        await finalizeGroupStage(currentCategory.id);
        alert("Fase de grupos finalizada com sucesso!");
        await fetchData();
        onDataUpdate();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Erro ao finalizar fase de grupos: ${errorMessage}`);
    } finally {
        setIsProcessing(false);
    }
  };

  const registeredUsers = users.filter(user => currentCategory.registrations.some(reg => reg.userId === user.id))
      .sort((a, b) => b.currentRating - a.currentRating);


  const renderContent = () => {
    if (showGroupManager) {
      return (
        <GroupManager
          category={currentCategory}
          groups={groups}
          onBack={() => setShowGroupManager(false)}
          onDataUpdate={async () => {
            await fetchData();
            onDataUpdate();
          }}
        />
      );
    }

    const renderRegistrations = () => (
      <div className="bg-slate-800/30 rounded-lg p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-300">Atletas Inscritos</h2>
            <p className="text-slate-500 mt-1">{currentCategory.registrations.length} atletas na categoria.</p>
          </div>
          {currentCategory.status === TournamentStatus.REGISTRATION_CLOSED && (
            <button
              onClick={() => setShowGroupConfigModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded transition-colors disabled:bg-slate-600 flex items-center justify-center min-w-[280px]"
              disabled={isProcessing || currentCategory.registrations.length < 2}
            >
              {isProcessing ? <SpinnerIcon className="w-5 h-5" /> : 'Sortear Grupos e Gerar Partidas'}
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
              {isLoadingData ? (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400"><SpinnerIcon className="w-6 h-6 mx-auto" /></td></tr>
              ) : registeredUsers.map((user, index) => (
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
    );

    const renderGroups = () => {
      if (isLoadingData) return <SpinnerIcon className="w-8 h-8 mx-auto text-blue-500" />;
      if (groups.length === 0) {
        return (
          <div className="text-center py-16 bg-slate-800/30 rounded-lg">
            <h2 className="text-2xl font-bold text-slate-300">Grupos não gerados</h2>
            <p className="text-slate-500 mt-2">Vá para a aba "Inscritos" para iniciar a competição.</p>
          </div>
        );
      }

      const showFinalizeButton = allGroupMatchesCompleted && currentCategory.status === TournamentStatus.GROUP_STAGE;
      const showGenerateKnockoutButton = currentCategory.status === TournamentStatus.KNOCKOUT_PENDING;
      
      console.log('[DEBUG-RENDER-GROUPS] ========== RENDERIZANDO BOTÕES ==========');
      console.log('[DEBUG-RENDER-GROUPS] Estado atual:', {
        allGroupMatchesCompleted,
        currentCategoryStatus: currentCategory.status,
        statusEsperadoParaFinalizar: TournamentStatus.GROUP_STAGE,
        statusEsperadoParaGerar: TournamentStatus.KNOCKOUT_PENDING,
        showFinalizeButton,
        showGenerateKnockoutButton
      });

      return (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-300">Fase de Grupos</h2>
            <div className="flex gap-3">
              {showFinalizeButton && (
                  <button
                      onClick={handleFinalizeGroupStage}
                      disabled={isProcessing}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-4 rounded text-sm transition-colors flex items-center gap-2"
                  >
                      {isProcessing ? <><SpinnerIcon className="w-4 h-4" />Finalizando...</> : 'Finalizar Fase de Grupos'}
                  </button>
              )}
              {showGenerateKnockoutButton && (
                <button
                  onClick={handleGenerateKnockoutStage}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded text-sm transition-colors flex items-center gap-2"
                >
                  {isProcessing ? <><SpinnerIcon className="w-4 h-4" />Gerando...</> : 'Gerar Chaves da Eliminatória'}
                </button>
              )}
              {currentCategory.status === TournamentStatus.GROUP_STAGE && (
                <button
                  onClick={() => setShowGroupManager(true)}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded text-sm transition-colors flex items-center gap-2"
                >
                  <SettingsIcon className="w-4 h-4" />
                  Gerenciar Grupos
                </button>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <GroupStageView
              groups={groups}
              matches={groupMatches}
              players={users}
              onScoreUpdate={handleScoreUpdate}
              tournamentStatus={currentCategory.status}
            />
          </div>
        </div>
      );
    };

    const renderBracket = () => {
      if (isLoadingData) return <SpinnerIcon className="w-8 h-8 mx-auto text-blue-500" />;
      if (knockoutMatches.length > 0) {
        return <Bracket matches={knockoutMatches} players={users} onScoreUpdate={handleScoreUpdate} tournamentStatus={currentCategory.status} />;
      }

      const canGenerateKnockout = currentCategory.status === TournamentStatus.KNOCKOUT_PENDING;

      return (
        <div className="text-center py-16 bg-slate-800/30 rounded-lg">
          <h2 className="text-2xl font-bold text-slate-300">
            {canGenerateKnockout ? "Pronto para Gerar Chaveamento" : "Chaveamento Indisponível"}
          </h2>
          <p className="text-slate-500 mt-2">
            {canGenerateKnockout ? (
              <button
                onClick={handleGenerateKnockoutStage}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded text-base transition-colors flex items-center gap-2 mx-auto mt-4"
              >
                {isProcessing ? <><SpinnerIcon className="w-4 h-4" />Gerando Chaveamento...</> : 'Gerar Chaveamento da Eliminatória'}
              </button>
            ) : (
              "A fase eliminatória ainda não começou. Finalize a fase de grupos para habilitar esta etapa."
            )}
          </p>
        </div>
      );
    };

    return (
      <>
        <div className="mb-6 border-b border-slate-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('registrations')}
              className={`${activeTab === 'registrations' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Inscritos
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              disabled={currentCategory.status === TournamentStatus.REGISTRATION}
              className={`${activeTab === 'groups' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors disabled:cursor-not-allowed disabled:text-slate-600`}
            >
              Fase de Grupos
            </button>
            <button
              onClick={() => setActiveTab('bracket')}
              disabled={currentCategory.status === TournamentStatus.REGISTRATION}
              className={`${activeTab === 'bracket' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors disabled:cursor-not-allowed disabled:text-slate-600`}
            >
              Fase Eliminatória
            </button>
          </nav>
        </div>

        {activeTab === 'registrations' && renderRegistrations()}
        {activeTab === 'groups' && renderGroups()}
        {activeTab === 'bracket' && renderBracket()}
      </>
    );
  };

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
