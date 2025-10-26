import React, { useState } from 'react';
import { updateUserPassword } from '../data-service'; // Importa a função do Passo 3
import { SpinnerIcon } from './Icons';

interface ResetPasswordPageProps {
  onSuccess: () => void; // Prop para avisar o App.tsx que terminamos
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // 1. Validar as senhas
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);

    try {
      // 2. Chamar a função do data-service
      await updateUserPassword(password);
      
      setMessage('Senha atualizada com sucesso! Você será redirecionado para o login em 3 segundos...');
      
      // 3. Aguardar 3s e chamar o callback de sucesso
      setTimeout(() => {
        onSuccess();
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Falha ao atualizar a senha. O link pode ter expirado ou ser inválido.');
      setLoading(false);
    }
    // Não definimos loading(false) no 'try' porque queremos que ele continue 'loading' até o redirecionamento
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in py-16">
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
        <h2 className="text-3xl font-extrabold text-white mb-6 text-center">Redefinir Senha</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="text-red-400 bg-red-500/10 p-3 rounded">{error}</p>}
          {message && <p className="text-green-400 bg-green-500/10 p-3 rounded">{message}</p>}

          {!message && ( // Esconde o formulário após o sucesso
            <>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Nova Senha</label>
                <input 
                  type="password" 
                  id="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" 
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">Confirmar Nova Senha</label>
                <input 
                  type="password" 
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" 
                  required
                  disabled={loading}
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded transition-colors flex items-center justify-center disabled:bg-slate-600"
                  disabled={loading}
                >
                  {loading ? <SpinnerIcon className="w-6 h-6" /> : 'Salvar Nova Senha'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;