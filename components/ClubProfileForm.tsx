import React, { useState, useRef } from 'react';
import { Club, User, Gender, SubscriptionPlan } from '../types';
import { updateClubDetails, transferClubAdminship } from '../data-service';
import { ArrowLeftIcon, SpinnerIcon } from './Icons';
import ImageCropper from './ImageCropper';

interface ClubProfileFormProps {
  club?: Club;
  adminUser?: User;
  mode: 'register' | 'edit';
  onFormClose: () => void;
  onRegister?: (clubData: Partial<Club>, adminData: Partial<User>) => Promise<boolean>;
  onAdminTransferSuccess?: () => void;
}

const ClubProfileForm: React.FC<ClubProfileFormProps> = ({ club, adminUser, mode, onFormClose, onRegister, onAdminTransferSuccess }) => {
  const [clubData, setClubData] = useState<Partial<Club>>({
    name: club?.name || '',
    description: club?.description || '',
    address: club?.address || '',
    city: club?.city || '',
    state: club?.state || '',
    phone: club?.phone || '',
    email: club?.email || '',
    website: club?.website || '',
    logo: club?.logo || '',
    discountRules: club?.discountRules || [],
    subscription: club?.subscription || SubscriptionPlan.FREE
  });

  const [adminData, setAdminData] = useState<Partial<User>>({
    name: '',
    email: '',
    password: '',
    birthDate: '',
    gender: Gender.MALE,
  });
  
  const [loading, setLoading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const handleClubChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setClubData(prev => ({ ...prev, [name]: value }));
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAdminData(prev => ({ ...prev, [name]: value }));
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setClubData(prev => ({ ...prev, logo: croppedImage }));
    setShowCropper(false);
    setImageSrc(null);
  };
  
  const handleDiscountChange = (index: number, field: 'from' | 'discount', value: string) => {
    const newRules = [...(clubData.discountRules || [])];
    const numValue = field === 'from' ? parseInt(value) : parseFloat(value) / 100;
    if (!isNaN(numValue)) {
      newRules[index] = { ...newRules[index], [field]: numValue };
      setClubData(prev => ({...prev, discountRules: newRules}));
    }
  };
  
  const addDiscountRule = () => {
    const newRules = [...(clubData.discountRules || []), {from: (clubData.discountRules?.length || 0) + 2, discount: 0}];
    setClubData(prev => ({...prev, discountRules: newRules}));
  };
  
  const removeDiscountRule = (index: number) => {
    const newRules = [...(clubData.discountRules || [])];
    newRules.splice(index, 1);
    setClubData(prev => ({...prev, discountRules: newRules}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === 'register') {
      if(!clubData.name || !adminData.name || !adminData.email || !adminData.password) {
        alert("Por favor, preencha todos os campos obrigatórios para o clube e o administrador.");
        setLoading(false);
        return;
      }
      if (onRegister) {
        await onRegister(clubData, adminData);
      }
    } else if (club) {
      const updated = await updateClubDetails(club.id, clubData);
      if (updated) {
        alert('Perfil do clube atualizado com sucesso!');
        onFormClose();
      } else {
        alert('Ocorreu um erro ao atualizar o perfil do clube.');
      }
    }
    setLoading(false);
  };

  const handleTransferAdminship = () => {
    if (!club || !adminUser || !newAdminEmail) return;
    try {
        transferClubAdminship(club.id, newAdminEmail, adminUser.id);
        if (onAdminTransferSuccess) {
            onAdminTransferSuccess();
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Erro ao transferir administração: ${errorMessage}`);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {showCropper && imageSrc && (
            <ImageCropper 
            imageSrc={imageSrc} 
            onCropComplete={handleCropComplete} 
            onClose={() => setShowCropper(false)}
            />
        )}
        <button onClick={onFormClose} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
            <ArrowLeftIcon className="w-5 h-5"/>
            {mode === 'edit' ? 'Voltar para o Painel' : 'Voltar'}
        </button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
        <h2 className="text-3xl font-extrabold text-white mb-6">
            {mode === 'edit' ? 'Gerenciar Perfil do Clube' : 'Cadastro de Clube'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6 divide-y divide-slate-700">
             <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />

            <fieldset className="pt-6">
                <legend className="text-xl font-bold text-white mb-4">Dados do Clube</legend>
                 <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                     <div className="relative group flex-shrink-0">
                        <img src={clubData.logo || 'https://picsum.photos/seed/placeholder-club/100/100'} alt={clubData.name} className="w-24 h-24 rounded-lg border-4 border-slate-600 object-cover" />
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                        >
                            Alterar Logo
                        </button>
                    </div>
                    <div className="w-full">
                        <label htmlFor="clubName" className="block text-sm font-medium text-slate-300 mb-2">Nome do Clube</label>
                        <input type="text" name="name" id="clubName" value={clubData.name} onChange={handleClubChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" required disabled={loading} />
                    </div>
                </div>
                 <div className="mt-6">
                    <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
                    <textarea name="description" id="description" value={clubData.description} onChange={handleClubChange} rows={3} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" disabled={loading} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-slate-300 mb-2">Endereço</label>
                        <input type="text" name="address" id="address" value={clubData.address} onChange={handleClubChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" disabled={loading} />
                    </div>
                     <div>
                        <label htmlFor="city" className="block text-sm font-medium text-slate-300 mb-2">Cidade</label>
                        <input type="text" name="city" id="city" value={clubData.city} onChange={handleClubChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" disabled={loading} />
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                        <label htmlFor="clubEmail" className="block text-sm font-medium text-slate-300 mb-2">E-mail de Contato do Clube</label>
                        <input type="email" name="email" id="clubEmail" value={clubData.email} onChange={handleClubChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" disabled={loading} />
                    </div>
                     <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">Telefone</label>
                        <input type="tel" name="phone" id="phone" value={clubData.phone} onChange={handleClubChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" disabled={loading} />
                    </div>
                </div>
                 <div className="mt-6">
                    <label htmlFor="website" className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                    <input type="url" name="website" id="website" value={clubData.website} onChange={handleClubChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" disabled={loading} />
                </div>
            </fieldset>

             {mode === 'edit' && club?.subscription === SubscriptionPlan.PRO && (
                <fieldset className="pt-6">
                    <legend className="text-xl font-bold text-white mb-4">Configuração de Descontos (Plano Pro)</legend>
                    <div className="space-y-4">
                        {clubData.discountRules?.map((rule, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <span className="text-slate-300">A partir da</span>
                                <input type="number" value={rule.from} onChange={(e) => handleDiscountChange(index, 'from', e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                                <span className="text-slate-300">ª inscrição, dar</span>
                                <input type="number" value={rule.discount * 100} onChange={(e) => handleDiscountChange(index, 'discount', e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                                <span className="text-slate-300">% de desconto.</span>
                                <button type="button" onClick={() => removeDiscountRule(index)} className="text-red-400 hover:text-red-300 font-bold">Remover</button>
                            </div>
                        ))}
                        <button type="button" onClick={addDiscountRule} className="text-blue-400 hover:text-blue-300 font-semibold text-sm">+ Adicionar regra de desconto</button>
                    </div>
                </fieldset>
            )}

            {mode === 'edit' && adminUser && (
                <fieldset className="pt-6">
                    <legend className="text-xl font-bold text-white mb-4">Transferir Administração</legend>
                    <div className="space-y-4">
                        <p className="text-sm text-yellow-400 bg-yellow-900/50 p-3 rounded-lg">
                            <strong>Atenção:</strong> Ao transferir a administração, você perderá seu acesso de administrador a este clube e será convertido para um perfil de jogador normal. Esta ação não pode ser desfeita.
                        </p>
                        <div>
                            <label htmlFor="newAdminEmail" className="block text-sm font-medium text-slate-300 mb-2">E-mail do Novo Administrador</label>
                            <input
                                type="email"
                                id="newAdminEmail"
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                                placeholder="email@exemplo.com"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleTransferAdminship}
                            disabled={!newAdminEmail}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                        >
                            Transferir Administração
                        </button>
                    </div>
                </fieldset>
            )}

            {mode === 'register' && (
                 <fieldset className="pt-6">
                    <legend className="text-xl font-bold text-white mb-4">Dados do Administrador</legend>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="adminEmail" className="block text-sm font-medium text-slate-300 mb-2">Email do Admin</label>
                                <input type="email" name="email" id="adminEmail" value={adminData.email} onChange={handleAdminChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" required disabled={loading} />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Senha do Admin</label>
                                <input type="password" name="password" id="password" value={adminData.password} onChange={handleAdminChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" required disabled={loading} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="adminName" className="block text-sm font-medium text-slate-300 mb-2">Nome Completo do Admin</label>
                            <input type="text" name="name" id="adminName" value={adminData.name} onChange={handleAdminChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" required disabled={loading} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="birthDate" className="block text-sm font-medium text-slate-300 mb-2">Data de Nascimento</label>
                                <input type="date" name="birthDate" id="birthDate" value={adminData.birthDate} onChange={handleAdminChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" required disabled={loading} />
                            </div>
                            <div>
                                <label htmlFor="gender" className="block text-sm font-medium text-slate-300 mb-2">Gênero</label>
                                <select name="gender" id="gender" value={adminData.gender} onChange={handleAdminChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" required disabled={loading}>
                                    <option value={Gender.MALE}>Masculino</option>
                                    <option value={Gender.FEMALE}>Feminino</option>
                                </select>
                            </div>
                        </div>
                    </div>
                 </fieldset>
            )}

          <div className="flex justify-end pt-6">
            <button 
              type="submit"
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded transition-colors flex items-center justify-center min-w-[180px] disabled:bg-slate-600"
              disabled={loading}
            >
              {loading ? <SpinnerIcon className="w-6 h-6" /> : (mode === 'edit' ? 'Salvar Alterações' : 'Cadastrar Clube')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClubProfileForm;