export enum Role {
  PLAYER = 'PLAYER',
  CLUB_ADMIN = 'CLUB_ADMIN',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  currentRating: number;
  role: Role;
  clubId?: string;
  birthDate: string; // ISO String e.g., "1990-05-15"
  gender: Gender;
  // New profile fields
  bio?: string;
  city?: string;
  phone?: string;
  isTestUser?: boolean;
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  PRO = 'PRO',
}

export interface DiscountRule {
  from: number; // e.g., 2 for "from the 2nd item"
  discount: number; // e.g., 0.10 for 10%
}

export interface Club {
  id: string;
  name: string;
  logo?: string;
  adminId: string;
  subscription: SubscriptionPlan;
  discountRules: DiscountRule[];
  // New profile fields
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface TournamentEvent {
  id: string;
  name: string;
  startDate: string;
  location: string;
  club: Club;
}

export enum TournamentFormat {
  ELIMINATORIA_SIMPLES = 'ELIMINATORIA_SIMPLES',
  ELIMINATORIA_DUPLA = 'ELIMINATORIA_DUPLA',
  TODOS_CONTRA_TODOS = 'TODOS_CONTRA_TODOS',
  GRUPOS_E_ELIMINATORIA = 'GRUPOS_E_ELIMINATORIA',
}

export enum TournamentStatus {
  REGISTRATION = 'REGISTRATION',
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED', // New status
  GROUP_STAGE = 'GROUP_STAGE',
  KNOCKOUT_PENDING = 'KNOCKOUT_PENDING',
  IN_PROGRESS = 'IN_PROGRESS', // Knockout stage
  COMPLETED = 'COMPLETED',
}

export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',
  CONFIRMED = 'CONFIRMED',
  WAITING_LIST = 'WAITING_LIST',
}

export interface PlayerRegistration {
  userId: string;
  status: RegistrationStatus;
  registeredAt: string;
}


export interface TournamentCategory {
  id: string;
  eventId: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  gender: Gender | 'MIXED';
  ageMin?: number;
  ageMax?: number;
  ratingMin?: number;
  ratingMax?: number;
  maxParticipants: number;
  entryFee: number;
  registrations: PlayerRegistration[];
  startTime?: string; // e.g., "14:30"
  playersPerGroup?: number;
  numAdvancingFromGroup?: number;
  kFactor?: number;
}

export interface Match {
  id: string;
  categoryId: string;
  round: number;
  matchInRound: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  player1Score: number | null; // Final sets score
  player2Score: number | null; // Final sets score
  setScores?: { p1: number, p2: number }[]; // Detailed set points
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  stage: 'GROUP' | 'KNOCKOUT';
  groupId?: string;
  // ELO snapshot
  player1RatingBefore?: number;
  player2RatingBefore?: number;
  player1RatingAfter?: number;
  player2RatingAfter?: number;
}

export interface Group {
  id: string;
  name: string;
  categoryId: string; // Changed from tournamentId
  playerIds: string[];
}

export interface UserSession {
  userId: string;
  role: Role;
}

export interface CartItem {
  categoryId: string;
  eventId: string;
}

export interface RatingHistory {
  id: string;
  userId: string;
  matchId: string;
  categoryId: string;
  ratingBefore: number;
  ratingAfter: number;
  change: number;
  date: string;
}

// --- New Dashboard Types ---
export interface PlayerStats {
  rating: number;
  wins: number;
  losses: number;
  totalGames: number;
}

export interface ClubStats {
  activeEvents: number;
  totalCategories: number;
  totalRegistrations: number;
}

export interface RecentMatch {
  matchId: string;
  categoryName: string;
  opponent: User;
  result: 'win' | 'loss';
  playerScore: number;
  opponentScore: number;
  ratingChange: number;
}
