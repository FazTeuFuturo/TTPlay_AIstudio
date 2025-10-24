import { User, Club, TournamentEvent, Match, TournamentCategory, TournamentFormat, TournamentStatus, Role, RegistrationStatus, Gender, SubscriptionPlan } from './types';

// Users are now managed by Supabase Auth and the 'users' table. 
// These test user constants are no longer needed and have been removed to avoid conflicts.

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
        registrations: [], // Registrations are now managed dynamically
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
        registrations: [], // Registrations are now managed dynamically
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
        registrations: [], // Registrations are now managed dynamically
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
        registrations: [], // Registrations are now managed dynamically
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
        registrations: [], // Registrations are now managed dynamically
    }
];

export const INITIAL_MATCHES_CAT_1: Match[] = [
  // Absoluto A - Single Elimination
  // Round 1
  { id: 'm-c1-1-1', categoryId: 'cat-1', round: 1, matchInRound: 1, player1Id: 'user-1', player2Id: 'user-3', winnerId: null, player1Score: null, player2Score: null, status: 'SCHEDULED', stage: 'KNOCKOUT', player1RatingBefore: null, player1RatingAfter: null, player2RatingBefore: null, player2RatingAfter: null },
];
