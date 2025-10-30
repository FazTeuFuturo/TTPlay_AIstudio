import React, { useState, useEffect } from 'react';
import { Group, User, TournamentCategory } from '../types';
import { 
  getGroupPlayers, 
  getAvailablePlayers, 
  addPlayerToGroup, 
  removePlayerFromGroup, 
  movePlayerBetweenGroups 
} from '../data-service';
import { UsersIcon, ArrowLeftIcon, PlusIcon, MinusIcon, ArrowRightIcon } from './Icons';

interface GroupManagerProps {
  category: TournamentCategory;
  groups: Group[];
  onBack: () => void;
  onDataUpdate: () => void;
}

export const GroupManager: React.FC<GroupManagerProps> = ({ category, groups, onBack, onDataUpdate }) => {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupPlayers, setGroupPlayers] = useState<User[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);
  const [targetGroup, setTargetGroup] = useState<Group | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedGroup, category.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (selectedGroup) {
        const [players, available] = await Promise.all([
          getGroupPlayers(category.id, selectedGroup.id),
          getAvailablePlayers(category.id)
        ]);
        setGroupPlayers(players);
        setAvailablePlayers(available);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados dos grupos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPlayer = async (playerId: string) => {
    if (!selectedGroup) return;
    
    setIsLoading(true);
    try {
      await addPlayerToGroup(category.id, playerId, selectedGroup.id);
      await loadData();
      onDataUpdate();
      alert('Jogador adicionado com sucesso!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Erro ao adicionar jogador: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!selectedGroup) return;
    
    if (!window.confirm('Tem certeza que deseja remover este jogador do grupo?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await removePlayerFromGroup(category.id, playerId, selectedGroup.id);
      await loadData();
      onDataUpdate();
      alert('Jogador removido com sucesso!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Erro ao remover jogador: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMovePlayer = async (player: User, targetGroup: Group) => {
    if (!selectedGroup) return;
    
    setIsLoading(true);
    try {
      await movePlayerBetweenGroups(category.id, player.id, selectedGroup.id, targetGroup.id);
      await loadData();
      onDataUpdate();
      alert('Jogador movido com sucesso!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Erro ao mover jogador: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setShowMoveModal(false);
    }
  };

  if (showMoveModal && selectedPlayer && targetGroup) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md animate-fade-in-up border border-slate-700 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-4">Mover Jogador</h3>
          <p className="text-sm text-slate-400 mb-6">
            Tem certeza que deseja mover {selectedPlayer.name} de {selectedGroup?.name} para {targetGroup.name}?
          </p>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowMoveModal(false)}
              className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleMovePlayer(selectedPlayer, targetGroup)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Movendo...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
        <ArrowLeftIcon className="w-5 h-5"/>
        Voltar
      </button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
        <h1 className="text-4xl font-extrabold text-white mb-2">Gerenciar Grupos</h1>
        <p className="text-slate-400">{category.name}</p>
      </div>

      {!selectedGroup ? (
        // Lista de grupos
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-300">Selecione um Grupo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 cursor-pointer hover:bg-slate-800/70 hover:border-slate-600 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-blue-400">{group.name}</h3>
                  <UsersIcon className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-300 mb-2">{group.playerIds.length} jogadores</p>
                <div className="text-sm text-slate-500">
                  Clique para gerenciar
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Gerenciamento do grupo selecionado
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-blue-400">{selectedGroup.name}</h2>
            <button
              onClick={() => setSelectedGroup(null)}
              className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Voltar aos Grupos
            </button>
          </div>

          {/* Jogadores do Grupo */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-slate-300 mb-4">Jogadores no Grupo</h3>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : groupPlayers.length === 0 ? (
              <p className="text-slate-400 text-center py-4">Nenhum jogador neste grupo</p>
            ) : (
              <div className="space-y-3">
                {groupPlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-medium text-white">{player.name}</p>
                        <p className="text-sm text-slate-400">Rating: {player.currentRating}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedPlayer(player);
                          setTargetGroup(groups.find(g => g.id !== selectedGroup?.id) || null);
                          setShowMoveModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded transition-colors"
                        title="Mover para outro grupo"
                      >
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemovePlayer(player.id)}
                        className="bg-red-600 hover:bg-red-500 text-white p-2 rounded transition-colors"
                        title="Remover do grupo"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Jogadores Disponíveis */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-xl font-bold text-slate-300 mb-4">Jogadores Disponíveis</h3>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : availablePlayers.length === 0 ? (
              <p className="text-slate-400 text-center py-4">Nenhum jogador disponível</p>
            ) : (
              <div className="space-y-3">
                {availablePlayers.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-medium text-white">{player.name}</p>
                        <p className="text-sm text-slate-400">Rating: {player.currentRating}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddPlayer(player.id)}
                      className="bg-green-600 hover:bg-green-500 text-white p-2 rounded transition-colors"
                      title="Adicionar ao grupo"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ações Rápidas */}
          <div className="flex gap-4">
            <button
              onClick={loadData}
              className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Carregando...' : 'Recarregar Dados'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
