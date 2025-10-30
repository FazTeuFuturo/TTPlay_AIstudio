import React, { useState, useMemo } from 'react';
import { Match, User } from '../types';
import { PencilIcon } from './Icons';

interface MatchCardProps {
  match: Match;
  players: User[];
  onScoreUpdate: (matchId: string, setScores: { p1: number, p2: number }[]) => void;
  isEditable: boolean;
}

const PlayerDisplay: React.FC<{ playerId: string | null; players: User[]; score: number | null; isWinner: boolean }> = ({ playerId, players, score, isWinner }) => {
  const player = useMemo(() => players.find(p => p.id === playerId), [playerId, players]);
  
  return (
    <div className={`flex items-center justify-between p-2 rounded ${isWinner ? 'bg-green-500/20' : 'bg-slate-700/50'}`}>
      <div className="flex items-center gap-2">
        <img src={player?.avatar || 'https://picsum.photos/seed/placeholder/100/100'} alt={player?.name || 'TBD'} className="w-6 h-6 rounded-full" />
        <span className={`text-sm ${player ? (isWinner ? 'text-green-300 font-bold' : 'text-slate-200') : 'text-slate-500 italic'}`}>
          {player?.name || 'A definir'}
        </span>
      </div>
      <span className={`font-mono text-lg ${isWinner ? 'text-green-300 font-bold' : 'text-slate-200'}`}>{score}</span>
    </div>
  );
};

const SetInput: React.FC<{ setIndex: number; scores: {p1: number, p2: number}; onChange: (p1: string, p2: string) => void }> = ({ setIndex, scores, onChange }) => (
    <div className="flex items-center gap-2">
        <label className="text-xs text-slate-400 w-10">Set {setIndex + 1}</label>
        <input 
            type="number" 
            value={scores.p1 === -1 ? '' : scores.p1}
            onChange={(e) => onChange(e.target.value, scores.p2 === -1 ? '' : String(scores.p2))}
            className="w-12 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-center text-sm"
            placeholder="P1"
        />
        <input 
            type="number" 
            value={scores.p2 === -1 ? '' : scores.p2}
            onChange={(e) => onChange(scores.p1 === -1 ? '' : String(scores.p1), e.target.value)}
            className="w-12 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-center text-sm"
            placeholder="P2"
        />
    </div>
);


export const MatchCard: React.FC<MatchCardProps> = ({ match, players, onScoreUpdate, isEditable }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [setScores, setSetScores] = useState<{p1: number, p2: number}[]>(
    match.setScores || Array(5).fill({p1: -1, p2: -1})
  );

  const handleSetScoreChange = (index: number, p1: string, p2: string) => {
    const newScores = [...setScores];
    newScores[index] = { p1: p1 ? parseInt(p1) : -1, p2: p2 ? parseInt(p2) : -1 };
    setSetScores(newScores);
  }

  const handleUpdate = () => {
    // Filter out empty sets
    const finalScores = setScores.filter(s => s.p1 !== -1 && s.p2 !== -1);
    if (finalScores.length === 0) return;

    // Basic validation
    let p1SetsWon = 0;
    let p2SetsWon = 0;
    for(const score of finalScores) {
        if (score.p1 > score.p2) p1SetsWon++;
        else p2SetsWon++;
    }
    if (p1SetsWon === p2SetsWon) {
        alert("O placar final de sets não pode ser um empate.");
        return;
    }

    onScoreUpdate(match.id, finalScores);
    setIsEditing(false);
  };
  
  const isCompleted = match.status === 'COMPLETED';

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 w-full sm:w-64 flex flex-col gap-2 shadow-lg">
      <PlayerDisplay playerId={match.player1Id} players={players} score={match.player1Score} isWinner={match.winnerId === match.player1Id} />
      <div className="text-center text-xs text-slate-500 font-mono">VS</div>
      <PlayerDisplay playerId={match.player2Id} players={players} score={match.player2Score} isWinner={match.winnerId === match.player2Id} />
      
      <div className="flex items-center justify-center gap-2 mt-1">
        {isCompleted && match.setScores && (
          <div className="text-center text-xs text-slate-400 font-mono">
              {match.setScores.map(s => `${s.p1}-${s.p2}`).join(' / ')}
          </div>
        )}
        {isEditable && isCompleted && !isEditing && (
            <button onClick={() => {
                setIsEditing(true);
                setSetScores(Array(5).fill({p1: -1, p2: -1}));
            }} className="text-blue-400 hover:text-blue-300">
                <PencilIcon className="w-3 h-3" />
            </button>
        )}
      </div>

      {isEditable && !isCompleted && match.player1Id && match.player2Id && !isEditing && (
        <button 
            onClick={() => setIsEditing(true)}
            className="mt-2 w-full bg-blue-600/50 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
        >
            Registrar Placar
        </button>
      )}
      
      {isEditing && (
        <div className="mt-2 pt-2 border-t border-slate-700 flex flex-col gap-2">
            {Array(5).fill(0).map((_, index) => (
                <SetInput key={index} setIndex={index} scores={setScores[index]} onChange={(p1, p2) => handleSetScoreChange(index, p1, p2)} />
            ))}
            <div className="flex gap-2 mt-2">
                 <button 
                    onClick={() => setIsEditing(false)}
                    className="w-1/2 bg-slate-600 hover:bg-slate-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleUpdate}
                    className="w-1/2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-sm transition-colors"
                >
                    Salvar
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
