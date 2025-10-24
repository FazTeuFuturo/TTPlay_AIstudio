
import React from 'react';
import { Group, Match, User, TournamentStatus } from '../types';
import { MatchCard } from './MatchCard';

interface GroupStageViewProps {
  groups: Group[];
  matches: Match[];
  players: User[];
  // FIX: Updated onScoreUpdate to accept set scores to match the MatchCard component's prop type.
  onScoreUpdate: (matchId: string, setScores: { p1: number, p2: number }[]) => void;
  tournamentStatus: TournamentStatus;
}

const GroupTable: React.FC<{ group: Group; matches: Match[]; players: User[] }> = ({ group, matches, players }) => {
    
  const playerStats = group.playerIds.map(playerId => {
    const playerMatches = matches.filter(m => m.groupId === group.id && (m.player1Id === playerId || m.player2Id === playerId) && m.status === 'COMPLETED');
    const wins = playerMatches.filter(m => m.winnerId === playerId).length;
    const losses = playerMatches.length - wins;
    // Simple points: 2 for a win, 1 for a loss
    const points = (wins * 2) + (losses * 1);
    const player = players.find(p => p.id === playerId);
    return {
      playerId,
      name: player?.name || 'Desconhecido',
      avatar: player?.avatar,
      points,
      wins,
      losses,
      played: playerMatches.length
    };
  }).sort((a, b) => b.points - a.points || (b.wins - a.wins));

  return (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800">
                <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">Jogador</th>
                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">Pts</th>
                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">J</th>
                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">V</th>
                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">D</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {playerStats.map(stat => (
                    <tr key={stat.playerId}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                            <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0">
                                    <img className="h-10 w-10 rounded-full" src={stat.avatar} alt="" />
                                </div>
                                <div className="ml-4">
                                    <div className="font-medium text-white">{stat.name}</div>
                                </div>
                            </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-300 text-center font-bold">{stat.points}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-300 text-center">{stat.played}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-green-400 text-center">{stat.wins}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-red-400 text-center">{stat.losses}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
};

export const GroupStageView: React.FC<GroupStageViewProps> = ({ groups, matches, players, onScoreUpdate, tournamentStatus }) => {
  const isEditable = tournamentStatus === TournamentStatus.GROUP_STAGE;

  return (
    <div className="space-y-12">
      {groups.map(group => {
        const groupMatches = matches.filter(m => m.groupId === group.id);
        return (
          <div key={group.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-blue-400 mb-4">{group.name}</h3>
            
            <div className="mb-6">
              <GroupTable group={group} matches={matches} players={players} />
            </div>

            <h4 className="text-lg font-semibold text-slate-200 mb-4">Partidas do Grupo</h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {groupMatches.map(match => (
                <MatchCard 
                  key={match.id}
                  match={match}
                  players={players}
                  onScoreUpdate={onScoreUpdate}
                  isEditable={isEditable}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
