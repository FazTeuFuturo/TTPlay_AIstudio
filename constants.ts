import { User, Club, TournamentEvent, Match, TournamentCategory, TournamentFormat, TournamentStatus, Role, RegistrationStatus, Gender, SubscriptionPlan } from './types';

// --- Fictitious players for testing Sub-19 category ---
const FEMALE_YOUTH_PLAYERS: User[] = Array.from({ length: 16 }, (_, i) => ({
    id: `user-fy-${i + 1}`,
    name: `Atleta Jovem ${i + 1}`,
    email: `jovem${i+1}@email.com`,
    password: '123',
    currentRating: 1500 - (i * 20), // Varied ratings for seeding
    avatar: `https://i.pravatar.cc/150?u=user-fy-${i + 1}`,
    role: Role.PLAYER,
    birthDate: "2007-01-01", // Ensures they are under 19
    gender: Gender.FEMALE,
}));

// --- Fictitious players for testing Byes ---
const ABSOLUTO_C_PLAYERS: User[] = Array.from({ length: 11 }, (_, i) => ({
    id: `user-ac-${i + 1}`,
    name: `Atleta Absoluto C ${i + 1}`,
    email: `absolutoc${i+1}@email.com`,
    password: '123',
    currentRating: 1800 - (i * 30), // Varied ratings
    avatar: `https://i.pravatar.cc/150?u=user-ac-${i + 1}`,
    role: Role.PLAYER,
    birthDate: "1992-01-01",
    gender: Gender.MALE,
}));


// Let's assign roles, gender, and birth dates
export const USERS: User[] = [
  { id: 'user-1', name: "João Silva", email: "joao@email.com", password: "123", currentRating: 1800, avatar: 'https://i.pravatar.cc/150?u=user-1', role: Role.PLAYER, birthDate: "1995-03-10", gender: Gender.MALE },
  { id: 'user-2', name: "Maria Santos", email: "maria@email.com", password: "123", currentRating: 1750, avatar: 'https://i.pravatar.cc/150?u=user-2', role: Role.PLAYER, birthDate: "2005-08-22", gender: Gender.FEMALE },
  { id: 'user-3', name: "Carlos Pereira", email: "carlos@email.com", password: "123", currentRating: 2350, avatar: 'https://i.pravatar.cc/150?u=user-3', role: Role.PLAYER, birthDate: "1998-11-05", gender: Gender.MALE },
  { id: 'user-4', name: "Ana Costa", email: "ana@email.com", password: "123", currentRating: 1680, avatar: 'https://i.pravatar.cc/150?u=user-4', role: Role.PLAYER, birthDate: "2006-01-30", gender: Gender.FEMALE },
  { id: 'user-5', name: "Pedro Almeida", email: "pedro@email.com", password: "123", currentRating: 1650, avatar: 'https://i.pravatar.cc/150?u=user-5', role: Role.PLAYER, birthDate: "1983-06-18", gender: Gender.MALE },
  { id: 'user-6', name: "Sofia Oliveira", email: "sofia@email.com", password: "123", currentRating: 1610, avatar: 'https://i.pravatar.cc/150?u=user-6', role: Role.PLAYER, birthDate: "2007-04-12", gender: Gender.FEMALE },
  { id: 'user-7', name: "Lucas Martins", email: "lucas@email.com", password: "123", currentRating: 1580, avatar: 'https://i.pravatar.cc/150?u=user-7', role: Role.PLAYER, birthDate: "1980-07-25", gender: Gender.MALE },
  { id: 'user-8', name: "Beatriz Ferreira", email: "beatriz@email.com", password: "123", currentRating: 1550, avatar: 'https://i.pravatar.cc/150?u=user-8', role: Role.PLAYER, birthDate: "1999-02-14", gender: Gender.FEMALE },
  { id: 'user-admin-1', name: "Admin Roberto", email: "admin@email.com", password: "123", currentRating: 2000, avatar: 'https://i.pravatar.cc/150?u=user-admin-1', role: Role.CLUB_ADMIN, clubId: 'club-1', birthDate: "1975-01-01", gender: Gender.MALE },
  ...FEMALE_YOUTH_PLAYERS,
  ...ABSOLUTO_C_PLAYERS,
];

export const CLUBS: Club[] = [
  { id: 'club-1', name: "Club Tênis SP", logo: 'https://picsum.photos/seed/clubsp/100/100', adminId: 'user-admin-1', subscription: SubscriptionPlan.PRO, discountRules: [{from: 2, discount: 0.10}, {from: 3, discount: 0.15}] },
  { id: 'club-2', name: "Rio Spin Masters", logo: 'https://picsum.photos/seed/clubrio/100/100', adminId: 'user-admin-2', subscription: SubscriptionPlan.FREE, discountRules: [] },
];

export const TOURNAMENT_EVENTS: TournamentEvent[] = [
  {
    id: 'event-1',
    name: "Torneio de Verão 2025",
    startDate: "2025-01-15",
    location: "São Paulo",
    club: CLUBS[0],
  },
  {
    id: 'event-2',
    name: "Copa Carioca de Tênis de Mesa",
    startDate: "2025-02-20",
    location: "Rio de Janeiro",
    club: CLUBS[0],
  },
  {
    id: 'event-3',
    name: "Desafio de Outono",
    startDate: "2025-03-10",
    location: "Belo Horizonte",
    club: CLUBS[0],
  }
];

export const TOURNAMENT_CATEGORIES: TournamentCategory[] = [
    {
        id: 'cat-1',
        eventId: 'event-1',
        name: 'Absoluto A',
        format: TournamentFormat.ELIMINATORIA_SIMPLES,
        status: TournamentStatus.IN_PROGRESS,
        gender: Gender.MALE,
        ratingMin: 1700,
        maxParticipants: 8,
        entryFee: 100,
        kFactor: 32,
        registrations: USERS.filter(u => u.role === Role.PLAYER && u.gender === Gender.MALE && u.currentRating >= 1700).slice(0, 2).map(u => ({ userId: u.id, status: RegistrationStatus.CONFIRMED, registeredAt: new Date().toISOString()})),
    },
    {
        id: 'cat-2',
        eventId: 'event-1',
        name: 'Sub-19 Feminino',
        format: TournamentFormat.GRUPOS_E_ELIMINATORIA,
        status: TournamentStatus.REGISTRATION,
        gender: Gender.FEMALE,
        ageMax: 19,
        maxParticipants: 16,
        entryFee: 50,
        kFactor: 32,
        registrations: FEMALE_YOUTH_PLAYERS.map(u => ({ userId: u.id, status: RegistrationStatus.CONFIRMED, registeredAt: new Date().toISOString() })),
    },
    {
        id: 'cat-3',
        eventId: 'event-2',
        name: 'Veterano 40+',
        format: TournamentFormat.TODOS_CONTRA_TODOS,
        status: TournamentStatus.REGISTRATION,
        gender: 'MIXED',
        ageMin: 40,
        maxParticipants: 12,
        entryFee: 60,
        kFactor: 24,
        registrations: [],
    },
    {
        id: 'cat-4',
        eventId: 'event-2',
        name: 'Absoluto C Masculino',
        format: TournamentFormat.ELIMINATORIA_SIMPLES,
        status: TournamentStatus.REGISTRATION,
        gender: Gender.MALE,
        ratingMin: 1000,
        ratingMax: 2000,
        maxParticipants: 16,
        entryFee: 70,
        kFactor: 32,
        registrations: ABSOLUTO_C_PLAYERS.map(u => ({ userId: u.id, status: RegistrationStatus.CONFIRMED, registeredAt: new Date().toISOString() })),
    },
    {
        id: 'cat-5',
        eventId: 'event-3',
        name: 'Absoluto D Misto',
        format: TournamentFormat.GRUPOS_E_ELIMINATORIA,
        status: TournamentStatus.REGISTRATION,
        gender: 'MIXED',
        ratingMax: 1800,
        maxParticipants: 16,
        entryFee: 70,
        kFactor: 32,
        registrations: ABSOLUTO_C_PLAYERS.map(u => ({ userId: u.id, status: RegistrationStatus.CONFIRMED, registeredAt: new Date().toISOString() })),
    }
];

export const INITIAL_MATCHES_CAT_1: Match[] = [
  // Absoluto A - Single Elimination
  // Round 1
  { id: 'm-c1-1-1', categoryId: 'cat-1', round: 1, matchInRound: 1, player1Id: 'user-1', player2Id: 'user-3', winnerId: null, player1Score: null, player2Score: null, status: 'SCHEDULED', stage: 'KNOCKOUT', player1RatingBefore: null, player1RatingAfter: null, player2RatingBefore: null, player2RatingAfter: null },
];