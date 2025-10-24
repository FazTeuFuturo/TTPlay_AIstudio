import React, { useState, useRef } from 'react';
import { User, Gender } from '../types';
import { updateUserDetails } from '../data-service';
import { ArrowLeftIcon } from './Icons';
import ImageCropper from './ImageCropper';

interface PlayerProfileFormProps {
  user?: User; 
  mode: 'register' | 'edit';
  onFormClose: () => void;
  onRegister?: (data: Partial<User>) => boolean;
}

const PlayerProfileForm: React.FC<PlayerProfileFormProps> = ({ user, mode, onFormClose, onRegister }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    city: user?.city || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    birthDate: user?.birthDate || '',
    gender: user?.gender || Gender.MALE,
    avatar: user?.avatar || '',
  });

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    setFormData(prev => ({ ...prev, avatar: croppedImage }));
    setShowCropper(false);
    setImageSrc(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.birthDate || !formData.gender || !formData.name || !formData.email) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }
    if (mode === 'register') {
        if (!formData.password) {
            alert("A senha é obrigatória para o cadastro.");
            return;
        }
        if (onRegister) {
            onRegister(formData);
        }
    } else if (user) {
        updateUserDetails(user.id, formData);
        alert('Perfil atualizado com sucesso!');
        onFormClose();
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
        {mode === 'edit' && user && (
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                <div className="relative group">
                    <img src={formData.avatar} alt={formData.name} className="w-24 h-24 rounded-full border-4 border-slate-600 object-cover" />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                    >
                      Alterar Foto
                    </button>
                </div>
                <div>
                     <h2 className="text-3xl font-extrabold text-white text-center sm:text-left">{user.name}</h2>
                     <p className="text-lg text-slate-400 text-center sm:text-left">Rating: {user.currentRating}</p>
                     <p className="text-xs text-slate-500 mt-1 text-center sm:text-left">Seu rating é atualizado automaticamente após as partidas.</p>
                </div>
            </div>
        )}
        {mode === 'register' && (
            <h2 className="text-3xl font-extrabold text-white mb-6">Cadastro de Atleta</h2>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <input type="file" ref={fileInputRef} onChange={onFileChange} accept="image/*" className="hidden" />
            
            {mode === 'register' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                        <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" required />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
                        <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" required />
                    </div>
                </div>
            )}

            <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">Nome Completo</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" required />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="birthDate" className="block text-sm font-medium text-slate-300 mb-2">Data de Nascimento</label>
                    <input type="date" name="birthDate" id="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" required />
                </div>
                <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-slate-300 mb-2">Gênero</label>
                    <select name="gender" id="gender" value={formData.gender} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" required>
                        <option value={Gender.MALE}>Masculino</option>
                        <option value={Gender.FEMALE}>Feminino</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label htmlFor="city" className="block text-sm font-medium text-slate-300 mb-2">Cidade</label>
                    <input type="text" name="city" id="city" value={formData.city} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                </div>
                 <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">Telefone</label>
                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
                </div>
            </div>
             <div>
                <label htmlFor="bio" className="block text-sm font-medium text-slate-300 mb-2">Biografia / Sobre você (Opcional)</label>
                <textarea name="bio" id="bio" value={formData.bio} onChange={handleChange} rows={4} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" />
            </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit"
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded transition-colors"
            >
              {mode === 'edit' ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayerProfileForm;