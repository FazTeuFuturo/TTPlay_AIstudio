import React, { useState, useEffect } from 'react';
import { User, UserSession, Role, Club } from './types'; //
import { Session } from '@supabase/supabase-js'; // <-- NOVO: Correção para o erro TS2352
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
} from './data-service'; //
import { PingPongPaddleIcon, ShoppingCartIcon, SpinnerIcon } from './components/Icons'; //
import AuthPage from './components/AuthPage'; //
import CheckoutPage from './components/CheckoutPage'; //
import SubscriptionPage from './components/SubscriptionPage'; //
import AppLayout from './components/AppLayout'; //
import Dashboard from './components/Dashboard'; //
import PlayerEventsPage from './components/PlayerEventsPage'; //
import ClubEventsPage from './components/ClubEventsPage'; //
import PlayerProfileForm from './components/PlayerProfileForm'; //
import ClubProfileForm from './components/ClubProfileForm'; //
import { supabase } from './lib/supabaseClient'; //
import ResetPasswordPage from './components/ResetPasswordPage'; 

// (O componente Header não muda)
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

// (O componente Footer não muda)
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
  // <-- ALTERADO: Correção para o erro TS2352
  const [session, setSession] = useState<Session | null>(null); 
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [managedClub, setManagedClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mainView, setMainView] = useState<MainView>('dashboard');
  const [modalView, setModalView] = useState<ModalView>('none');
  const [cartCount, setCartCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false); 

  useEffect(() => {
    // 1. Inicializa o DB
    initializeDatabase().then(() => {
        console.log("LOG: Database inicializado.");
    });

    // 2. Escuta por mudanças de autenticação
    console.log("LOG: Configurando listener onAuthStateChange...");


// (Linha ~113 do App.tsx)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`LOG: onAuthStateChange EVENTO: ${event}, Session exists: ${!!session}`);

        // Define isLoading=true APENAS no início, se não for INITIAL_SESSION sem sessão
        // Isso garante que mostramos o loading durante o processamento
        let shouldSetLoadingTrue = true;
        if (event === 'INITIAL_SESSION' && !session) {
            console.log(`LOG: Sessão inicial nula, NÃO definindo isLoading = true.`);
            shouldSetLoadingTrue = false;
        }

        if (shouldSetLoadingTrue) {
            console.log(`LOG: Definindo isLoading = true para evento ${event}`);
            setIsLoading(true);
        }

        try {
            if (event === 'PASSWORD_RECOVERY') {
                console.log("LOG: Modo de Recuperação de Senha ATIVADO.");
                setIsRecovering(true);
                setSession(session);
                setCurrentUser(null);
                setManagedClub(null);
                // isLoading tratado pelo finally
            } else if (event === 'SIGNED_IN') {
                console.log("LOG: Usuário LOGADO (SIGNED_IN). Processando...");
                setIsRecovering(false);
                // NÃO definimos a sessão ainda, esperamos ter o user

                if (session) {
                    console.log(`LOG: Tentando buscar perfil para user ID: ${session.user.id}`);
                    const user = await getUserById(session.user.id); // Busca o perfil PRIMEIRO
                    console.log(`LOG: getUserById concluído. User found: ${!!user}`);

                    if (user) {
                        console.log(`LOG: Perfil encontrado: ${user.name}. Configurando TODOS os estados...`);
                        let clubToSet = null;
                        let cartCountToSet = 0;

                        if (user.role === Role.PLAYER) cartCountToSet = getCart().length;
                        if (user.role === Role.CLUB_ADMIN && user.clubId) {
                            console.log(`LOG: Buscando clube ID: ${user.clubId}`);
                            clubToSet = await getClubById(user.clubId);
                            console.log(`LOG: Clube ${clubToSet ? clubToSet.name : 'NÃO'} encontrado.`);
                        }

                        // ATUALIZA TODOS OS ESTADOS DE UMA VEZ
                        setSession(session); // Define a sessão JUNTO com o user
                        setCurrentUser(user);
                        setManagedClub(clubToSet || null);
                        setCartCount(cartCountToSet);

                        console.log("LOG: Estado do usuário, clube e carrinho configurado.");

                        // Limpeza da URL
                        if (window.location.pathname === '/reset-password') {
                            console.log("LOG: URL atual é /reset-password. Limpando para /...");
                            window.history.replaceState(null, '', '/');
                            console.log("LOG: URL limpa.");
                        }
                    } else {
                        console.error("LOG: Perfil do usuário NÃO encontrado após login. Forçando logout.");
                        throw new Error("Perfil do usuário não encontrado após login.");
                    }
                } else {
                     console.error("LOG: Evento SIGNED_IN mas a sessão era nula. Forçando logout.");
                     throw new Error("Sessão 'SIGNED_IN' não encontrada.");
                }
            } else if (event === 'SIGNED_OUT') {
                console.log("LOG: Usuário DESLOGADO (SIGNED_OUT). Limpando estado...");
                setIsRecovering(false);
                setSession(null);
                setCurrentUser(null);
                setManagedClub(null);
                setCartCount(0);
                 // isLoading tratado pelo finally
            }
            // INITIAL_SESSION agora só controla o isLoading inicial
            else if (event === 'INITIAL_SESSION' && session) {
                 console.log("LOG: Sessão inicial encontrada. Aguardando processamento do SIGNED_IN...");
                 // Não fazemos nada aqui, SIGNED_IN tratará tudo
            }

        } catch (error: any) {
            console.error("LOG: Erro dentro do listener onAuthStateChange:", error.message);
            setIsRecovering(false);
            setSession(null);
            setCurrentUser(null);
            setManagedClub(null);
            setCartCount(0);
            await supabase.auth.signOut().catch(signOutError => {
                console.error("LOG: Erro adicional ao tentar deslogar no catch:", signOutError);
            });
            // O finally tratará o isLoading
        } finally {
            // Este bloco agora SEMPRE será executado após o try ou catch
            setIsLoading(false);
            console.log(`LOG: Listener finalizado para evento ${event}. isLoading DEFINIDO para false.`);
        }
    });

    // 3. Limpa o listener ao desmontar
    return () => {
        console.log("LOG: Limpando o listener de autenticação.");
        authListener.subscription.unsubscribe();
    };
  }, []); 


  const handleLogin = async (email: string, password?: string) => {
    const user = await login(email, password || '');
    if (user) {
        console.log("LOG: Login bem sucedido, aguardando listener...");
        setMainView('dashboard'); 
    } else {
        alert("Email ou senha inválidos.");
    }
  };
  
  // <-- CORREÇÃO: FUNÇÃO RESTAURADA (para erro TS2304)
  const handleRegisterPlayer = async (data: Partial<User>): Promise<boolean> => {
    try {
        const newUser = await registerPlayer(data);
        alert(`Bem-vindo, ${newUser.name}! Seu cadastro foi realizado com sucesso. Faça o login para continuar.`);
        return true;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Erro no cadastro: ${errorMessage}`);
        return false;
    }
  }

  // <-- CORREÇÃO: FUNÇÃO RESTAURADA (para erro TS2304)
  const handleRegisterClub = async (clubData: Partial<Club>, adminData: Partial<User>): Promise<boolean> => {
     try {
        const { club, admin } = await registerClub(clubData, adminData);
        alert(`Clube ${club.name} cadastrado com sucesso! Faça o login como ${admin.name} para continuar.`);
        return true;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert(`Erro no cadastro: ${errorMessage}`);
        return false;
    }
  }

  const handleLogout = async () => {
    await logout();
    setMainView('dashboard');
    setModalView('none');
  };

  const handleAdminTransferSuccess = () => {
    alert('Administração transferida com sucesso! Você será deslogado.');
    handleLogout();
  };

  const handleAddToCart = (categoryId: string, eventId: string) => {
    const newCart = addToCart(categoryId, eventId);
    setCartCount(newCart.length);
    alert('Categoria adicionada ao carrinho!');
  }

  const handleCheckout = async () => {
    if (currentUser) {
        const success = await checkout(currentUser.id);
        if (success) {
            alert('Pagamento simulado com sucesso! Inscrições confirmadas.');
            setCartCount(0); 
            setModalView('none');
        } else {
            alert('Ocorreu um erro ao processar suas inscrições.');
        }
    }
  }
  
  const renderModalContent = () => {
     if (!currentUser) return null;

     switch(modalView) {
        case 'checkout':
            return <CheckoutPage currentUser={currentUser} onCheckout={handleCheckout} onBack={() => setModalView('none')} />;
        case 'subscription':
            return <SubscriptionPage onSubscribed={() => {
                supabase.auth.refreshSession(); 
                setModalView('none');
            }} onBack={() => setModalView('none')} />;
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
                    await supabase.auth.refreshSession(); 
                    setMainView('dashboard');
                }} />;
            }
            if (currentUser.role === Role.CLUB_ADMIN && managedClub) {
                 return <ClubProfileForm 
                    club={managedClub}
                    adminUser={currentUser} 
                    mode="edit" 
                    onFormClose={() => {
                        setMainView('dashboard');
                        supabase.auth.refreshSession(); 
                    }}
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
    console.log("LOG: Renderizando: isLoading");
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <SpinnerIcon className="w-12 h-12 text-blue-500"/>
        </div>
    )
  }

  if (isRecovering) {
    console.log("LOG: Renderizando: ResetPasswordPage");
    return (
        <div className="min-h-screen flex flex-col bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-800">
          <main className="flex-grow w-full flex items-center justify-center">
            <ResetPasswordPage 
                onSuccess={() => {
                    console.log("LOG: Senha redefinida com sucesso. Limpando URL e deslogando...");
                    
                    // --- LIMPA A URL PRIMEIRO ---
                    if (window.location.pathname === '/reset-password') {
                        console.log("LOG: Limpando URL /reset-password para /...");
                        window.history.replaceState(null, '', '/'); 
                        console.log("LOG: URL limpa.");
                    }
                    // --- FIM DA LIMPEZA DE URL ---

                    setIsRecovering(false); // Sai do modo de recuperação
                    handleLogout(); // Limpa a sessão e dispara 'SIGNED_OUT'
                }}
            />
          </main>
        </div>
    );
  }

  if (!session) { 
      console.log("LOG: Renderizando: AuthPage (sem sessão)");
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
    
    // Logged in view (agora renderiza mesmo que currentUser ainda seja null)
    // Os componentes internos (Header, AppLayout, Dashboard, etc.) precisam lidar com currentUser=null
    console.log(`LOG: Renderizando: AppLayout (com sessão, currentUser ${currentUser ? 'carregado' : 'a carregar...'})`); 
    return (
        <div className="min-h-screen flex flex-col bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-800">
            {/* Passa currentUser (que pode ser null inicialmente) para os componentes */}
            <Header user={currentUser} managedClub={managedClub} onLogout={handleLogout} cartCount={cartCount} onCartClick={() => setModalView('checkout')} />
            {currentUser ? ( // Renderiza AppLayout apenas se currentUser já foi carregado
               <AppLayout 
                    user={currentUser} 
                    managedClub={managedClub}
                    activeView={mainView}
                    onNavigate={setMainView}
                >
                    {modalView !== 'none' ? renderModalContent() : renderMainContent()}
                </AppLayout>
             ) : ( // Mostra um spinner simples enquanto currentUser carrega (opcional, mas bom UX)
                 <div className="flex-grow flex items-center justify-center">
                     <SpinnerIcon className="w-12 h-12 text-blue-500"/>
                 </div>
             )}
            <Footer />
        </div>
    );
};

export default App;