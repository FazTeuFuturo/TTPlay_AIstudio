import React, { useState, useEffect, useRef } from 'react';
import { User, UserSession, Role, Club } from './types';
import { Session } from '@supabase/supabase-js';
import { 
  initializeDatabase, 
  login, 
  logout, 
  getUserById, 
  registerPlayer, 
  registerClub, 
  getCart, 
  addToCart, 
  checkout, 
  getClubById, 
  updateUserDetails 
} from './data-service';
import { PingPongPaddleIcon, ShoppingCartIcon, SpinnerIcon } from './components/Icons';
import AuthPage from './components/AuthPage';
import CheckoutPage from './components/CheckoutPage';
import SubscriptionPage from './components/SubscriptionPage';
import AppLayout from './components/AppLayout';
import Dashboard from './components/Dashboard';
import PlayerEventsPage from './components/PlayerEventsPage';
import ClubEventsPage from './components/ClubEventsPage';
import PlayerProfileForm from './components/PlayerProfileForm';
import ClubProfileForm from './components/ClubProfileForm';
import { supabase } from './lib/supabaseClient';
import ResetPasswordPage from './components/ResetPasswordPage'; 

const Header: React.FC<{ user: User | null; managedClub: Club | null; onLogout: () => void; cartCount: number; onCartClick: () => void; }> = ({ user, managedClub, onLogout, cartCount, onCartClick }) => {
    const displayUser = managedClub ? {
        name: managedClub.name,
        avatar: managedClub.logo || `https://picsum.photos/seed/${managedClub.id}/100/100`,
        roleText: 'Clube'
    } : {
        name: user?.name,
        avatar: user?.avatar || `https://i.pravatar.cc/150?u=${user?.id}`,
        roleText: 'Atleta'
    };

    return (
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <PingPongPaddleIcon className="w-8 h-8 text-blue-500"/>
              <h1 className="text-2xl font-bold tracking-tight text-white">TTPlay</h1>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                 <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>
                {user.role === Role.PLAYER && (
                  <button onClick={onCartClick} className="relative text-slate-400 hover:text-white transition-colors">
                    <ShoppingCartIcon className="w-6 h-6" />
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </button>
                )}
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{displayUser.name}</p>
                   <p className="text-xs text-slate-400 hidden md:block">
                      {managedClub ? `Gerenciado por: ${user.name}` : displayUser.roleText}
                   </p>
                </div>
                <img src={displayUser.avatar} alt={displayUser.name} className="w-10 h-10 rounded-full border-2 border-slate-600 object-cover" />
                <button 
                  onClick={onLogout}
                  className="bg-slate-700 hover:bg-red-500 hover:text-white text-slate-300 text-sm font-bold py-2 px-4 rounded transition-colors"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
};

const Footer: React.FC = () => (
    <footer className="bg-slate-900 border-t border-slate-800 mt-auto">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-slate-500">
        <p>&copy; {new Date().getFullYear()} TTPlay. Todos os direitos reservados.</p>
      </div>
    </footer>
);

type MainView = 'dashboard' | 'events' | 'profile';
type ModalView = 'checkout' | 'subscription' | 'none';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null); 
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [managedClub, setManagedClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mainView, setMainView] = useState<MainView>('dashboard');
  const [modalView, setModalView] = useState<ModalView>('none');
  const [cartCount, setCartCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  
  const lastProcessedUserRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const initializeApp = async () => {
      console.log("LOG: Iniciando aplicação...");

      try {
        await initializeDatabase();
        console.log("LOG: Database inicializado.");

        console.log("LOG: Configurando listener onAuthStateChange...");
        
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          
          console.log(`LOG: onAuthStateChange EVENTO: ${event}, Session exists: ${!!session}`);

          try {
            // PASSWORD_RECOVERY
            if (event === 'PASSWORD_RECOVERY') {
              console.log("LOG: Modo de Recuperação de Senha ATIVADO.");
              setIsRecovering(true);
              setSession(session);
              setCurrentUser(null);
              setManagedClub(null);
              setIsLoading(false);
              lastProcessedUserRef.current = null;
              return;
            }

            // SIGNED_OUT
            if (event === 'SIGNED_OUT') {
              console.log("LOG: Usuário DESLOGADO. Limpando estado...");
              setIsRecovering(false);
              setSession(null);
              setCurrentUser(null);
              setManagedClub(null);
              setCartCount(0);
              setIsLoading(false);
              lastProcessedUserRef.current = null;
              return;
            }

            // INITIAL_SESSION sem sessão
            if (event === 'INITIAL_SESSION' && !session) {
              console.log("LOG: Nenhuma sessão encontrada.");
              setIsRecovering(false);
              setSession(null);
              setCurrentUser(null);
              setManagedClub(null);
              setCartCount(0);
              setIsLoading(false);
              lastProcessedUserRef.current = null;
              return;
            }

            // TOKEN_REFRESHED, INITIAL_SESSION ou SIGNED_IN com sessão
            if ((event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) {
              
              // Anti-loop: ignora se já processamos este usuário
              if (lastProcessedUserRef.current === session.user.id) {
                console.log(`LOG: Usuário já processado. IGNORANDO ${event}.`);
                setIsLoading(false);
                return;
              }

              console.log(`LOG: Processando sessão (${event})...`);
              setIsRecovering(false);

              const user = await getUserById(session.user.id);
              console.log(`LOG: User found: ${!!user}`);

              if (user) {
                console.log(`LOG: Perfil: ${user.name}`);
                let clubToSet = null;
                let cartCountToSet = 0;

                if (user.role === Role.PLAYER) {
                  cartCountToSet = getCart().length;
                }
                
                if (user.role === Role.CLUB_ADMIN && user.clubId) {
                  clubToSet = await getClubById(user.clubId);
                }

                setSession(session);
                setCurrentUser(user);
                setManagedClub(clubToSet || null);
                setCartCount(cartCountToSet);
                lastProcessedUserRef.current = session.user.id;

                if (window.location.pathname === '/reset-password') {
                  window.history.replaceState(null, '', '/');
                }
                
                console.log("LOG: ✓ Estados configurados.");
              } else {
                console.error("LOG: Perfil não encontrado. Logout forçado.");
                await supabase.auth.signOut();
              }
            }

          } catch (error: any) {
            console.error("LOG: Erro no listener:", error.message);
            await supabase.auth.signOut();
          } finally {
            if (mounted) {
              setIsLoading(false);
            }
          }
        });

        return () => {
          mounted = false;
          console.log("LOG: Limpando listener.");
          authListener.subscription.unsubscribe();
        };

      } catch (error: any) {
        console.error("LOG: Erro na inicialização:", error.message);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeApp();
  }, []);

  const handleLogin = async (email: string, password?: string) => {
    const user = await login(email, password || '');
    if (user) {
        console.log("LOG: Login sucesso!");
        setMainView('dashboard'); 
    } else {
        alert("Email ou senha inválidos.");
    }
  };
  
  const handleRegisterPlayer = async (data: Partial<User>): Promise<boolean> => {
    try {
        const newUser = await registerPlayer(data);
        alert(`Bem-vindo, ${newUser.name}!`);
        return true;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Erro: ${errorMessage}`);
        return false;
    }
  }

  const handleRegisterClub = async (clubData: Partial<Club>, adminData: Partial<User>): Promise<boolean> => {
     try {
        const { club, admin } = await registerClub(clubData, adminData);
        alert(`Clube ${club.name} cadastrado!`);
        return true;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Erro: ${errorMessage}`);
        return false;
    }
  }

  const handleLogout = async () => {
    await logout();
    setMainView('dashboard');
    setModalView('none');
  };

  const handleAdminTransferSuccess = () => {
    alert('Administração transferida!');
    handleLogout();
  };

  const handleAddToCart = (categoryId: string, eventId: string) => {
    const newCart = addToCart(categoryId, eventId);
    setCartCount(newCart.length);
    alert('Adicionado ao carrinho!');
  }

  const handleCheckout = async () => {
    if (currentUser) {
        const success = await checkout(currentUser.id);
        if (success) {
            alert('Inscrições confirmadas!');
            setCartCount(0); 
            setModalView('none');
        } else {
            alert('Erro ao processar.');
        }
    }
  }
  
  const renderModalContent = () => {
     if (!currentUser) return null;

     switch(modalView) {
        case 'checkout':
            return <CheckoutPage currentUser={currentUser} onCheckout={handleCheckout} onBack={() => setModalView('none')} />;
        case 'subscription':
            return <SubscriptionPage onSubscribed={() => setModalView('none')} onBack={() => setModalView('none')} />;
        default:
            return null;
     }
  }

  const renderMainContent = () => {
     if (!currentUser) return null;
     
     switch(mainView) {
        case 'events':
            if (currentUser.role === Role.PLAYER) {
                return <PlayerEventsPage playerUser={currentUser} onAddToCart={handleAddToCart} />;
            }
            if (currentUser.role === Role.CLUB_ADMIN) {
                return <ClubEventsPage adminUser={currentUser} onNavigate={(view) => setModalView(view as ModalView)} />;
            }
            return null;
        case 'profile':
            if (currentUser.role === Role.PLAYER) {
                return <PlayerProfileForm user={currentUser} mode="edit" onFormSubmit={async (data) => {
                    await updateUserDetails(currentUser.id, data);
                    setMainView('dashboard');
                }} />;
            }
            if (currentUser.role === Role.CLUB_ADMIN && managedClub) {
                 return <ClubProfileForm 
                    club={managedClub}
                    adminUser={currentUser} 
                    mode="edit" 
                    onFormClose={() => setMainView('dashboard')}
                    onAdminTransferSuccess={handleAdminTransferSuccess}
                 />;
            }
            return null;
        case 'dashboard':
        default:
            return <Dashboard user={currentUser} />;
     }
  }

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <SpinnerIcon className="w-6 h-6 text-blue-500"/>
        </div>
    )
  }

  if (isRecovering) {
    return (
        <div className="min-h-screen flex flex-col bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-800">
          <main className="flex-grow w-full flex items-center justify-center">
            <ResetPasswordPage 
                onSuccess={() => {
                    if (window.location.pathname === '/reset-password') {
                        window.history.replaceState(null, '', '/'); 
                    }
                    setIsRecovering(false);
                    handleLogout();
                }}
            />
          </main>
        </div>
    );
  }

  if (!session) { 
      return (
         <div className="min-h-screen flex flex-col bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-800">
          <Header user={null} managedClub={null} onLogout={handleLogout} cartCount={0} onCartClick={() => {}} />
          <main className="flex-grow w-full flex items-center">
            <AuthPage 
              onLogin={handleLogin}
              onRegisterPlayer={handleRegisterPlayer}
              onRegisterClub={handleRegisterClub}
            />
          </main>
          <Footer />
        </div>
      );
    }
    
    return (
        <div className="min-h-screen flex flex-col bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-800">
            <Header user={currentUser} managedClub={managedClub} onLogout={handleLogout} cartCount={cartCount} onCartClick={() => setModalView('checkout')} />
            {currentUser ? (
               <AppLayout 
                    user={currentUser} 
                    managedClub={managedClub}
                    activeView={mainView}
                    onNavigate={setMainView}
                >
                    {modalView !== 'none' ? renderModalContent() : renderMainContent()}
                </AppLayout>
             ) : (
                 <div className="flex-grow flex items-center justify-center">
                     <SpinnerIcon className="w-6 h-6 text-blue-500"/>
                 </div>
             )}
            <Footer />
        </div>
    );
};

export default App;