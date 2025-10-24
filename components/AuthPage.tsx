import React, { useState } from 'react';
import { Role, User, Club } from '../types';
import PlayerProfileForm from './PlayerProfileForm';
import ClubProfileForm from './ClubProfileForm';
import LoginForm from './LoginForm';

interface AuthPageProps {
  onLogin: (email: string, password?: string) => Promise<void>;
  onRegisterPlayer: (data: Partial<User>) => Promise<boolean>;
  onRegisterClub: (clubData: Partial<Club>, adminData: Partial<User>) => Promise<boolean>;
}

type AuthView = 'choice' | 'login' | 'register_player' | 'register_club';

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegisterPlayer, onRegisterClub }) => {
  const [view, setView] = useState<AuthView>('choice');

  const handlePlayerRegister = async (data: Partial<User>): Promise<boolean> => {
    const success = await onRegisterPlayer(data);
    if(success) {
        setView('login');
    }
    return success;
  }

  const handleClubRegister = async (clubData: Partial<Club>, adminData: Partial<User>): Promise<boolean> => {
    const success = await onRegisterClub(clubData, adminData);
    if(success) {
        setView('login');
    }
    return success;
  }

  const renderContent = () => {
    switch (view) {
      case 'login':
        return <LoginForm onLogin={onLogin} onBack={() => setView('choice')} />;
      case 'register_player':
        return <PlayerProfileForm mode="register" onFormClose={() => setView('choice')} onFormSubmit={handlePlayerRegister} />;
      case 'register_club':
        return <ClubProfileForm mode="register" onFormClose={() => setView('choice')} onRegister={handleClubRegister} />;
      case 'choice':
      default:
        return (
          <div className="w-full max-w-4xl mx-auto">
            <h2 className="text-4xl font-extrabold text-center text-white mb-4">Bem-vindo ao TTPlay</h2>
            <p className="text-lg text-slate-400 text-center mb-12">Sua plataforma completa para campeonatos de tênis de mesa.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 flex flex-col items-center text-center">
                <h3 className="text-2xl font-bold text-white mb-2">Sou um Atleta</h3>
                <p className="text-slate-400 mb-6 flex-grow">Crie seu perfil, participe de campeonatos e suba no ranking.</p>
                <button 
                  onClick={() => setView('register_player')}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded transition-colors"
                >
                  Cadastrar como Atleta
                </button>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 flex flex-col items-center text-center">
                <h3 className="text-2xl font-bold text-white mb-2">Sou um Clube</h3>
                <p className="text-slate-400 mb-6 flex-grow">Organize seus torneios de forma profissional e engaje sua comunidade.</p>
                <button 
                  onClick={() => setView('register_club')}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded transition-colors"
                >
                  Cadastrar meu Clube
                </button>
              </div>
            </div>
             <div className="text-center mt-8">
                <button onClick={() => setView('login')} className="text-blue-400 hover:text-blue-300 font-semibold">
                    Já tem uma conta? Faça login
                </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center animate-fade-in">
        {renderContent()}
    </div>
  );
};

export default AuthPage;