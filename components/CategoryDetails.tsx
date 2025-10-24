import React, { useState, useEffect } from 'react';
import { TournamentCategory, Match, User, Group, TournamentStatus, TournamentFormat } from '../types';
import { getMatches, getUsers, getGroups, updateMatchResultAndAdvance } from '../data-service';
import { Bracket } from './Bracket';
import { GroupStageView } from './GroupStageView';
import { UsersIcon, PingPongPaddleIcon, ArrowLeftIcon } from './Icons';

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

export const CategoryDetails: React.FC<CategoryDetailsProps> = ({ category, onBack, onDataUpdate }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentCategory, setCurrentCategory] = useState<TournamentCategory>(category);
  const [activeTab, setActiveTab] = useState<'groups' | 'bracket'>(
    category.status === TournamentStatus.GROUP_STAGE ? 'groups' : 'bracket'
  );

  // FIX: Made function async and awaited data fetching calls to pass data, not promises, to state setters.
  const fetchData = async () => {
    setMatches(await getMatches(currentCategory.id));
    setUsers(await getUsers());
    if (currentCategory.format === TournamentFormat.GRUPOS_E_ELIMINATORIA) {
      setGroups(await getGroups(currentCategory.id));
    }
  };

  useEffect(() => {
    fetchData();
     // Set initial/updated tab based on status
     if (currentCategory.status === TournamentStatus.GROUP_STAGE) {
      setActiveTab('groups');
    } else if (currentCategory.status === TournamentStatus.IN_PROGRESS || currentCategory.status === TournamentStatus.COMPLETED) {
      setActiveTab('bracket');
    }
  }, [currentCategory]);

  // FIX: Made function async and awaited the result of updateMatchResultAndAdvance.
  const handleScoreUpdate = async (matchId: string, setScores: { p1: number, p2: number }[]) => {
    const updatedCategory = await updateMatchResultAndAdvance(currentCategory.id, matchId, setScores);
    if (updatedCategory) {
        setCurrentCategory(updatedCategory);
        onDataUpdate(); // Notify parent to refresh all data if needed
    }
  };

  const knockoutMatches = matches.filter(m => m.stage === 'KNOCKOUT');
  const groupMatches = matches.filter(m => m.stage === 'GROUP');

  const renderContent = () => {
    if (currentCategory.status === TournamentStatus.REGISTRATION || currentCategory.status === TournamentStatus.REGISTRATION_CLOSED) {
       return (
        <div className="text-center py-16 bg-slate-800/30 rounded-lg">
            <h2 className="text-2xl font-bold text-slate-300">Aguardando Início da Categoria</h2>
            <p className="text-slate-500 mt-2">Os grupos e o chaveamento serão gerados assim que o administrador iniciar a competição.</p>
        </div>
       )
    }

    const showTabs = currentCategory.format === TournamentFormat.GRUPOS_E_ELIMINATORIA && groups.length > 0;
    
    return (
      <>
        {showTabs && (
          <div className="mb-6 border-b border-slate-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('groups')}
                className={`${
                  activeTab === 'groups'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Fase de Grupos
              </button>
              <button
                onClick={() => setActiveTab('bracket')}
                className={`${
                  activeTab === 'bracket'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Fase Eliminatória
              </button>
            </nav>
          </div>
        )}
        
        {(activeTab === 'groups' && showTabs) ? (
          <GroupStageView 
            groups={groups} 
            matches={groupMatches} 
            players={users} 
            onScoreUpdate={handleScoreUpdate}
            tournamentStatus={currentCategory.status}
          />
        ) : (
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