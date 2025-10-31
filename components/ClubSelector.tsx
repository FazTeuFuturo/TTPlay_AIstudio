import React, { useEffect, useState } from 'react';
import { ManagedClub, ClubMemberRole } from '../types';
import { getManagedClubs } from '../data-service';

interface ClubSelectorProps {
    userId: string;
    onSelectClub: (clubId: string, role: ClubMemberRole) => void;
}

export const ClubSelector: React.FC<ClubSelectorProps> = ({ userId, onSelectClub }) => {
    const [managedClubs, setManagedClubs] = useState<ManagedClub[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClubs = async () => {
            const clubs = await getManagedClubs(userId);
            setManagedClubs(clubs);
            
            // Se tiver apenas 1 clube, selecionar automaticamente
            if (clubs.length === 1) {
                onSelectClub(clubs[0].clubId, clubs[0].role);
            }
            
            setLoading(false);
        };

        fetchClubs();
    }, [userId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando clubes...</p>
                </div>
            </div>
        );
    }

    if (managedClubs.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Nenhum Clube Encontrado</h2>
                    <p className="text-gray-600 mb-6">
                        Você não está associado a nenhum clube no momento.
                    </p>
                    <button
                        onClick={() => window.location.href = '/register'}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Criar Clube
                    </button>
                </div>
            </div>
        );
    }

    const getRoleBadgeColor = (role: ClubMemberRole) => {
        switch (role) {
            case ClubMemberRole.OWNER:
                return 'bg-purple-100 text-purple-800';
            case ClubMemberRole.ADMIN:
                return 'bg-blue-100 text-blue-800';
            case ClubMemberRole.STAFF:
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleLabel = (role: ClubMemberRole) => {
        switch (role) {
            case ClubMemberRole.OWNER:
                return 'Proprietário';
            case ClubMemberRole.ADMIN:
                return 'Administrador';
            case ClubMemberRole.STAFF:
                return 'Auxiliar';
            default:
                return role;
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Selecione um Clube</h2>
                <p className="text-gray-600 mb-6">
                    Você gerencia {managedClubs.length} {managedClubs.length === 1 ? 'clube' : 'clubes'}. Escolha qual deseja acessar:
                </p>

                <div className="space-y-4">
                    {managedClubs.map(club => (
                        <button
                            key={club.clubId}
                            onClick={() => onSelectClub(club.clubId, club.role)}
                            className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 mb-2">
                                        {club.clubName}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(club.role)}`}>
                                            {getRoleLabel(club.role)}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            Membro desde {new Date(club.joinedAt).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                </div>
                                <svg 
                                    className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
