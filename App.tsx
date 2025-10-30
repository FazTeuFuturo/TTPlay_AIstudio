import React, { useState, useEffect } from 'react';
import { User, UserSession, Role, Club } from './types';
import { login, logout, getCurrentUserSession, getUserById, registerPlayer, registerClub, getCart, addToCart, checkout, getClubById, transferClubAdminship, updateUserDetails } from './data-service';
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
  const [session, setSession] = useState<UserSession | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [managedClub, setManagedClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mainView, setMainView] = useState<MainView>('dashboard');
  const [modalView, setModalView] = useState<ModalView>('none');
  const [cartCount, setCartCount] = useState(0);

  const refreshData = async () => {
    const currentSession = await getCurrentUserSession();
    if (currentSession) {
      setSession(currentSession);
      const user = await getUserById(currentSession.userId);
      
      if (user) {
        setCurrentUser(user);

        if(user.role === Role.PLAYER) {
            setCartCount(getCart().length);
        }
        if (user.role === Role.CLUB_ADMIN && user.clubId) {
            const club = await getClubById(user.clubId);
            setManagedClub(club || null);
        } else {
            setManagedClub(null);
        }
      } else {
         setCurrentUser(null);
      }

    } else {
      setSession(null);
      setCurrentUser(null);
      setManagedClub(null);
      setCartCount(0);
    }
  }

  useEffect(() => {
    const setup = async () => {
      setIsLoading(true);
      await refreshData();
      setIsLoading(false);
    };
    setup();
  }, []);

  const handleLogin = async (email: string, password?: string) => {
    const user = await login(email, password || '');
    if (user) {
        await refreshData();
        setMainView('dashboard'); 
    } else {
        alert("Email ou senha inválidos.");
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
  }

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
    await refreshData();
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
            await refreshData(); // Refresh to update registrations
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
                refreshData();
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
                    await refreshData();
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
                        refreshData();
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
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <SpinnerIcon className="w-12 h-12 text-blue-500"/>
        </div>
    )
  }

  if (!session || !currentUser) {
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
    
    // Logged in view
    return (
        <div className="min-h-screen flex flex-col bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-800">
            <Header user={currentUser} managedClub={managedClub} onLogout={handleLogout} cartCount={cartCount} onCartClick={() => setModalView('checkout')} />
            <AppLayout 
                user={currentUser}
                managedClub={managedClub}
                activeView={mainView}
                onNavigate={setMainView}
            >
                {modalView !== 'none' ? renderModalContent() : renderMainContent()}
            </AppLayout>
            <Footer />
        </div>
    );
};

export default App;
