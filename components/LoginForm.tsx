import React, { useState } from 'react';
import { ArrowLeftIcon, SpinnerIcon } from './Icons';
import { sendPasswordResetEmail } from '../data-service'; // <-- NOVO: Importa a função que criamos

interface LoginFormProps {
  onLogin: (email: string, password?: string) => Promise<void>;
  onBack: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- NOVOS ESTADOS ---
  const [view, setView] = useState<'login' | 'forgot_password'>('login'); // <-- NOVO: Controla qual tela mostrar
  const [message, setMessage] = useState(''); // <-- NOVO: Para mensagens de sucesso (ex: "Email enviado!")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setError('');
    setMessage(''); // <-- NOVO: Limpa mensagens
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      // O onLogin pai já mostra o alerta, então só tratamos o loading
    } finally {
      setLoading(false);
    }
  };

  // --- NOVA FUNÇÃO ---
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { // Vamos reutilizar o campo 'email'
      setError('Por favor, informe o e-mail para recuperação.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(email);
      setMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setLoading(false);
      // Não mudamos de view, apenas mostramos a mensagem. O usuário pode voltar se quiser.
    } catch (err: any) {
      setError(err.message || 'E-mail não encontrado ou falha ao enviar.');
      setLoading(false);
    }
  };

  // --- FUNÇÃO AUXILIAR PARA TROCAR DE VIEW ---
  const switchView = (newView: 'login' | 'forgot_password') => {
    setView(newView);
    setError('');
    setMessage('');
    setPassword(''); // Limpa a senha ao trocar de tela
  };


  // --- RENDERIZAÇÃO CONDICIONAL ---
  if (view === 'forgot_password') {
    return (
      <div className="w-full max-w-md mx-auto animate-fade-in">
        {/* Botão de Voltar agora volta para a tela de Login, não para a AuthPage */}
        <button onClick={() => switchView('login')} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
          <ArrowLeftIcon className="w-5 h-5"/>
          Voltar para o Login
        </button>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
          <h2 className="text-3xl font-extrabold text-white mb-6 text-center">Recuperar Senha</h2>
          
          <form onSubmit={handlePasswordReset} className="space-y-6">
            {error && <p className="text-red-400 bg-red-500/10 p-3 rounded">{error}</p>}
            {message && <p className="text-green-400 bg-green-500/10 p-3 rounded">{message}</p>} {/* <-- NOVO */}

            <p className="text-sm text-slate-300 text-center">
              Digite seu e-mail e enviaremos um link para redefinir sua senha.
            </p>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input 
                type="email" 
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-blue-500 focus:border-blue-500" 
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
                {loading ? <SpinnerIcon className="w-6 h-6" /> : 'Enviar Link de Recuperação'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- TELA DE LOGIN ORIGINAL (COM ALTERAÇÕES) ---
  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
        {/* Este botão 'onBack' volta para a página de escolha (AuthPage) */}
        <button onClick={onBack} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-6">
            <ArrowLeftIcon className="w-5 h-5"/>
            Voltar
        </button>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
        <h2 className="text-3xl font-extrabold text-white mb-6 text-center">Login</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p className="text-red-400 bg-red-500/10 p-3 rounded">{error}</p>}
          {message && <p className="text-green-400 bg-green-500/10 p-3 rounded">{message}</p>} {/* <-- NOVO */}


          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-blue-500 focus:border-blue-500" 
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
            <input 
              type="password" 
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:ring-blue-500 focus:border-blue-500" 
              required
              disabled={loading}
            />
          </div>

          {/* --- LINK DE ESQUECI A SENHA --- */}
          <div className="text-right">
            <button 
              type="button" // <-- NOVO: Importante ser 'button' para não submeter o form
              onClick={() => switchView('forgot_password')} 
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Esqueceu sua senha?
            </button>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded transition-colors flex items-center justify-center disabled:bg-slate-600"
              disabled={loading}
            >
              {loading ? <SpinnerIcon className="w-6 h-6" /> : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;