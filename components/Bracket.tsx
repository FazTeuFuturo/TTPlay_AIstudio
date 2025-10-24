import React from 'react';
import { Match, User, TournamentStatus } from '../types';
import { MatchCard } from './MatchCard';
import { PingPongPaddleIcon } from './Icons';

interface BracketProps {
  matches: Match[];
  players: User[];
  onScoreUpdate: (matchId: string, setScores: { p1: number, p2: number }[]) => void;
  tournamentStatus: TournamentStatus;
}

const getRoundName = (roundNumber: number, rounds: Record<number, Match[]>): string => {
    const roundKeys = Object.keys(rounds).map(Number).sort((a,b) => a-b);
    const mainBracketRoundKeys = roundKeys.filter(r => rounds[r].length > 0)
    
    if (roundKeys.length === 0) return `Rodada ${roundNumber}`;
    
    const firstMainRoundNumber = mainBracketRoundKeys[0] || roundKeys[0];
    
    const knockoutMatches = Object.values(rounds).flat().filter(m => m.stage === 'KNOCKOUT');
    const finalRound = Math.max(...knockoutMatches.map(m => m.round));
    const roundsFromEnd = finalRound - roundNumber + 1;
    
    if (roundNumber > finalRound) return '';

    if (roundsFromEnd === 1) return 'Final';
    if (roundsFromEnd === 2) return 'Semifinais';
    if (roundsFromEnd === 3) return 'Quartas de Final';
    if (roundsFromEnd === 4) return 'Oitavas de Final';
    
    // Check if it is a preliminary round
    const mainRoundPlayerCount = Math.pow(2, roundsFromEnd -1);
    const totalPlayersInRound = rounds[roundNumber].length * 2;
    
    if (totalPlayersInRound < mainRoundPlayerCount) {
        return `Rodada Preliminar`;
    }

    if (roundsFromEnd > 4) return `Rodada ${finalRound - roundsFromEnd + 1}`
    
    return `Rodada ${roundNumber}`;
};


export const Bracket: React.FC<BracketProps> = ({ matches, players, onScoreUpdate, tournamentStatus }) => {
  const rounds = matches.reduce((acc, match) => {
    acc[match.round] = acc[match.round] || [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const roundKeys = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const totalRounds = roundKeys.length;
  
  const finalWinnerId = totalRounds > 0
    ? rounds[roundKeys[totalRounds - 1]]?.[0]?.winnerId
    : undefined;
  const finalWinner = players.find(p => p.id === finalWinnerId);

  const isEditable = tournamentStatus === TournamentStatus.IN_PROGRESS;

  return (
    <div className="py-8">
      {finalWinner && (
         <div className="mb-12 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-yellow-500/20 via-slate-800/10 to-slate-800/10 border-2 border-yellow-500 rounded-lg shadow-2xl">
            <PingPongPaddleIcon className="w-16 h-16 text-yellow-400 mb-4" />
            <h2 className="text-xl text-slate-300">Vencedor do Torneio</h2>
            <p className="text-3xl font-bold text-white mt-2">{finalWinner.name}</p>
         </div>
      )}

      <div className="flex gap-12 overflow-x-auto pb-8 snap-x">
        {roundKeys.map((roundNumber) => {
          const roundMatches = rounds[roundNumber].sort((a,b) => a.matchInRound - b.matchInRound);
          return (
            <div key={roundNumber} className="flex flex-col justify-around gap-8 snap-center min-w-max">
              <h3 className="text-2xl font-bold text-center text-blue-400 mb-4">
                {getRoundName(roundNumber, rounds)}
              </h3>
              {roundMatches.map((match) => {
                return (
                    <div key={match.id}>
                      <MatchCard 
                        match={match} 
                        players={players} 
                        onScoreUpdate={onScoreUpdate}
                        isEditable={isEditable} 
                      />
                    </div>
                )
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};