import React, { useState, useEffect } from 'react';
import { User, Role, Club } from './types'; //
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
import ResetPasswordPage from './components/ResetPasswordPage'; //

// Componente Header (corrigido para erro de build Vercel)
const Header: React.FC<{ user: User | null; managedClub: Club | null; onLogout: () => void; cartCount: number; onCartClick: () => void; session: Session | null }> = ({ user, managedClub, onLogout, cartCount, onCartClick, session }) => {
    const displayUser = managedClub ? {
        name: managedClub.name,
        avatar: managedClub.logo || `https://picsum.photos/seed/${managedClub.id}/100/100`,
        roleText: 'Clube'
    } : {
        name: user?.name || 'Carregando...',
        avatar: user?.avatar || `https://i.pravatar.cc/150?u=${user?.id || 'default'}`,
        roleText: user?.role === Role.PLAYER ? 'Atleta' : (user?.role === Role.CLUB_ADMIN ? 'Admin' : '')
    };

    return (
        <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo e Título */}
              <div className="flex items-center gap-3">
                <PingPongPaddleIcon className="w-8 h-8 text-blue-500"/>
                <h1 className="text-2xl font-bold tracking-tight text-white">TTPlay</h1>
              </div>
              {/* Lado Direito */}
              <div className="flex items-center gap-4">
                 {/* Divisor vertical se houver sessão */}
                 {session && <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>}

                {/* Ícone do Carrinho (APENAS se for user logado e PLAYER) */}
                {user && user.role === Role.PLAYER && (
                  <button onClick={onCartClick} className="relative text-slate-400 hover:text-white transition-colors">
                    <ShoppingCartIcon className="w-6 h-6" />
                    {/* Contador do Carrinho (renderização condicional limpa) */}
                    {cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Info do Utilizador/Clube e Botão Sair (APENAS se houver sessão) */}
                {session && (
                  <>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{displayUser.name}</p>
                       <p className="text-xs text-slate-400 hidden md:block">
                          {managedClub ? `Gerenciado por: ${user?.name || '...'}` : displayUser.roleText}
                       </p>
                    </div>
                    <img src={displayUser.avatar} alt={displayUser.name} className="w-10 h-10 rounded-full border-2 border-slate-600 object-cover" />
                    <button onClick={onLogout} className="bg-slate-700 hover:bg-red-500 hover:text-white text-slate-300 text-sm font-bold py-2 px-4 rounded transition-colors"> Sair </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
    );
};

// Componente Footer (sem alterações)
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
  const [isLoading, setIsLoading] = useState(true); // Começa true
  const [mainView, setMainView] = useState<MainView>('dashboard');
  const [modalView, setModalView] = useState<ModalView>('none');
  const [cartCount, setCartCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // Flag para evitar set state se o componente desmontar
    let isMounted = true;

    initializeDatabase().then(() => console.log("LOG: Database inicializado."));

    console.log("LOG: Configurando listener onAuthStateChange...");
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Se não estiver montado, não faz nada
      if (!isMounted) {
          console.log(`LOG: Componente desmontado, ignorando evento ${event}`);
          return;
      }

      console.log(`LOG: onAuthStateChange EVENTO: ${event}, Session exists: ${!!session}`);

      // Garante que mostramos o loading durante o processamento assíncrono
      // Exceto se for INITIAL_SESSION sem sessão (já sabemos que não há nada a carregar)
      if (!(event === 'INITIAL_SESSION' && !session)) {
          console.log(`LOG: Definindo isLoading = true para evento ${event}`);
          setIsLoading(true);
      } else {
          // INITIAL_SESSION sem sessão -> Define loading false e limpa estados
          console.log("LOG: Sessão inicial nula. Definindo isLoading = false e limpando estados.");
          setIsLoading(false);
          setSession(null);
          setCurrentUser(null);
          setManagedClub(null);
          setCartCount(0);
          setIsRecovering(false);
          return; // Sai cedo
      }

      try {
        // Bloco try principal para processar eventos
        if (event === 'PASSWORD_RECOVERY') {
          console.log("LOG: Modo de Recuperação ATIVADO.");
          setIsRecovering(true);
          setSession(session); // Guarda a sessão de recuperação
          // Garante limpeza de dados antigos
          setCurrentUser(null);
          setManagedClub(null);
          setCartCount(0);
        } else if (event === 'SIGNED_OUT') {
          console.log("LOG: Usuário DESLOGADO. Limpando estado.");
          setIsRecovering(false); // Garante sair do modo recuperação
          setSession(null);
          setCurrentUser(null);
          setManagedClub(null);
          setCartCount(0);
        } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session) {
          // Eventos que indicam uma sessão (potencialmente) válida
          console.log(`LOG: Sessão válida (${event}). Buscando dados...`);
          setIsRecovering(false); // Garante sair do modo recuperação

          const user = await getUserById(session.user.id);
          console.log(`LOG: getUserById concluído. User found: ${!!user}`);

          if (user) {
            // Se encontrámos o utilizador, atualizamos tudo
            let clubToSet = null;
            let cartCountToSet = 0;
            if (user.role === Role.PLAYER) cartCountToSet = getCart().length;
            if (user.role === Role.CLUB_ADMIN && user.clubId) {
              clubToSet = await getClubById(user.clubId);
            }

            // Define todos os estados relevantes JUNTOS
            setSession(session);
            setCurrentUser(user);
            setManagedClub(clubToSet || null);
            setCartCount(cartCountToSet);
            console.log(`LOG: Estados atualizados para ${user.name}.`);

            // Limpa URL se necessário
            if (window.location.pathname === '/reset-password') {
              console.log("LOG: Limpando URL /reset-password...");
              window.history.replaceState(null, '', '/');
            }
          } else {
            // User não encontrado no DB -> Força logout
            console.error("LOG: Perfil não encontrado no DB! Forçando logout.");
            throw new Error("Perfil não encontrado"); // Vai para o catch
          }
        } else {
            // Outros eventos ou sessão nula inesperada
             console.log(`LOG: Evento ${event} sem sessão válida. Forçando limpeza.`);
             throw new Error("Sessão inválida ou evento inesperado"); // Vai para o catch
        }

      } catch (error: any) {
        // Bloco catch para lidar com erros na busca ou lógica acima
        console.error("LOG: Erro no processamento do evento:", error.message);
        // Garante a limpeza completa do estado em caso de erro
        setIsRecovering(false);
        setSession(null);
        setCurrentUser(null);
        setManagedClub(null);
        setCartCount(0);
        // Tenta deslogar silenciosamente se não for já um SIGNED_OUT
        if (event !== 'SIGNED_OUT') {
            await supabase.auth.signOut().catch(e => console.error("Erro no signOut do catch:", e));
        }
      } finally {
        // Bloco finally SEMPRE define isLoading como false no final
        if (isMounted) {
            setIsLoading(false);
            console.log(`LOG: Listener finalizado para evento ${event}. isLoading DEFINIDO para false.`);
        }
      }
    });

    // Função de limpeza
    return () => {
      isMounted = false; // Define a flag como false quando o componente desmonta
      console.log("LOG: Limpando listener.");
      authListener.subscription.unsubscribe();
    };
  }, []); // Array de dependências vazio para rodar apenas uma vez na montagem


  // Funções handleLogin, handleRegister*, handleLogout, etc. (sem alterações)
   const handleLogin = async (email: string, password?: string) => {
       try {
           const user = await login(email, password || ''); // Usa a versão simplificada do login
           if (user) {
               console.log("LOG: Login bem sucedido, aguardando listener...");
               setMainView('dashboard');
           } else {
               // A função login já loga o erro, aqui apenas informamos o user
               alert("Email ou senha inválidos.");
           }
       } catch (error) {
            console.error("LOG (handleLogin): Erro inesperado:", error);
            alert("Ocorreu um erro durante o login.");
       }
   };
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
   };
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
   };
   const handleLogout = async () => {
       console.log("LOG (handleLogout): Botão 'Sair' clicado. Chamando logout()...");
       try {
           await logout();
           console.log("LOG (handleLogout): logout() concluído. Aguardando listener...");
           // Limpa view localmente como fallback, listener fará a limpeza principal
           setMainView('dashboard');
           setModalView('none');
       } catch (error) {
            console.error("LOG (handleLogout): Erro retornado pela função logout():", error);
       }
   };
   const handleAdminTransferSuccess = () => {
       alert('Administração transferida com sucesso! Você será deslogado.');
       handleLogout();
   };
   const handleAddToCart = (categoryId: string, eventId: string) => {
       const newCart = addToCart(categoryId, eventId);
       setCartCount(newCart.length);
       alert('Categoria adicionada ao carrinho!');
   };
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
   };

  // Funções renderModalContent e renderMainContent (sem alterações)
  const renderModalContent = () => {
     if (!currentUser) return null; // Será tratado pelo spinner na renderização principal
     switch(modalView) { /* ... */ }
     return null; // Adicionado retorno padrão
  };
  const renderMainContent = () => {
     if (!currentUser) return null; // Será tratado pelo spinner na renderização principal
     switch(mainView) { /* ... */ }
     return null; // Adicionado retorno padrão
  };

  // --- LÓGICA DE RENDERIZAÇÃO PRINCIPAL ---

  // 1. Loading inicial da autenticação/sessão
  if (isLoading) {
    console.log("LOG: Renderizando: isLoading (Principal)");
    return ( <div className="min-h-screen flex items-center justify-center bg-slate-900"><SpinnerIcon className="w-12 h-12 text-blue-500"/></div> );
  }

  // 2. Recuperação de Senha
  if (isRecovering) {
    console.log("LOG: Renderizando: ResetPasswordPage");
    return (
        <div className="min-h-screen flex flex-col bg-slate-900"><main className="flex-grow w-full flex items-center justify-center">
            <ResetPasswordPage onSuccess={() => {
                if (window.location.pathname === '/reset-password') window.history.replaceState(null, '', '/');
                setIsRecovering(false);
                handleLogout(); // Dispara SIGNED_OUT
            }}/>
        </main></div>
    );
  }

  // 3. Sem Sessão -> Tela de Login/Auth
  if (!session) {
      console.log("LOG: Renderizando: AuthPage (sem sessão)");
      return (
         <div className="min-h-screen flex flex-col bg-slate-900">
          {/* Passa session=null explicitamente */}
          <Header user={null} managedClub={null} onLogout={handleLogout} cartCount={0} onCartClick={() => {}} session={null} />
          <main className="flex-grow w-full flex items-center"><AuthPage onLogin={handleLogin} onRegisterPlayer={handleRegisterPlayer} onRegisterClub={handleRegisterClub}/></main>
          <Footer />
        </div>
      );
    }

    // 4. Com Sessão -> AppLayout (mostra spinner interno se currentUser ainda não carregou)
    console.log(`LOG: Renderizando: AppLayout Shell (Sessão OK, currentUser ${currentUser ? 'carregado' : 'a carregar...'})`);
    return (
        <div className="min-h-screen flex flex-col bg-slate-900">
            {/* Passa session aqui */}
            <Header user={currentUser} managedClub={managedClub} onLogout={handleLogout} cartCount={cartCount} onCartClick={() => setModalView('checkout')} session={session} />
            {currentUser ? (
               <AppLayout user={currentUser} managedClub={managedClub} activeView={mainView} onNavigate={setMainView}>
                    {modalView !== 'none' ? renderModalContent() : renderMainContent()}
                </AppLayout>
             ) : ( // Spinner interno enquanto busca currentUser após sessão ser confirmada
                 <div className="flex-grow flex items-center justify-center"><SpinnerIcon className="w-12 h-12 text-blue-500"/></div>
             )}
            <Footer />
        </div>
    );
};

export default App;