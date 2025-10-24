import { TOURNAMENT_EVENTS, USERS, INITIAL_MATCHES_CAT_1, CLUBS, TOURNAMENT_CATEGORIES } from './constants';
import { TournamentEvent, User, Match, UserSession, Role, PlayerRegistration, RegistrationStatus, Club, TournamentStatus, Group, TournamentCategory, Gender, TournamentFormat, CartItem, SubscriptionPlan, DiscountRule, RatingHistory, PlayerStats, ClubStats, RecentMatch } from './types';

const EVENTS_KEY = 'tournament_events';
const CATEGORIES_KEY = 'tournament_categories';
const USERS_KEY = 'users';
const CLUBS_KEY = 'clubs';
const SESSION_KEY = 'user_session';
const CART_KEY = 'shopping_cart';
const CBTM_CATEGORIES_KEY = 'cbtm_categories_table';
const RATING_HISTORY_KEY = 'rating_history';
const getMatchesKey = (categoryId: string) => `matches_${categoryId}`;
const getGroupsKey = (categoryId: string) => `groups_${categoryId}`;

// --- Initialization ---
export const initializeDatabase = () => {
  const initIfNeeded = (key: string, data: any) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  if (!localStorage.getItem(CBTM_CATEGORIES_KEY)) {
      const CBTM_CATEGORIES_OLYMPIC_DATA: Partial<Omit<TournamentCategory, 'id' | 'eventId'>>[] = [
          { name: 'Sub-9', ageMax: 9, gender: Gender.MALE },
          { name: 'Sub-9', ageMax: 9, gender: Gender.FEMALE },
          { name: 'Sub-13', ageMin: 12, ageMax: 13, gender: Gender.MALE },
          { name: 'Sub-13', ageMin: 12, ageMax: 13, gender: Gender.FEMALE },
          { name: 'Sub-19', ageMin: 16, ageMax: 19, gender: Gender.MALE },
          { name: 'Sub-19', ageMin: 16, ageMax: 19, gender: Gender.FEMALE },
          { name: 'Absoluto A (A+B)', ratingMin: 2700, gender: Gender.MALE },
          { name: 'Veterano 40', ageMin: 40, ageMax: 49, gender: Gender.MALE },
          { name: 'Veterano 50', ageMin: 50, ageMax: 59, gender: Gender.MALE },
      ];
      CBTM_CATEGORIES_OLYMPIC_DATA.forEach(cat => {
          cat.name = `${cat.name} ${cat.gender === Gender.MALE ? 'Masculino' : 'Feminino'}`;
          cat.format = TournamentFormat.GRUPOS_E_ELIMINATORIA;
          cat.maxParticipants = 32;
          cat.entryFee = 50;
          cat.startTime = "09:00";
          cat.playersPerGroup = 4;
          cat.kFactor = 32;
      });
       initIfNeeded(CBTM_CATEGORIES_KEY, CBTM_CATEGORIES_OLYMPIC_DATA);
  }


  initIfNeeded(EVENTS_KEY, TOURNAMENT_EVENTS);
  initIfNeeded(CATEGORIES_KEY, TOURNAMENT_CATEGORIES);
  initIfNeeded(USERS_KEY, USERS);
  initIfNeeded(CLUBS_KEY, CLUBS);
  initIfNeeded(RATING_HISTORY_KEY, []);
  initIfNeeded(getMatchesKey('cat-1'), INITIAL_MATCHES_CAT_1);
};

// --- Auth ---
export const login = (email: string, password?: string): User | null => {
  const user = getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user && user.password === password) {
      const session: UserSession = { userId: user.id, role: user.role };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return user;
  }
  return null;
};

export const registerPlayer = (data: Partial<User>): User => {
    const allUsers = getUsers();
    if (allUsers.some(u => u.email.toLowerCase() === data.email?.toLowerCase())) {
        throw new Error("Este e-mail já está cadastrado.");
    }
    const newUser: User = {
        id: `user-${new Date().getTime()}`,
        name: data.name!,
        email: data.email!,
        password: data.password!,
        currentRating: 1000,
        avatar: `https://i.pravatar.cc/150?u=user-${new Date().getTime()}`,
        role: Role.PLAYER,
        birthDate: data.birthDate!,
        gender: data.gender!,
        city: data.city,
        phone: data.phone,
        bio: data.bio
    };
    allUsers.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
    return newUser;
};

export const registerClub = (clubData: Partial<Club>, adminData: Partial<User>): { club: Club, admin: User } => {
    const allUsers = getUsers();
    const allClubs = getClubs();
    
    if (allUsers.some(u => u.email.toLowerCase() === adminData.email?.toLowerCase())) {
        throw new Error("Este e-mail de administrador já está cadastrado.");
    }
     if (allClubs.some(c => c.name.toLowerCase() === clubData.name?.toLowerCase())) {
        throw new Error("Já existe um clube com este nome.");
    }

    const newAdmin: User = {
        id: `user-admin-${new Date().getTime()}`,
        name: adminData.name!,
        email: adminData.email!,
        password: adminData.password!,
        currentRating: 1000,
        avatar: `https://i.pravatar.cc/150?u=user-admin-${new Date().getTime()}`,
        role: Role.CLUB_ADMIN,
        birthDate: adminData.birthDate!,
        gender: adminData.gender!,
    };
    
    const newClub: Club = {
        id: `club-${new Date().getTime()}`,
        name: clubData.name!,
        adminId: newAdmin.id,
        subscription: clubData.subscription || SubscriptionPlan.FREE,
        discountRules: [],
        description: clubData.description,
        address: clubData.address,
        city: clubData.city,
        state: clubData.state,
        phone: clubData.phone,
        email: clubData.email,
        website: clubData.website,
    };
    
    newAdmin.clubId = newClub.id;
    allUsers.push(newAdmin);
    allClubs.push(newClub);
    localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
    localStorage.setItem(CLUBS_KEY, JSON.stringify(allClubs));
    return { club: newClub, admin: newAdmin };
};


export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(CART_KEY);
};

export const getCurrentUserSession = (): UserSession | null => {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};

// --- Data Getters ---
export const getTournamentEvents = (): TournamentEvent[] => JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
export const getTournamentCategories = (eventId?: string): TournamentCategory[] => {
    const allCategories: TournamentCategory[] = JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]');
    return eventId ? allCategories.filter(c => c.eventId === eventId) : allCategories;
}
export const getOfficialCategories = (): Partial<Omit<TournamentCategory, 'id' | 'eventId'>>[] => JSON.parse(localStorage.getItem(CBTM_CATEGORIES_KEY) || '[]');
export const getCategoryById = (categoryId: string): TournamentCategory | undefined => getTournamentCategories().find(c => c.id === categoryId);
export const getEventById = (eventId: string): TournamentEvent | undefined => getTournamentEvents().find(e => e.id === eventId);
export const getUsers = (): User[] => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
export const getUserById = (userId: string): User | undefined => getUsers().find(u => u.id === userId);
export const getClubs = (): Club[] => JSON.parse(localStorage.getItem(CLUBS_KEY) || '[]');
export const getClubById = (clubId: string): Club | undefined => getClubs().find(c => c.id === clubId);
export const getClubByAdminId = (adminId: string): Club | undefined => getClubs().find(c => c.adminId === adminId);
export const getMatches = (categoryId: string): Match[] => JSON.parse(localStorage.getItem(getMatchesKey(categoryId)) || '[]');
export const getGroups = (categoryId: string): Group[] => JSON.parse(localStorage.getItem(getGroupsKey(categoryId)) || '[]');
export const getRatingHistory = (userId?: string): RatingHistory[] => {
    const history: RatingHistory[] = JSON.parse(localStorage.getItem(RATING_HISTORY_KEY) || '[]');
    return userId ? history.filter(r => r.userId === userId) : history;
}

// --- Cart Logic ---
export const getCart = (): CartItem[] => JSON.parse(localStorage.getItem(CART_KEY) || '[]');
export const addToCart = (categoryId: string, eventId: string): CartItem[] => {
    const cart = getCart();
    if (!cart.some(item => item.categoryId === categoryId)) {
        cart.push({ categoryId, eventId });
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
    return cart;
}
export const removeFromCart = (categoryId: string): CartItem[] => {
    let cart = getCart().filter(item => item.categoryId !== categoryId);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    return cart;
}
export const clearCart = (): void => localStorage.removeItem(CART_KEY);
export const checkout = (userId: string): boolean => {
    const cart = getCart();
    if (cart.length === 0) return false;
    let allSucceeded = cart.every(item => registerPlayerForCategory(item.categoryId, userId));
    if (allSucceeded) {
        clearCart();
        return true;
    }
    return false;
}

// --- Eligibility Check ---
export const isPlayerEligible = (player: User, category: TournamentCategory): boolean => {
    const playerAge = new Date().getFullYear() - new Date(player.birthDate).getFullYear();
    if (category.gender !== 'MIXED' && player.gender !== category.gender) return false;
    if (category.ageMin && playerAge < category.ageMin) return false;
    if (category.ageMax && playerAge > category.ageMax) return false;
    if (category.ratingMin && player.currentRating < category.ratingMin) return false;
    if (category.ratingMax && player.currentRating > category.ratingMax) return false;
    return true;
}

// --- Data Setters ---
const updateAllUsers = (users: User[]) => localStorage.setItem(USERS_KEY, JSON.stringify(users));
const updateAllCategories = (categories: TournamentCategory[]) => localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
const updateAllClubs = (clubs: Club[]) => localStorage.setItem(CLUBS_KEY, JSON.stringify(clubs));

const addRatingHistory = (record: Omit<RatingHistory, 'id'>) => {
    const history = getRatingHistory();
    const newRecord: RatingHistory = { ...record, id: `rh-${new Date().getTime()}` };
    history.push(newRecord);
    localStorage.setItem(RATING_HISTORY_KEY, JSON.stringify(history));
}

export const updateMatchResultAndAdvance = (categoryId: string, matchId: string, setScores: {p1: number, p2: number}[]): TournamentCategory | null => {
    let allCategories = getTournamentCategories();
    const categoryIndex = allCategories.findIndex(c => c.id === categoryId);
    if(categoryIndex === -1) return null;

    let category = allCategories[categoryIndex];
    let matches = getMatches(categoryId);
    const matchIndex = matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return null;

    let allUsers = getUsers();
    const player1 = allUsers.find(u => u.id === matches[matchIndex].player1Id);
    const player2 = allUsers.find(u => u.id === matches[matchIndex].player2Id);
    if (!player1 || !player2) return null; // Can't process if players are missing

    // 1. Update match score
    const updatedMatch = { ...matches[matchIndex] };
    let p1SetsWon = 0;
    let p2SetsWon = 0;
    setScores.forEach(score => {
        if (score.p1 > score.p2) p1SetsWon++;
        else p2SetsWon++;
    });
    
    updatedMatch.setScores = setScores;
    updatedMatch.player1Score = p1SetsWon;
    updatedMatch.player2Score = p2SetsWon;
    const winnerIsP1 = p1SetsWon > p2SetsWon;
    updatedMatch.winnerId = winnerIsP1 ? updatedMatch.player1Id : updatedMatch.player2Id;
    updatedMatch.status = 'COMPLETED';
    
    // --- ELO Calculation ---
    const kFactor = category.kFactor || 32;
    const rating1 = player1.currentRating;
    const rating2 = player2.currentRating;
    
    updatedMatch.player1RatingBefore = rating1;
    updatedMatch.player2RatingBefore = rating2;

    const expectedScore1 = 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
    const expectedScore2 = 1 - expectedScore1;
    
    const actualScore1 = winnerIsP1 ? 1 : 0;
    const actualScore2 = winnerIsP1 ? 0 : 1;

    const newRating1 = Math.round(rating1 + kFactor * (actualScore1 - expectedScore1));
    const newRating2 = Math.round(rating2 + kFactor * (actualScore2 - expectedScore2));

    updatedMatch.player1RatingAfter = newRating1;
    updatedMatch.player2RatingAfter = newRating2;

    // Update users' ratings
    const user1Index = allUsers.findIndex(u => u.id === player1.id);
    const user2Index = allUsers.findIndex(u => u.id === player2.id);
    allUsers[user1Index].currentRating = newRating1;
    allUsers[user2Index].currentRating = newRating2;
    
    updateAllUsers(allUsers);
    
    // Add to rating history
    const historyDate = new Date().toISOString();
    addRatingHistory({ userId: player1.id, matchId, categoryId, ratingBefore: rating1, ratingAfter: newRating1, change: newRating1 - rating1, date: historyDate });
    addRatingHistory({ userId: player2.id, matchId, categoryId, ratingBefore: rating2, ratingAfter: newRating2, change: newRating2 - rating2, date: historyDate });
    // --- End ELO Calculation ---

    matches[matchIndex] = updatedMatch;

    // 2. If it's a knockout match, advance the winner & check for completion
    if (updatedMatch.stage === 'KNOCKOUT' && updatedMatch.winnerId) {
        const knockoutMatches = matches.filter(m => m.stage === 'KNOCKOUT');
        const totalRounds = Math.max(...knockoutMatches.map(m => m.round));
        
        if (updatedMatch.round === totalRounds) {
            category.status = TournamentStatus.COMPLETED;
        } else {
            const nextRound = updatedMatch.round + 1;
            const nextMatchInRound = Math.ceil(updatedMatch.matchInRound / 2);
            const nextMatchIndex = matches.findIndex(m => m.round === nextRound && m.matchInRound === nextMatchInRound);
            
            if (nextMatchIndex !== -1) {
                const isPlayer1Slot = updatedMatch.matchInRound % 2 !== 0;
                if (isPlayer1Slot) matches[nextMatchIndex].player1Id = updatedMatch.winnerId;
                else matches[nextMatchIndex].player2Id = updatedMatch.winnerId;
            }
        }
    }

    // 3. If it's a group match, check if the group stage is over
    if (updatedMatch.stage === 'GROUP') {
        const groupMatches = matches.filter(m => m.stage === 'GROUP');
        if (groupMatches.every(m => m.status === 'COMPLETED')) {
            const groups = getGroups(categoryId).sort((a,b) => a.name.localeCompare(b.name));
            const qualifiers: User[] = [];

            groups.forEach(group => {
                const playerStats = group.playerIds.map(playerId => ({
                    playerId,
                    wins: matches.filter(m => m.groupId === group.id && m.winnerId === playerId).length,
                })).sort((a, b) => b.wins - a.wins);

                const player1 = getUserById(playerStats[0].playerId);
                if(player1) qualifiers.push(player1);
                
                if (playerStats[1]) {
                    const player2 = getUserById(playerStats[1].playerId);
                    if(player2) qualifiers.push(player2);
                }
            });

            const seededQualifiers = qualifiers.sort((a, b) => b.currentRating - a.currentRating);
            const newKnockoutMatches = generateKnockoutBracket(categoryId, seededQualifiers);
            
            matches = [...groupMatches, ...newKnockoutMatches];
            category.status = TournamentStatus.IN_PROGRESS;
        }
    }
    
    // Save everything
    localStorage.setItem(getMatchesKey(categoryId), JSON.stringify(matches));
    allCategories[categoryIndex] = category;
    updateAllCategories(allCategories);
    
    return category;
};


export const addTournamentEvent = (data: Omit<TournamentEvent, 'id' | 'club'>, club: Club): TournamentEvent => {
    if (club.subscription === SubscriptionPlan.FREE && getTournamentEvents().filter(e => e.club.id === club.id).length >= 1) {
        throw new Error("Plano Gratuito permite apenas 1 evento por vez. Faça um upgrade para o Plano Pro.");
    }
    const allEvents = getTournamentEvents();
    const newEvent: TournamentEvent = { ...data, id: `event-${new Date().getTime()}`, club };
    allEvents.push(newEvent);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(allEvents));
    return newEvent;
}

export const updateTournamentEvent = (eventId: string, details: Partial<Omit<TournamentEvent, 'id' | 'club'>>): TournamentEvent => {
    const allEvents = getTournamentEvents();
    const eventIndex = allEvents.findIndex(e => e.id === eventId);
    if (eventIndex === -1) throw new Error("Evento não encontrado.");

    const updatedEvent = { ...allEvents[eventIndex], ...details };
    allEvents[eventIndex] = updatedEvent;
    localStorage.setItem(EVENTS_KEY, JSON.stringify(allEvents));
    return updatedEvent;
}

export const addCategoryToEvent = (data: Omit<TournamentCategory, 'id' | 'registrations' | 'status'>): TournamentCategory => {
    const event = getEventById(data.eventId);
    if (!event) throw new Error("Evento não encontrado.");

    if (event.club.subscription === SubscriptionPlan.FREE && getTournamentCategories(data.eventId).length >= 5) {
        throw new Error("Plano Gratuito permite um máximo de 5 categorias por evento. Faça um upgrade.");
    }
    const allCategories = getTournamentCategories();
    const newCategory: TournamentCategory = { ...data, id: `cat-${new Date().getTime()}`, registrations: [], status: TournamentStatus.REGISTRATION };
    allCategories.push(newCategory);
    updateAllCategories(allCategories);
    return newCategory;
}

export const registerPlayerForCategory = (categoryId: string, userId: string): boolean => {
    const allCategories = getTournamentCategories();
    const categoryIndex = allCategories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) return false;
    const category = allCategories[categoryIndex];
    if (category.status !== TournamentStatus.REGISTRATION) return false;
    if (category.registrations.some(r => r.userId === userId)) return true;
    if (category.registrations.length >= category.maxParticipants) return false;

    category.registrations.push({ userId, status: RegistrationStatus.REGISTERED, registeredAt: new Date().toISOString() });
    updateAllCategories(allCategories);
    return true;
}

export const cancelPlayerRegistration = (categoryId: string, userId: string): boolean => {
    const allCategories = getTournamentCategories();
    const categoryIndex = allCategories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) return false;
    const category = allCategories[categoryIndex];
    // Check deadline
    const event = getEventById(category.eventId);
    if (event) {
        const deadline = new Date(event.startDate);
        deadline.setDate(deadline.getDate() - 5);
        if (new Date() > deadline) {
            console.error("Cancellation deadline has passed.");
            return false;
        }
    }
    const registrationIndex = category.registrations.findIndex(r => r.userId === userId);
    if (registrationIndex === -1) return true;
    category.registrations.splice(registrationIndex, 1);
    updateAllCategories(allCategories);
    return true;
}

export const closeRegistration = (categoryId: string): TournamentCategory => {
    const allCategories = getTournamentCategories();
    const categoryIndex = allCategories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) throw new Error("Categoria não encontrada.");
    const category = { ...allCategories[categoryIndex] };
    if (category.status !== TournamentStatus.REGISTRATION) throw new Error("As inscrições para esta categoria não estão abertas.");
    
    category.status = TournamentStatus.REGISTRATION_CLOSED;
    allCategories[categoryIndex] = category;
    updateAllCategories(allCategories);
    return category;
}

export const reopenRegistration = (categoryId: string): TournamentCategory => {
    const allCategories = getTournamentCategories();
    const categoryIndex = allCategories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) throw new Error("Categoria não encontrada.");
    const category = { ...allCategories[categoryIndex] };
    if (category.status !== TournamentStatus.REGISTRATION_CLOSED) throw new Error("Apenas categorias com inscrições encerradas podem ser reabertas.");
    
    category.status = TournamentStatus.REGISTRATION;
    allCategories[categoryIndex] = category;
    updateAllCategories(allCategories);
    return category;
}

const generateKnockoutBracket = (categoryId: string, players: User[]): Match[] => {
    const numPlayers = players.length;
    if (numPlayers < 2) return [];

    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
    const playersInMainBracket = nextPowerOfTwo / 2;
    const playersInPreliminary = (numPlayers - playersInMainBracket);
    const numPreliminaryMatches = playersInPreliminary;
    
    const playersWithByes = players.slice(0, (nextPowerOfTwo) - numPlayers);
    const playersInPreliminaryList = players.slice((nextPowerOfTwo) - numPlayers);
    
    const knockoutMatches: Match[] = [];
    let roundCounter = 1;

    if (numPreliminaryMatches > 0) {
        for (let i = 0; i < numPreliminaryMatches; i++) {
            knockoutMatches.push({
                id: `m-k-${categoryId}-${roundCounter}-${i + 1}`,
                categoryId, round: roundCounter, matchInRound: i + 1,
                player1Id: playersInPreliminaryList[i].id,
                player2Id: playersInPreliminaryList[numPreliminaryMatches * 2 - 1 - i].id,
                winnerId: null, player1Score: null, player2Score: null, status: 'SCHEDULED', stage: 'KNOCKOUT'
            });
        }
        roundCounter++;
    }

    let currentBracketSize = playersInMainBracket;
    while (currentBracketSize >= 1) {
        const numMatchesInRound = currentBracketSize / 2;
        if (numMatchesInRound < 1) break;
        for (let i = 0; i < numMatchesInRound; i++) {
             knockoutMatches.push({
                id: `m-k-${categoryId}-${roundCounter}-${i + 1}`,
                categoryId, round: roundCounter, matchInRound: i + 1,
                player1Id: null, player2Id: null, winnerId: null,
                player1Score: null, player2Score: null, status: 'SCHEDULED', stage: 'KNOCKOUT'
            });
        }
        currentBracketSize /= 2;
        roundCounter++;
    }

    const mainRoundMatches = knockoutMatches.filter(m => m.round === (numPreliminaryMatches > 0 ? 2 : 1));
    let byePlayerIndex = 0;
    for (let i = 0; i < mainRoundMatches.length; i++) {
        if (mainRoundMatches[i].player1Id === null && playersWithByes[byePlayerIndex]) {
            mainRoundMatches[i].player1Id = playersWithByes[byePlayerIndex++].id;
        }
        if (mainRoundMatches[i].player2Id === null && playersWithByes[byePlayerIndex]) {
            mainRoundMatches[i].player2Id = playersWithByes[byePlayerIndex++].id;
        }
    }

    return knockoutMatches;
}

export const startCategory = (categoryId: string): TournamentCategory => {
    const allCategories = getTournamentCategories();
    const categoryIndex = allCategories.findIndex(c => c.id === categoryId);
    if (categoryIndex === -1) throw new Error("Categoria não encontrada.");
    const category = { ...allCategories[categoryIndex] };
    if (category.status !== TournamentStatus.REGISTRATION_CLOSED) throw new Error("As inscrições precisam ser encerradas.");

    const allUsers = getUsers();
    const registeredPlayerIds = category.registrations.map(r => r.userId);
    const seededPlayers = allUsers.filter(u => registeredPlayerIds.includes(u.id)).sort((a, b) => b.currentRating - a.currentRating);
    if (seededPlayers.length < 2) throw new Error("São necessários pelo menos 2 jogadores.");

    if (category.format === TournamentFormat.ELIMINATORIA_SIMPLES) {
        localStorage.setItem(getMatchesKey(categoryId), JSON.stringify(generateKnockoutBracket(categoryId, seededPlayers)));
        category.status = TournamentStatus.IN_PROGRESS;
    } 
    else if (category.format === TournamentFormat.GRUPOS_E_ELIMINATORIA) {
        const groupSize = category.playersPerGroup || 4;
        const numGroups = Math.ceil(seededPlayers.length / groupSize);
        const groups: Group[] = Array.from({ length: numGroups }, (_, i) => ({ id: `g-${categoryId}-${i + 1}`, name: `Grupo ${String.fromCharCode(65 + i)}`, categoryId, playerIds: [] }));

        seededPlayers.forEach((player, i) => {
            const groupIndex = i % numGroups;
            const targetGroupIndex = numGroups > 1 && Math.floor(i / numGroups) % 2 !== 0 ? numGroups - 1 - groupIndex : groupIndex;
            groups[targetGroupIndex].playerIds.push(player.id);
        });

        const groupMatches: Match[] = [];
        groups.forEach(group => {
            for (let i = 0; i < group.playerIds.length; i++) {
                for (let j = i + 1; j < group.playerIds.length; j++) {
                    groupMatches.push({
                        id: `m-${group.id}-${i}-${j}`, categoryId, round: 0,
                        matchInRound: groupMatches.length + 1,
                        player1Id: group.playerIds[i], player2Id: group.playerIds[j],
                        winnerId: null, player1Score: null, player2Score: null,
                        status: 'SCHEDULED', stage: 'GROUP', groupId: group.id,
                    });
                }
            }
        });

        const numQualifiers = Math.min(seededPlayers.length, numGroups * 2);
        if (numQualifiers < 2) throw new Error(`Pelo menos 2 jogadores precisam se qualificar.`);
        
        const dummyQualifiers = Array(numQualifiers).fill(null).map((_, i) => ({ id: `q-${i}`, name: 'Q', currentRating: 0, role: Role.PLAYER, birthDate: '', gender: Gender.MALE, email: '' }));
        const knockoutMatches = generateKnockoutBracket(categoryId, dummyQualifiers);
        knockoutMatches.forEach(match => { match.player1Id = null; match.player2Id = null; });

        localStorage.setItem(getGroupsKey(categoryId), JSON.stringify(groups));
        localStorage.setItem(getMatchesKey(categoryId), JSON.stringify([...groupMatches, ...knockoutMatches]));
        category.status = TournamentStatus.GROUP_STAGE;
    }
    
    allCategories[categoryIndex] = category;
    updateAllCategories(allCategories);
    return category;
};

// --- Profile Updates & Subscription ---
export const updateClubDetails = (clubId: string, details: Partial<Club>): Club | null => {
    const allClubs = getClubs();
    const clubIndex = allClubs.findIndex(c => c.id === clubId);
    if (clubIndex === -1) return null;
    allClubs[clubIndex] = { ...allClubs[clubIndex], ...details };
    localStorage.setItem(CLUBS_KEY, JSON.stringify(allClubs));
    const allEvents = getTournamentEvents().map(event => event.club.id === clubId ? { ...event, club: allClubs[clubIndex] } : event);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(allEvents));
    return allClubs[clubIndex];
}

export const updateUserDetails = (userId: string, details: Partial<User>): User | null => {
    const allUsers = getUsers();
    const userIndex = allUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;
    allUsers[userIndex] = { ...allUsers[userIndex], ...details };
    updateAllUsers(allUsers);
    return allUsers[userIndex];
}

export const upgradeClubSubscription = (clubId: string): Club | null => {
    const allClubs = getClubs();
    const clubIndex = allClubs.findIndex(c => c.id === clubId);
    if (clubIndex === -1) return null;
    allClubs[clubIndex].subscription = SubscriptionPlan.PRO;
    localStorage.setItem(CLUBS_KEY, JSON.stringify(allClubs));
    const allEvents = getTournamentEvents().map(event => event.club.id === clubId ? { ...event, club: { ...event.club, subscription: SubscriptionPlan.PRO } } : event);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(allEvents));
    return allClubs[clubIndex];
}

export const transferClubAdminship = (clubId: string, newAdminEmail: string, currentAdminId: string): {success: boolean} => {
    if (!newAdminEmail) throw new Error("O e-mail do novo administrador é obrigatório.");
    
    const allUsers = getUsers();
    const allClubs = getClubs();

    const newAdminIndex = allUsers.findIndex(u => u.email.toLowerCase() === newAdminEmail.toLowerCase());
    if (newAdminIndex === -1) throw new Error("Usuário não encontrado com este e-mail.");
    
    const currentAdminIndex = allUsers.findIndex(u => u.id === currentAdminId);
    if (currentAdminIndex === -1) throw new Error("Administrador atual não encontrado.");

    if (allUsers[newAdminIndex].id === currentAdminId) throw new Error("Você não pode transferir a administração para si mesmo.");
    if (allUsers[newAdminIndex].role === Role.CLUB_ADMIN) throw new Error("Este usuário já é administrador de outro clube.");
    
    const clubIndex = allClubs.findIndex(c => c.id === clubId);
    if (clubIndex === -1) throw new Error("Clube não encontrado.");

    // Perform transfer
    allUsers[currentAdminIndex].role = Role.PLAYER;
    delete allUsers[currentAdminIndex].clubId;

    allUsers[newAdminIndex].role = Role.CLUB_ADMIN;
    allUsers[newAdminIndex].clubId = clubId;
    
    allClubs[clubIndex].adminId = allUsers[newAdminIndex].id;

    updateAllUsers(allUsers);
    updateAllClubs(allClubs);

    return { success: true };
}


// --- Deletion ---
export const deleteTournamentCategory = (categoryId: string): void => {
    updateAllCategories(getTournamentCategories().filter(c => c.id !== categoryId));
    localStorage.removeItem(getMatchesKey(categoryId));
    localStorage.removeItem(getGroupsKey(categoryId));
}

export const deleteTournamentEvent = (eventId: string): void => {
    getTournamentCategories(eventId).forEach(cat => deleteTournamentCategory(cat.id));
    localStorage.setItem(EVENTS_KEY, JSON.stringify(getTournamentEvents().filter(e => e.id !== eventId)));
}

// --- Dashboard Stats ---
export const getPlayerStats = (userId: string): PlayerStats => {
    const user = getUserById(userId);
    if (!user) return { rating: 0, wins: 0, losses: 0, totalGames: 0 };
    
    let wins = 0;
    let losses = 0;
    const allCategories = getTournamentCategories();
    allCategories.forEach(cat => {
        const matches = getMatches(cat.id);
        matches.forEach(match => {
            if (match.status === 'COMPLETED' && (match.player1Id === userId || match.player2Id === userId)) {
                if (match.winnerId === userId) {
                    wins++;
                } else {
                    losses++;
                }
            }
        });
    });

    return {
        rating: user.currentRating,
        wins,
        losses,
        totalGames: wins + losses,
    };
};

export const getClubStats = (clubId: string): ClubStats => {
    const clubEvents = getTournamentEvents().filter(e => e.club.id === clubId);
    const activeEvents = clubEvents.filter(e => {
        const categories = getTournamentCategories(e.id);
        return categories.some(c => c.status !== TournamentStatus.COMPLETED);
    }).length;
    
    const totalCategories = getTournamentCategories().filter(c => clubEvents.some(e => e.id === c.eventId)).length;
    const totalRegistrations = getTournamentCategories().filter(c => clubEvents.some(e => e.id === c.eventId))
        .reduce((sum, cat) => sum + cat.registrations.length, 0);

    return {
        activeEvents,
        totalCategories,
        totalRegistrations,
    };
};

export const getRecentPlayerMatches = (userId: string): RecentMatch[] => {
    const history = getRatingHistory(userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    
    return history.map(h => {
        const match = getMatches(h.categoryId).find(m => m.id === h.matchId);
        if (!match) return null;
        
        const isPlayer1 = match.player1Id === userId;
        const opponentId = isPlayer1 ? match.player2Id : match.player1Id;
        const opponent = getUserById(opponentId!);
        const category = getCategoryById(h.categoryId);

        return {
            matchId: match.id,
            categoryName: category?.name || 'Desconhecido',
            opponent: opponent!,
            result: match.winnerId === userId ? 'win' : 'loss',
            playerScore: (isPlayer1 ? match.player1Score : match.player2Score) || 0,
            opponentScore: (isPlayer1 ? match.player2Score : match.player1Score) || 0,
            ratingChange: h.change,
        };
    }).filter((m): m is RecentMatch => m !== null && !!m.opponent);
};