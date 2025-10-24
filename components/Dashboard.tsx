import React, { useState, useEffect } from 'react';
import { User, PlayerStats, ClubStats, RecentMatch, Role } from '../types';
import { getPlayerStats, getClubStats, getRecentPlayerMatches, getRatingHistory } from '../data-service';
import RatingChart from './RatingChart';
import { PingPongPaddleIcon } from './Icons';

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
);

const PlayerDashboardContent: React.FC<{ user: User }> = ({ user }) => {
    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
    const [ratingHistory, setRatingHistory] = useState<any[]>([]);

    useEffect(() => {
        setStats(getPlayerStats(user.id));
        setRecentMatches(getRecentPlayerMatches(user.id));
        setRatingHistory(getRatingHistory(user.id));
    }, [user.id]);

    if (!stats) return <div>Carregando estatísticas...</div>;
    
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <StatCard title="Rating Atual" value={stats.rating} />
                <StatCard title="Vitórias" value={stats.wins} />
                <StatCard title="Derrotas" value={stats.losses} />
                <StatCard title="Total de Jogos" value={stats.totalGames} />
            </div>

            <div>
                <h3 className="text-xl font-bold text-white mb-4">Evolução do Rating</h3>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 md:p-6 h-64 md:h-80">
                   <RatingChart history={ratingHistory} />
                </div>
            </div>

            <div>
                <h3 className="text-xl font-bold text-white mb-4">Partidas Recentes</h3>
                <div className="space-y-3">
                    {recentMatches.length > 0 ? recentMatches.map(match => (
                        <div key={match.matchId} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img src={match.opponent.avatar} alt={match.opponent.name} className="w-10 h-10 rounded-full" />
                                <div>
                                    <p className="font-semibold text-white">vs {match.opponent.name}</p>
                                    <p className="text-xs text-slate-400">{match.categoryName}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold text-lg ${match.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                                    {match.playerScore} - {match.opponentScore}
                                </p>
                                <p className={`text-sm font-semibold ${match.ratingChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {match.ratingChange >= 0 ? `+${match.ratingChange}` : match.ratingChange}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-slate-400 text-center py-4">Nenhuma partida recente encontrada.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const ClubDashboardContent: React.FC<{ user: User }> = ({ user }) => {
    const [stats, setStats] = useState<ClubStats | null>(null);

     useEffect(() => {
        if (user.clubId) {
            setStats(getClubStats(user.clubId));
        }
    }, [user.clubId]);

    if (!stats) return <div>Carregando estatísticas...</div>;

    return (
        <div className="space-y-8">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <StatCard title="Eventos Ativos" value={stats.activeEvents} />
                <StatCard title="Total de Categorias" value={stats.totalCategories} />
                <StatCard title="Total de Inscrições" value={stats.totalRegistrations} />
            </div>
             <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
                <PingPongPaddleIcon className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">Bem-vindo ao seu painel</h3>
                <p className="text-slate-400 mt-2">Use a navegação para gerenciar seus eventos e o perfil do clube.</p>
            </div>
        </div>
    );
};

interface DashboardProps {
    user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
    return (
        <div className="animate-fade-in">
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-8">
                {user.role === Role.PLAYER ? 'Meu Dashboard' : 'Dashboard do Clube'}
            </h2>
            {user.role === Role.PLAYER ? <PlayerDashboardContent user={user} /> : <ClubDashboardContent user={user} />}
        </div>
    );
};

export default Dashboard;