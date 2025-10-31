import React, { useEffect, useState } from 'react';
import { ClubMemberRole, ClubMemberWithUser, User } from '../types';
import { getClubMembers, addClubMember, removeClubMember, updateClubMemberRole, getUsers } from '../data-service';

interface ClubMembersManagerProps {
    clubId: string;
    currentUserRole: ClubMemberRole;
}

export const ClubMembersManager: React.FC<ClubMembersManagerProps> = ({ clubId, currentUserRole }) => {
    const [members, setMembers] = useState<ClubMemberWithUser[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState<ClubMemberRole>(ClubMemberRole.PLAYER);
    const [filterRole, setFilterRole] = useState<ClubMemberRole | 'ALL'>('ALL');

    const canManageMembers = currentUserRole === ClubMemberRole.OWNER || currentUserRole === ClubMemberRole.ADMIN;

    useEffect(() => {
        fetchMembers();
        fetchAllUsers();
    }, [clubId, filterRole]);

    const fetchMembers = async () => {
        setLoading(true);
        const fetchedMembers = await getClubMembers(
            clubId, 
            filterRole === 'ALL' ? undefined : filterRole
        );
        setMembers(fetchedMembers);
        setLoading(false);
    };

    const fetchAllUsers = async () => {
        const users = await getUsers();
        setAllUsers(users);
    };

    const handleAddMember = async () => {
        if (!selectedUserId || !canManageMembers) return;

        const success = await addClubMember(clubId, selectedUserId, selectedRole);
        if (success) {
            setShowAddModal(false);
            setSelectedUserId('');
            setSelectedRole(ClubMemberRole.PLAYER);
            fetchMembers();
            alert('Membro adicionado com sucesso!');
        } else {
            alert('Erro ao adicionar membro. Verifique se a pessoa já não é membro.');
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!canManageMembers) return;

        const confirm = window.confirm(`Deseja realmente remover ${memberName} do clube?`);
        if (!confirm) return;

        const success = await removeClubMember(memberId);
        if (success) {
            fetchMembers();
            alert('Membro removido com sucesso!');
        } else {
            alert('Erro ao remover membro.');
        }
    };

    const handleChangeRole = async (memberId: string, newRole: ClubMemberRole, memberName: string) => {
        if (currentUserRole !== ClubMemberRole.OWNER) {
            alert('Apenas o proprietário pode alterar as funções.');
            return;
        }

        const confirm = window.confirm(`Alterar função de ${memberName} para ${getRoleLabel(newRole)}?`);
        if (!confirm) return;

        const success = await updateClubMemberRole(memberId, newRole);
        if (success) {
            fetchMembers();
            alert('Função atualizada com sucesso!');
        } else {
            alert('Erro ao atualizar função.');
        }
    };

    const getRoleLabel = (role: ClubMemberRole) => {
        switch (role) {
            case ClubMemberRole.OWNER: return 'Proprietário';
            case ClubMemberRole.ADMIN: return 'Administrador';
            case ClubMemberRole.STAFF: return 'Auxiliar';
            case ClubMemberRole.PLAYER: return 'Atleta';
        }
    };

    const getRoleBadgeColor = (role: ClubMemberRole) => {
        switch (role) {
            case ClubMemberRole.OWNER: return 'bg-purple-600 text-white';
            case ClubMemberRole.ADMIN: return 'bg-blue-600 text-white';
            case ClubMemberRole.STAFF: return 'bg-green-600 text-white';
            case ClubMemberRole.PLAYER: return 'bg-slate-600 text-white';
        }
    };

    const availableUsers = allUsers.filter(user => 
        !members.some(member => member.userId === user.id)
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Membros do Clube</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {members.length} {members.length === 1 ? 'membro' : 'membros'} no clube
                    </p>
                </div>
                
                {canManageMembers && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Adicionar Membro
                    </button>
                )}
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
                <button onClick={() => setFilterRole('ALL')} className={`px-4 py-2 rounded-lg transition-colors ${filterRole === 'ALL' ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Todos</button>
                <button onClick={() => setFilterRole(ClubMemberRole.OWNER)} className={`px-4 py-2 rounded-lg transition-colors ${filterRole === ClubMemberRole.OWNER ? 'bg-purple-600 text-white font-semibold' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Proprietários</button>
                <button onClick={() => setFilterRole(ClubMemberRole.ADMIN)} className={`px-4 py-2 rounded-lg transition-colors ${filterRole === ClubMemberRole.ADMIN ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Administradores</button>
                <button onClick={() => setFilterRole(ClubMemberRole.STAFF)} className={`px-4 py-2 rounded-lg transition-colors ${filterRole === ClubMemberRole.STAFF ? 'bg-green-600 text-white font-semibold' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Auxiliares</button>
                <button onClick={() => setFilterRole(ClubMemberRole.PLAYER)} className={`px-4 py-2 rounded-lg transition-colors ${filterRole === ClubMemberRole.PLAYER ? 'bg-slate-600 text-white font-semibold' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Atletas</button>
            </div>

            <div className="space-y-2">
                {members.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">Nenhum membro encontrado com este filtro.</p>
                ) : (
                    members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <h3 className="font-semibold text-white">{member.userName}</h3>
                                        <p className="text-sm text-slate-400">{member.userEmail}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {currentUserRole === ClubMemberRole.OWNER && member.role !== ClubMemberRole.OWNER ? (
                                    <select
                                        value={member.role}
                                        onChange={(e) => handleChangeRole(member.id, e.target.value as ClubMemberRole, member.userName)}
                                        className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-600 text-white border-2 border-slate-500 cursor-pointer hover:bg-slate-500 transition-colors"
                                    >
                                        <option value={ClubMemberRole.ADMIN}>Administrador</option>
                                        <option value={ClubMemberRole.STAFF}>Auxiliar</option>
                                        <option value={ClubMemberRole.PLAYER}>Atleta</option>
                                    </select>
                                ) : (
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRoleBadgeColor(member.role)}`}>
                                        {getRoleLabel(member.role)}
                                    </span>
                                )}
                                
                                <span className="text-xs text-slate-400">
                                    {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
                                </span>
                                
                                {canManageMembers && member.role !== ClubMemberRole.OWNER && (
                                    <button
                                        onClick={() => handleRemoveMember(member.id, member.userName)}
                                        className="text-red-400 hover:text-red-300 p-2 transition-colors"
                                        title="Remover membro"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
                        <h3 className="text-xl font-bold text-white mb-4">Adicionar Membro</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Selecione o Usuário</label>
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Escolha um usuário...</option>
                                    {availableUsers.map(user => (
                                        <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Função no Clube</label>
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value as ClubMemberRole)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {currentUserRole === ClubMemberRole.OWNER && (
                                        <option value={ClubMemberRole.ADMIN}>Administrador</option>
                                    )}
                                    <option value={ClubMemberRole.STAFF}>Auxiliar</option>
                                    <option value={ClubMemberRole.PLAYER}>Atleta</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddMember}
                                    disabled={!selectedUserId}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Adicionar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
