import { TournamentEvent, Match, Club, TournamentCategory, TournamentFormat, SubscriptionPlan } from './types';
import { CBTM_CATEGORIES_OLYMPIC } from './cbtm-categories';

// --- DADOS MOCKADOS PARA DESENVOLVIMENTO ---

// Clubes
export const CLUBS: Club[] = [
  { id: 'club-1', name: 'Clube de Tênis de Mesa de São Paulo', logo: 'https://i.pravatar.cc/100?u=club-1', adminId: 'admin-1', subscription: SubscriptionPlan.PRO, discountRules: [{ from: 3, discount: 0.10 }] },
  { id: 'club-2', name: 'Associação Nipo-Brasileira de Tênis de Mesa', logo: 'https://i.pravatar.cc/100?u=club-2', adminId: 'admin-2', subscription: SubscriptionPlan.FREE, discountRules: [] },
];

// Eventos de Torneio
export const TOURNAMENT_EVENTS: TournamentEvent[] = [
  { id: 'evt-1', name: 'Aberto de Verão de São Paulo', startDate: '2025-01-15', location: 'Ginásio Principal', club: CLUBS[0] },
  { id: 'evt-2', name: 'Copa Nipo-Brasileira', startDate: '2025-02-20', location: 'Sede Social', club: CLUBS[1] },
];

// Categorias de Torneio
export const TOURNAMENT_CATEGORIES: TournamentCategory[] = CBTM_CATEGORIES_OLYMPIC.map((c, index) => ({
    ...c,
    id: `cat-${index + 1}`,
    eventId: 'evt-1',
    format: TournamentFormat.GRUPOS_E_ELIMINATORIA,
    status: 'REGISTRATION',
    registrations: [],
    maxParticipants: 32,
    entryFee: 50,
    playersPerGroup: 4,
    kFactor: 32,
} as TournamentCategory));

// Partidas Iniciais (Exemplo para Categoria 1)
export const INITIAL_MATCHES_CAT_1: Match[] = [
  // ... (dados de partidas mockadas, se necessário)
];
