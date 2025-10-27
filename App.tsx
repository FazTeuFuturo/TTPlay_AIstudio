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

// Componentes Header e Footer (sem alterações significativas, apenas lidam com currentUser=null)
const Header: React.FC<{ user: User | null; managedClub: Club | null; onLogout: () => void; cartCount: number; onCartClick: () => void; session: Session | null }> = ({ user, managedClub, onLogout, cartCount, onCartClick, session }) => {
    const displayUser = managedClub ? {
        name: managedClub.name,
        avatar: managedClub.logo || `https://picsum.photos/seed/${managedClub.id}/100/100`,
        roleText: 'Clube'
    } : {
        name: user?.name || 'Carregando...', // Mostra 'Carregando' se user for null
        avatar: user?.avatar || `https://i.pravatar.cc/150?u=${user?.id || 'default'}`,
        roleText: user?.role === Role.PLAYER ? 'Atleta' : 'Admin'
    };
    return (/* ... JSX do Header adaptado para lidar com user=null e verificar session ... */
        <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <PingPongPaddleIcon className="w-8 h-8 text-blue-500"/>
                <h1 className="text-2xl font-bold tracking-tight text-white">TTPlay</h1>
              </div>
              {/* Mostra Header mesmo sem user, mas ajusta conteúdo */}
              <div className="flex items-center gap-4">
                 {session && <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>}
                {user && user.role === Role.PLAYER && (
                  <button onClick={onCartClick} className="relative text-slate-400 hover:text-white transition-colors">
                    <ShoppingCartIcon className="w-6 h-6" />
                    {cartCount > 0 && ( /* ... */ )}
                  </button>
                )}
                {session && ( // Mostra info do user/clube e botão Sair APENAS se houver sessão
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
const Footer: React.FC = () => (/* ... sem alterações ... */
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
  const [authLoading, setAuthLoading] = useState(true); // Loading inicial da autenticação
  const [dataLoading, setDataLoading] = useState(false); // Loading da busca de dados do user/clube
  const [mainView, setMainView] = useState<MainView>('dashboard');
  const [modalView, setModalView] = useState<ModalView>('none');
  const [cartCount, setCartCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);

  // useEffect 1: Lida APENAS com o estado de autenticação (session, isRecovering, authLoading)
  useEffect(() => {
    // Flag para evitar set state se o componente desmontar
    let isMounted = true;
    setAuthLoading(true); // Começa loading da autenticação

    initializeDatabase().then(() => console.log("LOG: Database inicializado."));

    console.log("LOG: Configurando listener onAuthStateChange...");
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      console.log(`LOG: onAuthStateChange EVENTO: ${event}, Session exists: ${!!session}`);

      // Lógica Síncrona: Apenas define estados relacionados à autenticação
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
        setSession(session);
        // Limpa dados do user aqui para garantir consistência
        setCurrentUser(null);
        setManagedClub(null);
        setCartCount(0);
      } else if (event === 'SIGNED_OUT') {
        setIsRecovering(false);
        setSession(null);
        setCurrentUser(null);
        setManagedClub(null);
        setCartCount(0);
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
         setIsRecovering(false);
         setSession(session); // Atualiza a sessão (pode ser null se INITIAL_SESSION falhar)
      }

      // Termina o loading da autenticação APÓS processar o evento
      console.log(`LOG: Listener finalizado para ${event}. AuthLoading = false.`);
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      console.log("LOG: Limpando listener.");
      authListener.subscription.unsubscribe();
    };
  }, []);

  // useEffect 2: Lida com a busca de dados QUANDO a sessão MUDA
  useEffect(() => {
    // Se não há sessão, ou se estamos recuperando, ou se auth ainda está a carregar, limpa/ignora
    if (!session || isRecovering || authLoading) {
      // Limpa dados se a sessão for explicitamente nula após o authLoading terminar
      if (!authLoading && !session) {
          console.log("LOG (useEffect Dados): Sem sessão. Limpando dados.");
          setCurrentUser(null);
          setManagedClub(null);
          setCartCount(0);
      }
      setDataLoading(false); // Garante que não ficamos em loading de dados
      return;
    }

    // Se chegou aqui, HÁ sessão, NÃO estamos recuperando, e auth JÁ CARREGOU. Busca os dados.
    let isMounted = true;
    const fetchUserData = async () => {
      console.log("LOG (useEffect Dados): Sessão válida encontrada. Buscando dados do usuário...");
      setDataLoading(true); // Começa o loading dos dados

      try {
        const user = await getUserById(session.user.id);
        if (!isMounted) return;

        if (user) {
          console.log(`LOG (useEffect Dados): Perfil ${user.name} encontrado.`);
          setCurrentUser(user);
          let clubToSet = null;
          let cartCountToSet = 0;

          if (user.role === Role.PLAYER) cartCountToSet = getCart().length;
          if (user.role === Role.CLUB_ADMIN && user.clubId) {
            clubToSet = await getClubById(user.clubId);
          }
          if (!isMounted) return;

          setManagedClub(clubToSet || null);
          setCartCount(cartCountToSet);

          if (window.location.pathname === '/reset-password') {
            console.log("LOG (useEffect Dados): Limpando URL /reset-password...");
            window.history.replaceState(null, '', '/');
          }
        } else {
          console.error("LOG (useEffect Dados): Perfil não encontrado! Forçando logout.");
          await supabase.auth.signOut(); // Dispara SIGNED_OUT no outro listener
        }
      } catch (error: any) {
        console.error("LOG (useEffect Dados): Erro ao buscar dados:", error.message);
        if (isMounted) {
          await supabase.auth.signOut(); // Dispara SIGNED_OUT no outro listener
        }
      } finally {
        if (isMounted) {
          console.log("LOG (useEffect Dados): Busca de dados finalizada. DataLoading = false.");
          setDataLoading(false); // Termina o loading dos dados
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [session, isRecovering, authLoading]); // Roda QUANDO um destes muda

  // Funções handleLogin, handleRegister*, handleLogout, etc. (sem alterações)
   const handleLogin = async (email: string, password?: string) => { /* ... */ };
   const handleRegisterPlayer = async (data: Partial<User>): Promise<boolean> => { /* ... */ };
   const handleRegisterClub = async (clubData: Partial<Club>, adminData: Partial<User>): Promise<boolean> => { /* ... */ };
   const handleLogout = async () => { /* ... */ };
   const handleAdminTransferSuccess = () => { /* ... */ };
   const handleAddToCart = (categoryId: string, eventId: string) => { /* ... */ };
   const handleCheckout = async () => { /* ... */ };

  // Funções renderModalContent e renderMainContent (sem alterações)
  const renderModalContent = () => { /* ... */ };
  const renderMainContent = () => { /* ... */ };

  // --- LÓGICA DE RENDERIZAÇÃO PRINCIPAL ---

  // 1. Loading inicial da autenticação
  if (authLoading) {
    console.log("LOG: Renderizando: authLoading (Principal)");
    return ( <div className="min-h-screen flex items-center justify-center bg-slate-900"><SpinnerIcon className="w-12 h-12 text-blue-500"/></div> );
  }

  // 2. Recuperação de Senha
  if (isRecovering) {
    console.log("LOG: Renderizando: ResetPasswordPage");
    return ( /* ... JSX ResetPasswordPage ... */ );
  }

  // 3. Sem Sessão -> Tela de Login/Auth
  if (!session) {
      console.log("LOG: Renderizando: AuthPage (sem sessão)");
      return ( /* ... JSX AuthPage ... */ );
    }

    // 4. Com Sessão -> AppLayout Shell
    console.log(`LOG: Renderizando: AppLayout Shell (Sessão OK. DataLoading: ${dataLoading}, currentUser: ${!!currentUser})`);
    return (
        <div className="min-h-screen flex flex-col bg-slate-900">
            {/* Passa session aqui para o Header saber se mostra 'Sair' etc. */}
            <Header user={currentUser} managedClub={managedClub} onLogout={handleLogout} cartCount={cartCount} onCartClick={() => setModalView('checkout')} session={session} />
            {dataLoading ? ( // Mostra spinner GERAL se os dados estão a carregar
                 <div className="flex-grow flex items-center justify-center"><SpinnerIcon className="w-12 h-12 text-blue-500"/></div>
             ) : currentUser ? ( // Renderiza conteúdo principal APENAS se currentUser estiver carregado
               <AppLayout user={currentUser} managedClub={managedClub} activeView={mainView} onNavigate={setMainView}>
                    {modalView !== 'none' ? renderModalContent() : renderMainContent()}
                </AppLayout>
             ) : ( // Caso RARO: há sessão, não há dataLoading, mas currentUser é null (erro no fetch?)
                 <div className="flex-grow flex items-center justify-center text-red-500 p-4 text-center">
                     Erro ao carregar dados do usuário. A sessão pode ser inválida. <button onClick={handleLogout} className="ml-2 underline">Tentar sair</button>
                 </div>
             )}
            <Footer />
        </div>
    );
};

export default App;