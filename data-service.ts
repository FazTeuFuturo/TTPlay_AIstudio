import { TOURNAMENT_EVENTS, INITIAL_MATCHES_CAT_1, CLUBS, TOURNAMENT_CATEGORIES } from './constants';
import { TournamentEvent, User, Match, UserSession, Role, PlayerRegistration, RegistrationStatus, Club, TournamentStatus, Group, TournamentCategory, Gender, TournamentFormat, CartItem, SubscriptionPlan, DiscountRule, RatingHistory, PlayerStats, ClubStats, RecentMatch, ClubMember, ClubMemberRole, ClubMemberStatus, ManagedClub, ClubMemberWithUser } from './types';
import { supabase } from './lib/supabaseClient';

const CART_KEY = 'shopping_cart';

// --- Helper Functions ---
export const isTestTournament = async (categoryId: string): Promise<boolean> => {
    const category = await getCategoryById(categoryId);
    if (!category) return false;

    const event = await getEventById(category.eventId);
    return event?.name.startsWith('[TESTE]') ?? false;
};

// --- Helper Functions for Data Mapping ---
const mapUserFromDb = (data: any): User => ({
    id: data.id,
    name: data.name,
    email: data.email,
    avatar: data.avatar,
    currentRating: data.current_rating,
    role: data.role,
    clubId: data.club_id,
    birthDate: data.birth_date,
    gender: data.gender,
    bio: data.bio,
    city: data.city,
    phone: data.phone,
    isTestUser: data.is_test_user,
});

const mapClubFromDb = (data: any): Club => ({
    id: data.id,
    name: data.name,
    logo: data.logo,
    adminId: data.admin_id,
    subscription: data.subscription,
    discountRules: data.discount_rules || [],
    description: data.description,
    address: data.address,
    city: data.city,
    state: data.state,
    phone: data.phone,
    email: data.email,
    website: data.website,
});

const mapEventFromDb = (data: any): TournamentEvent => ({
    id: data.id,
    name: data.name,
    startDate: data.start_date,
    location: data.location,
    club: data.clubs ? mapClubFromDb(data.clubs) : { id: data.club_id } as Club,
});

const mapCategoryFromDb = (data: any): TournamentCategory => ({
    id: data.id,
    eventId: data.event_id,
    name: data.name,
    format: data.format,
    status: data.status,
    gender: data.gender,
    ageMin: data.age_min,
    ageMax: data.age_max,
    ratingMin: data.rating_min,
    ratingMax: data.rating_max,
    maxParticipants: data.max_participants,
    entryFee: data.entry_fee,
    registrations: (data.player_registrations || []).map((reg: any) => ({
        userId: reg.user_id,
        status: reg.status,
        registeredAt: reg.registered_at,
    })),
    startTime: data.start_time,
    playersPerGroup: data.players_per_group,
    numAdvancingFromGroup: data.num_advancing_from_group,
    kFactor: data.k_factor,
});

const mapMatchFromDb = (data: any): Match => ({
    id: data.id,
    categoryId: data.category_id,
    round: data.round,
    matchInRound: data.match_in_round,
    player1Id: data.player1_id,
    player2Id: data.player2_id,
    winnerId: data.winner_id,
    player1Score: data.player1_score,
    player2Score: data.player2_score,
    setScores: data.set_scores,
    status: data.status,
    stage: data.stage,
    groupId: data.group_id,
    player1RatingBefore: data.player1_rating_before,
    player2RatingBefore: data.player2_rating_before,
    player1RatingAfter: data.player1_rating_after,
    player2RatingAfter: data.player2_rating_after,
});

const mapRatingHistoryFromDb = (data: any): RatingHistory => ({
    id: data.id,
    userId: data.user_id,
    matchId: data.match_id,
    categoryId: data.category_id,
    ratingBefore: data.rating_before,
    ratingAfter: data.rating_after,
    change: data.change,
    date: data.created_at,
});


// --- Auth ---
export const login = async (email: string, password?: string): Promise<User | null> => {
  if (!password) return null;
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !authData.user) {
    console.error('Login error:', error?.message);
    return null;
  }

  const userProfile = await getUserById(authData.user.id);
  
  if (!userProfile) {
    console.error('Error fetching user profile after login.');
    await supabase.auth.signOut();
    return null;
  }

  return userProfile;
};

export const registerPlayer = async (data: Partial<User>): Promise<User> => {
    const { email, password, name, birthDate, gender, city, phone, bio, avatar } = data;
    if (!email || !password || !name || !birthDate || !gender) {
        throw new Error("Campos obrigatórios ausentes.");
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (signUpError) {
        throw new Error(`Erro no cadastro: ${signUpError.message}`);
    }

    if (!authData.user) {
        throw new Error("Não foi possível criar o usuário.");
    }

    const { data: updatedUsers, error: updateError } = await supabase
        .from('users')
        .update({
            name,
            birth_date: birthDate,
            gender,
            city,
            phone,
            bio,
            avatar: avatar || `https://i.pravatar.cc/150?u=${authData.user.id}`,
        })
        .eq('id', authData.user.id)
        .select();
    
    if (updateError) {
        console.error("User created in auth, but profile update failed:", updateError.message);
        throw new Error("Erro ao salvar detalhes do perfil.");
    }

    if (!updatedUsers || updatedUsers.length === 0) {
        throw new Error("Falha ao recuperar o perfil atualizado.");
    }

    return mapUserFromDb(updatedUsers[0]);
};

export const registerClub = async (clubData: Partial<Club>, adminData: Partial<User>): Promise<{ club: Club, admin: User }> => {
    const { email, password, name, birthDate, gender } = adminData;
    if (!email || !password || !name || !birthDate || !gender || !clubData.name) {
        throw new Error("Campos obrigatórios ausentes para o clube ou o administrador.");
    }

    console.log('[REGISTER-CLUB] Iniciando cadastro de clube:', { email, clubName: clubData.name });

    // 1. Criar usuário no auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
            data: {
                name: name,
                role: Role.CLUB_ADMIN
            }
        }
    });

    if (signUpError) {
        console.error('[REGISTER-CLUB] Erro no signUp:', signUpError);
        throw new Error(`Erro ao cadastrar administrador: ${signUpError.message}`);
    }
    if (!authData.user) {
        throw new Error("Não foi possível criar o usuário administrador.");
    }
    
    const adminId = authData.user.id;
    console.log('[REGISTER-CLUB] Usuário criado:', adminId);

    // 2. Criar o clube (sem admin_id ainda, pois não é mais obrigatório no novo sistema)
    const { data: newClub, error: clubError } = await supabase
        .from('clubs')
        .insert({
            name: clubData.name!,
            admin_id: adminId, // Mantém por compatibilidade
            description: clubData.description,
            address: clubData.address,
            city: clubData.city,
            state: clubData.state,
            phone: clubData.phone,
            email: clubData.email,
            website: clubData.website,
            logo: clubData.logo
        })
        .select()
        .single();
    
    if (clubError) {
        console.error('[REGISTER-CLUB] Erro ao criar clube:', clubError);
        throw new Error(`Erro ao criar o clube: ${clubError.message}`);
    }

    console.log('[REGISTER-CLUB] Clube criado:', newClub.id);

    // 3. Atualizar perfil do admin com informações básicas
    const { data: updatedAdmins, error: adminUpdateError } = await supabase
        .from('users')
        .update({
            name,
            birth_date: birthDate,
            gender,
            role: Role.CLUB_ADMIN,
            club_id: newClub.id, // Mantém por compatibilidade
        })
        .eq('id', adminId)
        .select();
    
    if (adminUpdateError) {
        console.error('[REGISTER-CLUB] Erro ao atualizar admin:', adminUpdateError);
        throw new Error(`Erro ao atualizar perfil do administrador: ${adminUpdateError.message}`);
    }

    if (!updatedAdmins || updatedAdmins.length === 0) {
        throw new Error("Falha ao recuperar o perfil do admin atualizado.");
    }

    console.log('[REGISTER-CLUB] Perfil do admin atualizado');

    // 4. **NOVO**: Criar registro em club_members com role OWNER
    const { error: memberError } = await supabase
        .from('club_members')
        .insert({
            club_id: newClub.id,
            user_id: adminId,
            role: ClubMemberRole.OWNER,
            status: ClubMemberStatus.ACTIVE
        });
    
    if (memberError) {
        console.error('[REGISTER-CLUB] Erro ao criar membro:', memberError);
        // Não vamos lançar erro aqui para manter compatibilidade
        // throw new Error(`Erro ao criar registro de membro: ${memberError.message}`);
        console.warn('[REGISTER-CLUB] AVISO: Não foi possível criar registro em club_members. Sistema funcionará em modo legado.');
    } else {
        console.log('[REGISTER-CLUB] Registro em club_members criado com sucesso');
    }

    console.log('[REGISTER-CLUB] Cadastro completo!');
    return { club: mapClubFromDb(newClub), admin: mapUserFromDb(updatedAdmins[0]) };
};


export const logout = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem(CART_KEY); // Also clear local-only data
};

export const getCurrentUserSession = async (): Promise<UserSession | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: userProfile, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (error || !userProfile) {
    console.error("User session exists, but couldn't fetch profile/role.", error?.message);
    return null;
  }
  
  return { userId: session.user.id, role: userProfile.role as Role };
};

// --- Data Getters ---
export const getTournamentEvents = async (): Promise<TournamentEvent[]> => {
    const { data, error } = await supabase
        .from('tournament_events')
        .select('*, clubs(*)');

    if (error) {
        console.error("Error fetching tournament events:", error.message);
        return [];
    }

    return data.map(mapEventFromDb);
};

export const getTournamentCategories = async (eventId?: string): Promise<TournamentCategory[]> => {
    let query = supabase.from('tournament_categories').select('*, player_registrations(*)');

    if (eventId) {
        query = query.eq('event_id', eventId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching tournament categories:", error.message);
        return [];
    }

    return data.map(mapCategoryFromDb);
};

export const getCategoryById = async (categoryId: string): Promise<TournamentCategory | undefined> => {
    const { data, error } = await supabase.from('tournament_categories').select('*, player_registrations(*)').eq('id', categoryId).single();
    if (error || !data) {
        console.error("Error fetching category by ID:", error?.message);
        return undefined;
    }
    return mapCategoryFromDb(data);
};

export const getEventById = async (eventId: string): Promise<TournamentEvent | undefined> => {
    const { data, error } = await supabase.from('tournament_events').select('*, clubs(*)').eq('id', eventId).single();
    if (error || !data) {
        console.error("Error fetching event by ID:", error?.message);
        return undefined;
    }
    return mapEventFromDb(data);
}

export const getUserById = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error("Error fetching user by ID:", error.message);
        return null;
    }
    return mapUserFromDb(data);
};
export const getUsers = async (userIds?: string[]): Promise<User[]> => {
    let query = supabase.from('users').select('*');
    if (userIds && userIds.length > 0) {
        query = query.in('id', userIds);
    }
    const { data, error } = await query;
    if (error) {
        console.error("Error fetching users:", error.message);
        return [];
    }
    return data.map(mapUserFromDb);
};

export const searchUsers = async (searchTerm: string): Promise<User[]> => {
    if (!searchTerm || searchTerm.trim().length < 3) {
        return [];
    }

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(10);

    if (error) {
        console.error("Error searching users:", error.message);
        return [];
    }

    return data.map(mapUserFromDb);
};

export const getClubs = async (): Promise<Club[]> => {
    const { data, error } = await supabase.from('clubs').select('*');
    if (error) {
        console.error("Error fetching clubs:", error.message);
        return [];
    }
    return data.map(mapClubFromDb);
};

export const getClubById = async (clubId: string): Promise<Club | undefined> => {
    const { data, error } = await supabase.from('clubs').select('*').eq('id', clubId).single();
    if (error || !data) {
        console.error("Error fetching club by ID:", error?.message);
        return undefined;
    }
    return mapClubFromDb(data);
};

export const getClubByAdminId = async (adminId: string): Promise<Club | undefined> => {
    const { data, error } = await supabase.from('clubs').select('*').eq('admin_id', adminId).single();
    if (error || !data) {
        console.error("Error fetching club by Admin ID:", error?.message);
        return undefined;
    }
    return mapClubFromDb(data);
};
export const getMatches = async (categoryId: string): Promise<Match[]> => {
    const { data, error } = await supabase.from('matches').select('*').eq('category_id', categoryId);
    if (error) {
        console.error("Error fetching matches:", error.message);
        return [];
    }
    return data.map(mapMatchFromDb);
};

export const getGroups = async (categoryId: string): Promise<Group[]> => {
    const { data: groupsData, error: groupsError } = await supabase.from('groups').select('*').eq('category_id', categoryId);
    if (groupsError) {
        console.error("Error fetching groups:", groupsError.message);
        return [];
    }

    const { data: matchesData, error: matchesError } = await supabase.from('matches').select('group_id, player1_id, player2_id').eq('category_id', categoryId).eq('stage', 'GROUP');
    if(matchesError) {
        console.error("Error fetching group matches:", matchesError.message);
        // Return groups without players if matches fail
        return groupsData.map(g => ({ id: g.id, name: g.name, categoryId: g.category_id, playerIds: [] }));
    }

    return groupsData.map(g => {
        const groupMatches = matchesData.filter(m => m.group_id === g.id);
        const playerIds = new Set<string>();
        groupMatches.forEach(m => {
            if (m.player1_id) playerIds.add(m.player1_id);
            if (m.player2_id) playerIds.add(m.player2_id);
        });

        return {
            id: g.id,
            name: g.name,
            categoryId: g.category_id,
            playerIds: Array.from(playerIds)
        };
    });
};

// --- Cart Logic (remains in localStorage for simplicity) ---
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
export const checkout = async (userId: string): Promise<boolean> => {
    const cart = getCart();
    if (cart.length === 0) return false;
    
    const registrationPromises = cart.map(item => registerPlayerForCategory(item.categoryId, userId));
    const results = await Promise.all(registrationPromises);
    const allSucceeded = results.every(Boolean);

    if (allSucceeded) {
        clearCart();
        return true;
    }
    return false;
}

// --- Eligibility Check ---
export const isPlayerEligible = (player: User, category: TournamentCategory): boolean => {
    if (!player.birthDate) return false;
    const playerAge = new Date().getFullYear() - new Date(player.birthDate).getFullYear();
    if (category.gender !== 'MIXED' && player.gender !== category.gender) return false;
    if (category.ageMin && playerAge < category.ageMin) return false;
    if (category.ageMax && playerAge > category.ageMax) return false;
    if (category.ratingMin && player.currentRating < category.ratingMin) return false;
    if (category.ratingMax && player.currentRating > category.ratingMax) return false;
    return true;
}

// --- Data Setters ---
const createHeadlessUser = async (name: string, phone?: string, rating?: number, isTestUser: boolean = false): Promise<User> => {
    const randomEmail = `${crypto.randomUUID()}@placeholder.ttplay.com`;
    const randomPassword = crypto.randomUUID();

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: randomEmail,
        password: randomPassword,
    });

    if (signUpError) throw new Error(`Erro técnico ao criar usuário temporário: ${signUpError.message}`);
    if (!authData.user) throw new Error("Não foi possível criar o usuário temporário.");

    // The trigger creates a basic profile. Now update it with the correct details.
    const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
            name,
            phone: phone || null,
            current_rating: rating || 1000,
            is_test_user: isTestUser,
        })
        .eq('id', authData.user.id)
        .select()
        .single();
    
    if (updateError) throw new Error("Erro ao salvar detalhes do perfil temporário.");
    if (!updatedUser) throw new Error("Falha ao recuperar o perfil temporário atualizado.");

    return mapUserFromDb(updatedUser);
};

export const updateMatchResultAndAdvance = async (categoryId: string, matchId: string, setScores: {p1: number, p2: number}[]): Promise<TournamentCategory | null> => {
    const { data: matchData, error: matchError } = await supabase.from('matches').select('*').eq('id', matchId).single();
    if (matchError || !matchData) throw new Error("Partida não encontrada.");
    const match = mapMatchFromDb(matchData);

    if (!match.player1Id || !match.player2Id) throw new Error("Jogadores ausentes na partida.");

    const { data: category, error: categoryError } = await supabase.from('tournament_categories').select('*').eq('id', categoryId).single();
    if (categoryError || !category) throw new Error("Categoria não encontrada.");
    
    const { data: playersData, error: playersError } = await supabase.from('users').select('*').in('id', [match.player1Id, match.player2Id]);
    if (playersError || !playersData || playersData.length < 2) throw new Error("Jogadores da partida não encontrados.");
    const players = playersData.map(mapUserFromDb);

    const player1 = players.find(p => p.id === match.player1Id)!;
    const player2 = players.find(p => p.id === match.player2Id)!;

    // 1. Determine Winner
    let p1SetsWon = 0;
    let p2SetsWon = 0;
    for (const score of setScores) {
        if (score.p1 > score.p2) p1SetsWon++;
        else p2SetsWon++;
    }
    if (p1SetsWon === p2SetsWon) throw new Error("O placar de sets não pode ser um empate.");
    const winnerId = p1SetsWon > p2SetsWon ? player1.id : player2.id;

    // 2. Calculate ELO
    const kFactor = 32;
    const p1Expected = 1 / (1 + Math.pow(10, (player2.currentRating - player1.currentRating) / 400));
    const p2Expected = 1 / (1 + Math.pow(10, (player1.currentRating - player2.currentRating) / 400));

    const p1Score = winnerId === player1.id ? 1 : 0;
    const p2Score = winnerId === player2.id ? 1 : 0;

    const p1NewRating = Math.round(player1.currentRating + kFactor * (p1Score - p1Expected));
    const p2NewRating = Math.round(player2.currentRating + kFactor * (p2Score - p2Expected));

    // 3. Update Match
    const { error: matchUpdateError } = await supabase.from('matches').update({
        winner_id: winnerId,
        player1_score: p1SetsWon,
        player2_score: p2SetsWon,
        set_scores: setScores,
        status: 'COMPLETED',
        player1_rating_before: player1.currentRating,
        player2_rating_before: player2.currentRating,
        player1_rating_after: p1NewRating,
        player2_rating_after: p2NewRating
    }).eq('id', matchId);
    if (matchUpdateError) throw new Error(`Erro ao atualizar partida: ${matchUpdateError.message}`);

    // 4. Update Player Ratings
    const { error: p1UpdateError } = await supabase.from('users').update({ current_rating: p1NewRating }).eq('id', player1.id);
    const { error: p2UpdateError } = await supabase.from('users').update({ current_rating: p2NewRating }).eq('id', player2.id);
    if (p1UpdateError || p2UpdateError) throw new Error("Erro ao atualizar o rating dos jogadores.");

    // 5. Log Rating History
    const { error: historyError } = await supabase.from('rating_history').insert([
        { user_id: player1.id, match_id: matchId, category_id: categoryId, rating_before: player1.currentRating, rating_after: p1NewRating, change: p1NewRating - player1.currentRating },
        { user_id: player2.id, match_id: matchId, category_id: categoryId, rating_before: player2.currentRating, rating_after: p2NewRating, change: p2NewRating - player2.currentRating }
    ]);
    if (historyError) console.error("Failed to log rating history:", historyError.message);


    // 6. Advance Winner if Knockout Stage
    if (match.stage === 'KNOCKOUT') {
        // Get all knockout matches to determine total rounds
        const { data: allKnockoutMatches } = await supabase
            .from('matches')
            .select('round')
            .eq('category_id', categoryId)
            .eq('stage', 'KNOCKOUT')
            .order('round', { ascending: false })
            .limit(1);
        
        const maxRound = allKnockoutMatches && allKnockoutMatches.length > 0 ? allKnockoutMatches[0].round : 0;
        
        if (match.round < maxRound) {
            // Not the final, advance winner to next round
            const nextRound = match.round + 1;
            const nextMatchInRound = Math.ceil(match.matchInRound / 2);
            const isPlayer1InNextMatch = match.matchInRound % 2 !== 0;

            const { error: advanceError } = await supabase
                .from('matches')
                .update(isPlayer1InNextMatch ? { player1_id: winnerId } : { player2_id: winnerId })
                .match({ category_id: categoryId, round: nextRound, match_in_round: nextMatchInRound });

            if (advanceError) console.error(`Failed to advance winner: ${advanceError.message}`);
        } else if (match.round === maxRound) {
            // This is the final! Update category status to COMPLETED
            console.log('[DEBUG-FINAL] Última partida completada! Atualizando status para COMPLETED');
            const { error: statusError } = await supabase
                .from('tournament_categories')
                .update({ status: TournamentStatus.COMPLETED })
                .eq('id', categoryId);
            
            if (statusError) {
                console.error('[DEBUG-FINAL] Erro ao atualizar status:', statusError);
            } else {
                console.log('[DEBUG-FINAL] Status atualizado para COMPLETED com sucesso!');
            }
        }
    }
    
    // TODO: Handle group stage completion and advancement
    
    const updatedCategoryData = await getCategoryById(categoryId);
    return updatedCategoryData || null;
};

export const addTournamentEvent = async (data: Omit<TournamentEvent, 'id' | 'club'>, club: Club): Promise<TournamentEvent> => {
    const allEvents = await getTournamentEvents();
    if (club.subscription === SubscriptionPlan.FREE && allEvents.filter(e => e.club.id === club.id).length >= 1) {
        throw new Error("Plano Gratuito permite apenas 1 evento por vez. Faça um upgrade para o Plano Pro.");
    }
    const { data: newEventData, error } = await supabase.from('tournament_events').insert({
        name: data.name,
        start_date: data.startDate,
        location: data.location,
        club_id: club.id
    }).select('*, clubs(*)').single();
    
    if (error || !newEventData) throw new Error(error?.message || "Failed to create event");
    return mapEventFromDb(newEventData);
}

export const updateTournamentEvent = async (eventId: string, details: Partial<Omit<TournamentEvent, 'id' | 'club'>>): Promise<TournamentEvent> => {
    const { data, error } = await supabase.from('tournament_events').update({
        name: details.name,
        start_date: details.startDate,
        location: details.location
    }).eq('id', eventId).select('*, clubs(*)').single();

    if (error || !data) throw new Error(error?.message || "Failed to update event");
    return mapEventFromDb(data);
}

export const addCategoryToEvent = async (data: Omit<TournamentCategory, 'id' | 'registrations' | 'status'>): Promise<TournamentCategory> => {
    const event = await getEventById(data.eventId);
    if (!event) throw new Error("Evento não encontrado.");

    const club = await getClubById(event.club.id);
    if (!club) throw new Error("Clube não encontrado.");

    if (club.subscription === SubscriptionPlan.FREE && (await getTournamentCategories(data.eventId)).length >= 5) {
        throw new Error("Plano Gratuito permite um máximo de 5 categorias por evento. Faça um upgrade.");
    }
    
    const { data: newCategoryData, error } = await supabase.from('tournament_categories').insert({
        event_id: data.eventId,
        name: data.name,
        format: data.format,
        gender: data.gender,
        age_min: data.ageMin,
        age_max: data.ageMax,
        rating_min: data.ratingMin,
        rating_max: data.ratingMax,
        max_participants: data.maxParticipants,
        entry_fee: data.entryFee,
        start_time: data.startTime,
        players_per_group: data.playersPerGroup,
        k_factor: 32,
    }).select('*, player_registrations(*)').single();
    
    if (error || !newCategoryData) throw new Error(error?.message || "Failed to create category");
    return mapCategoryFromDb(newCategoryData);
}

export const updateCategory = async (categoryId: string, data: Partial<Omit<TournamentCategory, 'id' | 'registrations' | 'status'>>): Promise<TournamentCategory> => {
    const updateData: { [key: string]: any } = {};

    // Mapeia apenas as propriedades que foram realmente fornecidas no objeto 'data'
    if (data.name !== undefined) updateData.name = data.name;
    if (data.format !== undefined) updateData.format = data.format;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.ageMin !== undefined) updateData.age_min = data.ageMin;
    if (data.ageMax !== undefined) updateData.age_max = data.ageMax;
    if (data.ratingMin !== undefined) updateData.rating_min = data.ratingMin;
    if (data.ratingMax !== undefined) updateData.rating_max = data.ratingMax;
    if (data.maxParticipants !== undefined) updateData.max_participants = data.maxParticipants;
    if (data.entryFee !== undefined) updateData.entry_fee = data.entryFee;
    if (data.startTime !== undefined) updateData.start_time = data.startTime;
    if (data.playersPerGroup !== undefined) updateData.players_per_group = data.playersPerGroup;

    if (Object.keys(updateData).length === 0) {
        const category = await getCategoryById(categoryId);
        if (!category) throw new Error("Categoria não encontrada.");
        return category;
    }

    const { data: updatedCategoryData, error } = await supabase
        .from('tournament_categories')
        .update(updateData)
        .eq('id', categoryId)
        .select('*, player_registrations(*)');
    
    if (error) throw new Error(error.message);
    if (!updatedCategoryData || updatedCategoryData.length === 0) throw new Error("Falha ao atualizar a categoria. Verifique suas permissões (RLS).");
    return mapCategoryFromDb(updatedCategoryData[0]);
};


export const registerPlayerForCategory = async (categoryId: string, userId: string): Promise<boolean> => {
    const category = await getCategoryById(categoryId);
    if (!category) return false;
    if (category.status !== TournamentStatus.REGISTRATION) return false;
    if (category.registrations.some(r => r.userId === userId)) return true;
    if (category.registrations.length >= category.maxParticipants) return false;

    const { error } = await supabase.from('player_registrations').insert({
        user_id: userId,
        category_id: categoryId,
        status: RegistrationStatus.REGISTERED
    });

    if (error) {
        console.error("Error registering player:", error.message);
        return false;
    }
    return true;
}

export const addManualPlayerToCategory = async (categoryId: string, name: string, phone: string): Promise<boolean> => {
    const category = await getCategoryById(categoryId);
    if (!category) {
        throw new Error("Categoria não encontrada.");
    }
    if (category.status !== TournamentStatus.REGISTRATION) {
        throw new Error("As inscrições para esta categoria estão encerradas.");
    }
    if (category.registrations.length >= category.maxParticipants) {
        throw new Error("Esta categoria já atingiu o número máximo de participantes.");
    }
    
    const newUser = await createHeadlessUser(name, phone, 1000, false);
    
    return registerPlayerForCategory(categoryId, newUser.id);
};

export const cancelPlayerRegistration = async (categoryId: string, userId: string): Promise<boolean> => {
    const category = await getCategoryById(categoryId);
    if (!category) return false;
    const event = await getEventById(category.eventId);
    if (event) {
        const deadline = new Date(event.startDate);
        deadline.setDate(deadline.getDate() - 5);
        if (new Date() > deadline) {
            console.error("Cancellation deadline has passed.");
            return false;
        }
    }
    
    const { error } = await supabase.from('player_registrations').delete().match({ user_id: userId, category_id: categoryId });
    if (error) {
        console.error("Error cancelling registration:", error.message);
        return false;
    }
    return true;
}

export const closeRegistration = async (categoryId: string): Promise<TournamentCategory> => {
    const { data, error } = await supabase.from('tournament_categories').update({ status: TournamentStatus.REGISTRATION_CLOSED }).eq('id', categoryId).select('*, player_registrations(*)');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("Não foi possível encerrar as inscrições. Verifique suas permissões (RLS).");
    return mapCategoryFromDb(data[0]);
}

export const finalizeGroupStage = async (categoryId: string): Promise<TournamentCategory> => {
    console.log('[DEBUG-FINALIZE] Tentando finalizar fase de grupos:', categoryId);
    console.log('[DEBUG-FINALIZE] Status que será enviado:', TournamentStatus.KNOCKOUT_PENDING);
    
    const { data, error } = await supabase
        .from('tournament_categories')
        .update({ status: TournamentStatus.KNOCKOUT_PENDING })
        .eq('id', categoryId)
        .select('*, player_registrations(*)');
    
    console.log('[DEBUG-FINALIZE] Resposta do Supabase:', { data, error });
    
    if (error) {
        console.error('[DEBUG-FINALIZE] ERRO DETALHADO:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        throw new Error(error.message);
    }
    if (!data || data.length === 0) {
        console.error('[DEBUG-FINALIZE] Nenhum dado retornado');
        throw new Error("Não foi possível finalizar a fase de grupos. Verifique suas permissões (RLS).");
    }
    
    console.log('[DEBUG-FINALIZE] Sucesso! Categoria atualizada:', data[0]);
    return mapCategoryFromDb(data[0]);
}

/**
 * @deprecated This function is monolithic and will be replaced by a step-by-step admin flow.
 * Use drawGroupsAndGenerateMatches and generateKnockoutStage instead.
 */
export const startCategory = async (categoryId: string, config?: { playersPerGroup: number; numAdvancing: number }): Promise<TournamentCategory> => {
    const category = await getCategoryById(categoryId);
    if (!category) throw new Error("Categoria não encontrada.");
    if (category.status !== TournamentStatus.REGISTRATION_CLOSED) {
        throw new Error("Esta categoria já foi iniciada ou as inscrições não foram encerradas.");
    }
    if (category.registrations.length < 2) throw new Error("São necessários pelo menos 2 jogadores para iniciar a categoria.");

    const registeredUserIds = category.registrations.map(r => r.userId);
    const players = (await getUsers(registeredUserIds)).sort((a, b) => b.currentRating - a.currentRating);
    
    const matchesToCreate: any[] = [];
    
    if (category.format === TournamentFormat.GRUPOS_E_ELIMINATORIA) {
        const playersPerGroup = config?.playersPerGroup || category.playersPerGroup || 4;
        const numAdvancing = config?.numAdvancing || 2;
        const numGroups = Math.ceil(players.length / playersPerGroup);
        const groups: { name: string; playerIds: string[] }[] = Array.from({ length: numGroups }, (_, i) => ({
            name: `Grupo ${String.fromCharCode(65 + i)}`,
            playerIds: [],
        }));

        // Serpentine seeding
        players.forEach((player, i) => {
            let groupIndex = i % numGroups;
            if (Math.floor(i / numGroups) % 2 !== 0) {
                groupIndex = numGroups - 1 - groupIndex;
            }
            groups[groupIndex].playerIds.push(player.id);
        });

        const groupsToInsert = groups.map(g => ({ category_id: categoryId, name: g.name }));
        const { data: insertedGroupsData, error: groupInsertError } = await supabase
            .from('groups').insert(groupsToInsert).select();
        if (groupInsertError) throw new Error(`Erro ao criar grupos: ${groupInsertError.message}`);

        // Create group matches
        for (const insertedGroup of insertedGroupsData) {
            const originalGroup = groups.find(g => g.name === insertedGroup.name);
            if (!originalGroup) continue;

            for (let i = 0; i < originalGroup.playerIds.length; i++) {
                for (let j = i + 1; j < originalGroup.playerIds.length; j++) {
                    matchesToCreate.push({
                        category_id: categoryId, stage: 'GROUP', group_id: insertedGroup.id,
                        round: 0, match_in_round: 0, status: 'SCHEDULED',
                        player1_id: originalGroup.playerIds[i], player2_id: originalGroup.playerIds[j],
                    });
                }
            }
        }
        
        // Create knockout bracket for advancing players
        const totalAdvancing = numGroups * numAdvancing;
        if (totalAdvancing > 0) {
            const knockoutSize = Math.pow(2, Math.ceil(Math.log2(totalAdvancing)));
            const numRounds = Math.log2(knockoutSize);
            let matchesInRound = knockoutSize / 2;
            for (let r = 1; r <= numRounds; r++) {
                for (let i = 1; i <= matchesInRound; i++) {
                    matchesToCreate.push({
                        category_id: categoryId, round: r, match_in_round: i, stage: 'KNOCKOUT', status: 'SCHEDULED',
                    });
                }
                matchesInRound /= 2;
            }
        }
        
        await supabase.from('tournament_categories').update({ 
            status: TournamentStatus.GROUP_STAGE,
            players_per_group: playersPerGroup,
        }).eq('id', categoryId);

    } else if (category.format === TournamentFormat.ELIMINATORIA_SIMPLES) {
        const playerCount = players.length;
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
        const numRounds = Math.log2(bracketSize);

        const seedOrder = [1];
        for (let i = 1; i < numRounds; i++) {
            const next = [];
            const len = seedOrder.length * 2 + 1;
            for (const j of seedOrder) { next.push(j, len - j); }
            seedOrder.splice(0, seedOrder.length, ...next);
        }

        const seededBracket = new Array(bracketSize).fill(null);
        players.forEach((player, i) => { seededBracket[seedOrder[i] - 1] = player; });

        let matchesInRound = bracketSize / 2;
        for (let r = 1; r <= numRounds; r++) {
            for (let i = 1; i <= matchesInRound; i++) {
                matchesToCreate.push({ category_id: categoryId, round: r, match_in_round: i, stage: 'KNOCKOUT', status: 'SCHEDULED' });
            }
            matchesInRound /= 2;
        }

        let matchIndex = 0;
        for (let i = 0; i < bracketSize; i += 2) {
            const p1 = seededBracket[i];
            const p2 = seededBracket[i + 1];
            const round1Match = matchesToCreate.find(m => m.round === 1 && m.match_in_round === matchIndex + 1);
            if (round1Match) {
                 if (p1 && p2) {
                    round1Match.player1_id = p1.id;
                    round1Match.player2_id = p2.id;
                } else if (p1 && !p2) { // Handle bye
                    round1Match.winner_id = p1.id;
                    round1Match.status = 'COMPLETED';
                    const round2MatchIndex = Math.floor(matchIndex / 2);
                    const round2Match = matchesToCreate.find(m => m.round === 2 && m.match_in_round === round2MatchIndex + 1);
                    if (round2Match) {
                        if (matchIndex % 2 === 0) round2Match.player1_id = p1.id;
                        else round2Match.player2_id = p1.id;
                    }
                }
            }
            matchIndex++;
        }
        await supabase.from('tournament_categories').update({ status: TournamentStatus.IN_PROGRESS }).eq('id', categoryId);
    }
    
    if (matchesToCreate.length > 0) {
        const { error } = await supabase.from('matches').insert(matchesToCreate);
        if (error) throw new Error(`Erro ao criar partidas: ${error.message}`);
    }
    
    const updatedCategory = await getCategoryById(categoryId);
    if (!updatedCategory) throw new Error("Falha ao recarregar a categoria após o início.");
    return updatedCategory;
};

export const advanceFromGroupStage = async (categoryId: string): Promise<TournamentCategory> => {
    console.log('[DEBUG-ADVANCE] Tentando gerar chaves da eliminatória:', categoryId);
    
    const category = await getCategoryById(categoryId);
    if (!category) throw new Error("Categoria não encontrada.");
    
    console.log('[DEBUG-ADVANCE] Status da categoria:', category.status);
    console.log('[DEBUG-ADVANCE] Status esperado:', TournamentStatus.KNOCKOUT_PENDING);
    
    if (category.status !== TournamentStatus.KNOCKOUT_PENDING) {
        throw new Error("A categoria não está pronta para gerar as chaves. Finalize a fase de grupos primeiro.");
    }
    if (category.format !== TournamentFormat.GRUPOS_E_ELIMINATORIA) {
        throw new Error("Esta categoria não possui fase de grupos + eliminatória.");
    }
    
    // Verificar se já existem jogos de knockout
    const { data: existingKnockout } = await supabase
        .from('matches')
        .select('id')
        .eq('category_id', categoryId)
        .eq('stage', 'KNOCKOUT')
        .limit(1);

    if (existingKnockout && existingKnockout.length > 0) {
        throw new Error("Esta categoria já possui chaves geradas.");
    }

    // Verificar se todos os jogos dos grupos estão completos
    const { data: groupMatches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('category_id', categoryId)
        .eq('stage', 'GROUP');

    if (matchesError) throw new Error("Erro ao verificar jogos dos grupos.");
    if (!groupMatches.every(m => m.status === 'COMPLETED')) {
        throw new Error("Todos os jogos dos grupos precisam estar completos antes de gerar as chaves.");
    }

    // Pegar classificação dos grupos
    const { data: groups } = await supabase
        .from('groups')
        .select('id, name')
        .eq('category_id', categoryId);

    if (!groups) throw new Error("Grupos não encontrados.");

    const qualifiedPlayers: string[] = [];
    
    // Calcular standings para cada grupo manualmente
    for (const group of groups) {
        // Buscar todas as partidas do grupo
        const groupMatchesForStanding = groupMatches.filter(m => m.group_id === group.id);
        
        // Coletar todos os jogadores do grupo
        const playerIds = new Set<string>();
        groupMatchesForStanding.forEach(m => {
            if (m.player1_id) playerIds.add(m.player1_id);
            if (m.player2_id) playerIds.add(m.player2_id);
        });
        
        // Calcular estatísticas para cada jogador
        const playerStats = Array.from(playerIds).map(playerId => {
            const playerMatches = groupMatchesForStanding.filter(
                m => (m.player1_id === playerId || m.player2_id === playerId) && m.status === 'COMPLETED'
            );
            
            const wins = playerMatches.filter(m => m.winner_id === playerId).length;
            const losses = playerMatches.length - wins;
            const points = (wins * 2) + (losses * 1); // 2 pontos por vitória, 1 por derrota
            
            return {
                player_id: playerId,
                points,
                wins,
                losses,
                played: playerMatches.length
            };
        });
        
        // Ordenar por pontos (decrescente) e depois por vitórias (decrescente)
        playerStats.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.wins - a.wins;
        });
        
        // Pegar os N primeiros de cada grupo (numAdvancingFromGroup)
        const numAdvancing = category.numAdvancingFromGroup || 2;
        const advancing = playerStats
            .slice(0, numAdvancing)
            .map(p => p.player_id);
        
        qualifiedPlayers.push(...advancing);
    }

    if (qualifiedPlayers.length === 0) {
        throw new Error("Não foi possível determinar os jogadores classificados.");
    }

    // Gerar partidas da fase eliminatória
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(qualifiedPlayers.length)));
    const numRounds = Math.log2(bracketSize);
    const matchesToCreate: any[] = [];

    let matchesInRound = bracketSize / 2;
    for (let r = 1; r <= numRounds; r++) {
        for (let i = 1; i <= matchesInRound; i++) {
            matchesToCreate.push({
                category_id: categoryId,
                round: r,
                match_in_round: i,
                stage: 'KNOCKOUT',
                status: 'SCHEDULED'
            });
        }
        matchesInRound /= 2;
    }

    // Distribuir os jogadores classificados nas primeiras partidas
    for (let i = 0; i < qualifiedPlayers.length; i += 2) {
        const matchIndex = Math.floor(i / 2);
        const match = matchesToCreate.find(m => m.round === 1 && m.match_in_round === matchIndex + 1);
        if (match) {
            match.player1_id = qualifiedPlayers[i];
            if (qualifiedPlayers[i + 1]) {
                match.player2_id = qualifiedPlayers[i + 1];
            } else {
                // WO - jogador passa direto
                match.winner_id = qualifiedPlayers[i];
                match.status = 'COMPLETED';
                
                // Já coloca o jogador na próxima fase
                const nextRoundMatch = matchesToCreate.find(
                    m => m.round === 2 && 
                    m.match_in_round === Math.ceil((matchIndex + 1) / 2)
                );
                if (nextRoundMatch) {
                    if (matchIndex % 2 === 0) nextRoundMatch.player1_id = qualifiedPlayers[i];
                    else nextRoundMatch.player2_id = qualifiedPlayers[i];
                }
            }
        }
    }

    // Inserir partidas e atualizar status da categoria
    if (matchesToCreate.length > 0) {
        const { error: matchInsertError } = await supabase
            .from('matches')
            .insert(matchesToCreate);
        if (matchInsertError) throw new Error(`Erro ao criar partidas: ${matchInsertError.message}`);
    }

    // Atualizar status da categoria para IN_PROGRESS
    const { error: updateError } = await supabase
        .from('tournament_categories')
        .update({ status: TournamentStatus.IN_PROGRESS })
        .eq('id', categoryId);

    if (updateError) throw new Error("Erro ao atualizar status da categoria.");

    return await getCategoryById(categoryId) as TournamentCategory;
};

export const drawGroupsAndGenerateMatches = async (categoryId: string, config?: { playersPerGroup: number; numAdvancing: number }): Promise<TournamentCategory> => {
    const category = await getCategoryById(categoryId);
    if (!category) throw new Error("Categoria não encontrada.");
    if (category.status === TournamentStatus.REGISTRATION) {
        throw new Error("As inscrições ainda estão abertas. Termine o sorteio normalmente.");
    }
    if (category.registrations.length < 2) throw new Error("São necessários pelo menos 2 jogadores para iniciar a categoria.");

    const registeredUserIds = category.registrations.map(r => r.userId);
    const players = (await getUsers(registeredUserIds)).sort((a, b) => b.currentRating - a.currentRating);
    
    const matchesToCreate: any[] = [];
    
    // Delete existing groups and matches for this category
    await supabase.from('groups').delete().eq('category_id', categoryId);
    await supabase.from('matches').delete().eq('category_id', categoryId);
    
    if (category.format === TournamentFormat.GRUPOS_E_ELIMINATORIA) {
        const playersPerGroup = config?.playersPerGroup || category.playersPerGroup || 4;
        const numAdvancing = config?.numAdvancing || category.numAdvancingFromGroup || 2;
        const numGroups = Math.ceil(players.length / playersPerGroup);
        const groups: { name: string; playerIds: string[] }[] = Array.from({ length: numGroups }, (_, i) => ({
            name: `Grupo ${String.fromCharCode(65 + i)}`,
            playerIds: [],
        }));

        players.forEach((player, i) => {
            let groupIndex = i % numGroups;
            if (Math.floor(i / numGroups) % 2 !== 0) {
                groupIndex = numGroups - 1 - groupIndex;
            }
            groups[groupIndex].playerIds.push(player.id);
        });

        const groupsToInsert = groups.map(g => ({ category_id: categoryId, name: g.name }));
        const { data: insertedGroupsData, error: groupInsertError } = await supabase
            .from('groups').insert(groupsToInsert).select();
        if (groupInsertError) throw new Error(`Erro ao criar grupos: ${groupInsertError.message}`);

        for (const insertedGroup of insertedGroupsData) {
            const originalGroup = groups.find(g => g.name === insertedGroup.name);
            if (!originalGroup) continue;

            for (let i = 0; i < originalGroup.playerIds.length; i++) {
                for (let j = i + 1; j < originalGroup.playerIds.length; j++) {
                    matchesToCreate.push({
                        category_id: categoryId, stage: 'GROUP', group_id: insertedGroup.id,
                        round: 0, match_in_round: 0, status: 'SCHEDULED',
                        player1_id: originalGroup.playerIds[i], player2_id: originalGroup.playerIds[j],
                    });
                }
            }
        }
        
        await supabase.from('tournament_categories').update({ 
            status: TournamentStatus.GROUP_STAGE,
            players_per_group: playersPerGroup,
        }).eq('id', categoryId);

    } else if (category.format === TournamentFormat.ELIMINATORIA_SIMPLES) {
        // For single elimination, we generate the full bracket at once
        const playerCount = players.length;
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
        const numRounds = Math.log2(bracketSize);

        const seedOrder = [1];
        for (let i = 1; i < numRounds; i++) {
            const next = [];
            const len = seedOrder.length * 2 + 1;
            for (const j of seedOrder) { next.push(j, len - j); }
            seedOrder.splice(0, seedOrder.length, ...next);
        }

        const seededBracket = new Array(bracketSize).fill(null);
        players.forEach((player, i) => { seededBracket[seedOrder[i] - 1] = player; });

        let matchesInRound = bracketSize / 2;
        for (let r = 1; r <= numRounds; r++) {
            for (let i = 1; i <= matchesInRound; i++) {
                matchesToCreate.push({ category_id: categoryId, round: r, match_in_round: i, stage: 'KNOCKOUT', status: 'SCHEDULED' });
            }
            matchesInRound /= 2;
        }

        let matchIndex = 0;
        for (let i = 0; i < bracketSize; i += 2) {
            const p1 = seededBracket[i];
            const p2 = seededBracket[i + 1];
            const round1Match = matchesToCreate.find(m => m.round === 1 && m.match_in_round === matchIndex + 1);
            if (round1Match) {
                 if (p1 && p2) {
                    round1Match.player1_id = p1.id;
                    round1Match.player2_id = p2.id;
                } else if (p1 && !p2) { // Handle bye
                    round1Match.winner_id = p1.id;
                    round1Match.status = 'COMPLETED';
                    const round2MatchIndex = Math.floor(matchIndex / 2);
                    const round2Match = matchesToCreate.find(m => m.round === 2 && m.match_in_round === round2MatchIndex + 1);
                    if (round2Match) {
                        if (matchIndex % 2 === 0) round2Match.player1_id = p1.id;
                        else round2Match.player2_id = p1.id;
                    }
                }
            }
            matchIndex++;
        }
        await supabase.from('tournament_categories').update({ status: TournamentStatus.IN_PROGRESS }).eq('id', categoryId);
    }
    
    if (matchesToCreate.length > 0) {
        const { error } = await supabase.from('matches').insert(matchesToCreate);
        if (error) throw new Error(`Erro ao criar partidas: ${error.message}`);
    }
    
    const updatedCategory = await getCategoryById(categoryId);
    if (!updatedCategory) throw new Error("Falha ao recarregar a categoria após o início.");
    return updatedCategory;
};

export const reopenRegistration = async (categoryId: string): Promise<TournamentCategory> => {
    const category = await getCategoryById(categoryId);
    if (!category) throw new Error("Categoria não encontrada.");

    const event = await getEventById(category.eventId);
    if (!event) throw new Error("Evento não encontrado.");

    if (event.name.startsWith('[TESTE]')) {
        throw new Error("Não é possível reabrir inscrições para torneios de teste.");
    }

    const { data, error } = await supabase.from('tournament_categories').update({ status: TournamentStatus.REGISTRATION }).eq('id', categoryId).select('*, player_registrations(*)');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("Não foi possível reabrir as inscrições. Verifique suas permissões (RLS).");
    return mapCategoryFromDb(data[0]);
}

export const regenerateGroups = async (categoryId: string): Promise<TournamentCategory> => {
    const category = await getCategoryById(categoryId);
    if (!category) throw new Error("Categoria não encontrada.");
    if (category.status === TournamentStatus.REGISTRATION) {
        throw new Error("As inscrições ainda estão abertas. Termine o sorteio normalmente.");
    }

    // Delete existing groups and matches
    await supabase.from('groups').delete().eq('category_id', categoryId);
    await supabase.from('matches').delete().eq('category_id', categoryId);

    // Generate new groups and matches
    return await drawGroupsAndGenerateMatches(categoryId);
}

// Função para adicionar jogador a um grupo específico
export const addPlayerToGroup = async (categoryId: string, playerId: string, groupId: string): Promise<void> => {
    const category = await getCategoryById(categoryId);
    if (!category) throw new Error("Categoria não encontrada.");
    
    // Verificar se o jogador está inscrito na categoria
    const isRegistered = category.registrations.some(reg => reg.userId === playerId);
    if (!isRegistered) {
        throw new Error("Jogador não está inscrito nesta categoria.");
    }

    // Obter todos os jogadores do grupo
    const { data: groupMatches } = await supabase
        .from('matches')
        .select('player1_id, player2_id')
        .eq('category_id', categoryId)
        .eq('group_id', groupId)
        .eq('stage', 'GROUP');

    const groupPlayers = new Set<string>();
    groupMatches?.forEach(match => {
        if (match.player1_id) groupPlayers.add(match.player1_id);
        if (match.player2_id) groupPlayers.add(match.player2_id);
    });

    // Verificar se o jogador já está no grupo
    if (groupPlayers.has(playerId)) {
        throw new Error("Jogador já está neste grupo.");
    }

    // Criar partidas contra todos os jogadores existentes no grupo
    const matchesToCreate: any[] = [];
    groupPlayers.forEach(existingPlayerId => {
        matchesToCreate.push({
            category_id: categoryId,
            stage: 'GROUP',
            group_id: groupId,
            round: 0,
            match_in_round: 0,
            status: 'SCHEDULED',
            player1_id: playerId,
            player2_id: existingPlayerId,
        });
    });

    if (matchesToCreate.length > 0) {
        const { error } = await supabase.from('matches').insert(matchesToCreate);
        if (error) throw new Error(`Erro ao criar partidas: ${error.message}`);
    }
}

// Função para remover jogador de um grupo
export const removePlayerFromGroup = async (categoryId: string, playerId: string, groupId: string): Promise<void> => {
    // Remover todas as partidas do jogador neste grupo
    const { error } = await supabase
        .from('matches')
        .delete()
        .eq('category_id', categoryId)
        .eq('group_id', groupId)
        .eq('stage', 'GROUP')
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`);

    if (error) throw new Error(`Erro ao remover jogador do grupo: ${error.message}`);
}

// Função para trocar jogador de grupo
export const movePlayerBetweenGroups = async (categoryId: string, playerId: string, fromGroupId: string, toGroupId: string): Promise<void> => {
    // Primeiro remover do grupo atual
    await removePlayerFromGroup(categoryId, playerId, fromGroupId);
    
    // Depois adicionar ao novo grupo
    await addPlayerToGroup(categoryId, playerId, toGroupId);
}

// Função para editar resultado de partida já salva
export const editMatchResult = async (matchId: string, newSetScores: { p1: number, p2: number }[]): Promise<void> => {
    // Buscar dados da partida
    const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

    if (matchError || !matchData) throw new Error("Partida não encontrada.");
    
    const match = mapMatchFromDb(matchData);
    
    // Recalcular vencedor
    let p1SetsWon = 0;
    let p2SetsWon = 0;
    for (const score of newSetScores) {
        if (score.p1 > score.p2) p1SetsWon++;
        else p2SetsWon++;
    }
    
    if (p1SetsWon === p2SetsWon) throw new Error("O placar de sets não pode ser um empate.");
    const winnerId = p1SetsWon > p2SetsWon ? match.player1Id : match.player2Id;

    // Atualizar partida com novo resultado
    const { error: updateError } = await supabase
        .from('matches')
        .update({
            winner_id: winnerId,
            player1_score: p1SetsWon,
            player2_score: p2SetsWon,
            set_scores: newSetScores,
            status: 'COMPLETED'
        })
        .eq('id', matchId);

    if (updateError) throw new Error(`Erro ao atualizar resultado: ${updateError.message}`);

    // Recalcular e atualizar ratings se for uma partida válida
    if (match.player1Id && match.player2Id && match.categoryId) {
        await recalculateMatchRatings(matchId, match.categoryId);
    }
}

// Função auxiliar para recalcular ratings após edição
async function recalculateMatchRatings(matchId: string, categoryId: string): Promise<void> {
    // Buscar dados atualizados da partida
    const { data: matchData } = await supabase
        .from('matches')
        .select('player1_id, player2_id, winner_id, player1_rating_before, player2_rating_before')
        .eq('id', matchId)
        .single();

    if (!matchData) return;

    // Obter ratings atuais dos jogadores
    const { data: playersData } = await supabase
        .from('users')
        .select('id, current_rating')
        .in('id', [matchData.player1_id, matchData.player2_id]);

    if (!playersData || playersData.length < 2) return;

    const player1 = playersData.find(p => p.id === matchData.player1_id);
    const player2 = playersData.find(p => p.id === matchData.player2_id);
    
    if (!player1 || !player2) return;

    // Recalcular ELO
    const kFactor = 32;
    const p1Expected = 1 / (1 + Math.pow(10, (player2.current_rating - player1.current_rating) / 400));
    const p2Expected = 1 / (1 + Math.pow(10, (player1.current_rating - player2.current_rating) / 400));

    const p1Score = matchData.winner_id === matchData.player1_id ? 1 : 0;
    const p2Score = matchData.winner_id === matchData.player2_id ? 1 : 0;

    const p1NewRating = Math.round(player1.current_rating + kFactor * (p1Score - p1Expected));
    const p2NewRating = Math.round(player2.current_rating + kFactor * (p2Score - p2Expected));

    // Atualizar ratings
    await supabase.from('users').update({ current_rating: p1NewRating }).eq('id', matchData.player1_id);
    await supabase.from('users').update({ current_rating: p2NewRating }).eq('id', matchData.player2_id);

    // Atualizar rating history
    await supabase.from('rating_history').insert([
        { 
            user_id: matchData.player1_id, 
            match_id: matchId, 
            category_id: categoryId, 
            rating_before: matchData.player1_rating_before, 
            rating_after: p1NewRating, 
            change: p1NewRating - matchData.player1_rating_before 
        },
        { 
            user_id: matchData.player2_id, 
            match_id: matchId, 
            category_id: categoryId, 
            rating_before: matchData.player2_rating_before, 
            rating_after: p2NewRating, 
            change: p2NewRating - matchData.player2_rating_before 
        }
    ]);
}

// Função para obter jogadores disponíveis (não alocados em grupos)
export const getAvailablePlayers = async (categoryId: string): Promise<User[]> => {
    const category = await getCategoryById(categoryId);
    if (!category) return [];

    // Obter todos os jogadores inscritos
    const registeredUserIds = category.registrations.map(r => r.userId);
    
    // Obter jogadores já alocados em grupos
    const { data: allocatedMatches } = await supabase
        .from('matches')
        .select('player1_id, player2_id')
        .eq('category_id', categoryId)
        .eq('stage', 'GROUP')
        .not('group_id', 'is', null);

    const allocatedUserIds = new Set<string>();
    allocatedMatches?.forEach(match => {
        if (match.player1_id) allocatedUserIds.add(match.player1_id);
        if (match.player2_id) allocatedUserIds.add(match.player2_id);
    });

    // Filtrar jogadores não alocados
    const availableUserIds = registeredUserIds.filter(id => !allocatedUserIds.has(id));
    
    if (availableUserIds.length === 0) return [];
    
    return await getUsers(availableUserIds);
}

// Função para obter jogadores de um grupo específico
export const getGroupPlayers = async (categoryId: string, groupId: string): Promise<User[]> => {
    const { data: matches } = await supabase
        .from('matches')
        .select('player1_id, player2_id')
        .eq('category_id', categoryId)
        .eq('group_id', groupId)
        .eq('stage', 'GROUP');

    const playerIds = new Set<string>();
    matches?.forEach(match => {
        if (match.player1_id) playerIds.add(match.player1_id);
        if (match.player2_id) playerIds.add(match.player2_id);
    });

    if (playerIds.size === 0) return [];
    
    return await getUsers(Array.from(playerIds));
}

// --- Profile Updates & Subscription ---
export const updateClubDetails = async (clubId: string, details: Partial<Club>): Promise<Club | null> => {
    const { name, description, address, city, state, phone, email, website, logo, discountRules } = details;
    const updateData: { [key: string]: any } = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (logo !== undefined) updateData.logo = logo;
    if (details.hasOwnProperty('discountRules')) updateData.discount_rules = discountRules;

    if (Object.keys(updateData).length === 0) {
        return getClubById(clubId) || null;
    }

    const { data, error } = await supabase
        .from('clubs')
        .update(updateData)
        .eq('id', clubId)
        .select()
        .single();
    
    if (error) {
        console.error("Error updating club details:", error.message);
        return null;
    }
    if (!data) return null;
    
    return mapClubFromDb(data);
}

export const updateUserDetails = async (userId: string, details: Partial<User>): Promise<User | null> => {
    const { name, birthDate, gender, city, phone, bio, avatar } = details;
    const updateData: { [key: string]: any } = {};

    if (details.hasOwnProperty('name')) updateData.name = name;
    if (details.hasOwnProperty('birthDate')) updateData.birth_date = birthDate || null;
    if (details.hasOwnProperty('gender')) updateData.gender = gender;
    if (details.hasOwnProperty('city')) updateData.city = city;
    if (details.hasOwnProperty('phone')) updateData.phone = phone;
    if (details.hasOwnProperty('bio')) updateData.bio = bio;
    if (details.hasOwnProperty('avatar')) updateData.avatar = avatar;
    
    if (Object.keys(updateData).length === 0) {
        return getUserById(userId);
    }

    const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select();
    
    if (error) {
        console.error("Error updating user details:", error.message);
        return null;
    }

    if (!data || data.length === 0) {
        console.error("Failed to retrieve user profile after update.");
        return null;
    }
    return mapUserFromDb(data[0]);
}

export const upgradeClubSubscription = async (clubId: string): Promise<Club | null> => {
    const { data, error } = await supabase.from('clubs').update({ subscription: SubscriptionPlan.PRO }).eq('id', clubId).select().single();
    if (error || !data) {
        console.error("Error upgrading subscription:", error?.message);
        return null;
    }
    return mapClubFromDb(data);
}

/**
 * Convida um novo administrador para o clube
 * Se o email já estiver cadastrado, transfere imediatamente
 * Se não, cria um convite pendente e o Supabase envia o email automaticamente
 */
export const inviteNewAdmin = async (clubId: string, newAdminEmail: string, currentAdminId: string): Promise<{ success: boolean; requiresSignup: boolean; message: string; inviteId?: string }> => {
    if (!newAdminEmail) throw new Error("O e-mail do novo administrador é obrigatório.");
    
    console.log('[DEBUG-ADMIN-TRANSFER] Iniciando convite para novo admin:', { clubId, newAdminEmail });
    
    // 1. Verificar se o email já está cadastrado
    const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id, role, email')
        .eq('email', newAdminEmail)
        .single();
    
    if (userError && userError.code !== 'PGRST116') { // PGRST116 = not found, outros erros são problemas reais
        console.error('[DEBUG-ADMIN-TRANSFER] Erro ao buscar usuário:', userError);
        throw new Error(`Erro ao verificar usuário: ${userError.message}`);
    }
    
    if (existingUser) {
        // Usuário já existe - transferir imediatamente
        console.log('[DEBUG-ADMIN-TRANSFER] Usuário já cadastrado, transferindo imediatamente');
        return await transferAdminshipImmediate(clubId, existingUser.id, currentAdminId);
    } else {
        // Usuário não existe - criar convite e enviar email
        console.log('[DEBUG-ADMIN-TRANSFER] Usuário não cadastrado, criando convite');
        
        // Criar convite pendente
        const { data: invite, error: inviteError } = await supabase
            .from('admin_transfer_invites')
            .insert({
                club_id: clubId,
                current_admin_id: currentAdminId,
                new_admin_email: newAdminEmail,
                status: 'PENDING'
            })
            .select()
            .single();
        
        if (inviteError) {
            console.error('[DEBUG-ADMIN-TRANSFER] Erro ao criar convite:', inviteError);
            throw new Error(`Erro ao criar convite: ${inviteError.message}`);
        }
        
        console.log('[DEBUG-ADMIN-TRANSFER] Convite criado:', invite.id);
        
        // Enviar convite via Supabase Auth
        const { data: inviteData, error: inviteAuthError } = await supabase.auth.admin.inviteUserByEmail(newAdminEmail, {
            data: {
                club_id: clubId,
                invite_id: invite.id,
                role: Role.CLUB_ADMIN
            }
        });
        
        if (inviteAuthError) {
            console.error('[DEBUG-ADMIN-TRANSFER] Erro ao enviar convite:', inviteAuthError);
            // Marcar convite como cancelado se o email falhar
            await supabase
                .from('admin_transfer_invites')
                .update({ status: 'CANCELLED' })
                .eq('id', invite.id);
            throw new Error(`Erro ao enviar convite por email: ${inviteAuthError.message}`);
        }
        
        console.log('[DEBUG-ADMIN-TRANSFER] Email de convite enviado com sucesso');
        
        return {
            success: true,
            requiresSignup: true,
            message: `Convite enviado para ${newAdminEmail}. A transferência será completada quando a pessoa aceitar o convite e criar sua conta.`,
            inviteId: invite.id
        };
    }
};

/**
 * Transfere a administração imediatamente para um usuário já cadastrado
 */
const transferAdminshipImmediate = async (clubId: string, newAdminId: string, currentAdminId: string): Promise<{ success: boolean; requiresSignup: boolean; message: string }> => {
    console.log('[DEBUG-ADMIN-TRANSFER] Executando transferência imediata:', { clubId, newAdminId, currentAdminId });
    
    // Validações
    if (newAdminId === currentAdminId) {
        throw new Error("Você já é o administrador deste clube.");
    }
    
    // 1. Atualizar clube com novo admin
    const { error: clubError } = await supabase
        .from('clubs')
        .update({ admin_id: newAdminId })
        .eq('id', clubId);
    
    if (clubError) {
        console.error('[DEBUG-ADMIN-TRANSFER] Erro ao atualizar clube:', clubError);
        throw new Error(`Erro ao atualizar clube: ${clubError.message}`);
    }
    
    // 2. Atualizar papel do novo admin
    const { error: newAdminError } = await supabase
        .from('users')
        .update({ 
            role: Role.CLUB_ADMIN,
            club_id: clubId 
        })
        .eq('id', newAdminId);
    
    if (newAdminError) {
        console.error('[DEBUG-ADMIN-TRANSFER] Erro ao atualizar novo admin:', newAdminError);
        throw new Error(`Erro ao atualizar novo administrador: ${newAdminError.message}`);
    }
    
    // 3. Reverter papel do admin anterior para PLAYER
    const { error: oldAdminError } = await supabase
        .from('users')
        .update({ 
            role: Role.PLAYER,
            club_id: null 
        })
        .eq('id', currentAdminId);
    
    if (oldAdminError) {
        console.error('[DEBUG-ADMIN-TRANSFER] Erro ao atualizar admin anterior:', oldAdminError);
        throw new Error(`Erro ao atualizar administrador anterior: ${oldAdminError.message}`);
    }
    
    // 4. Registrar no histórico de auditoria
    const { error: historyError } = await supabase
        .from('admin_transfer_history')
        .insert({
            club_id: clubId,
            previous_admin_id: currentAdminId,
            new_admin_id: newAdminId,
            transfer_method: 'DIRECT',
            notes: 'Transferência imediata - usuário já cadastrado'
        });
    
    if (historyError) {
        console.warn('[DEBUG-ADMIN-TRANSFER] Aviso: Erro ao registrar histórico:', historyError);
        // Não lançar erro, pois a transferência já foi feita
    }
    
    console.log('[DEBUG-ADMIN-TRANSFER] Transferência completada com sucesso');
    
    return {
        success: true,
        requiresSignup: false,
        message: 'Transferência de administração concluída com sucesso!'
    };
};

/**
 * @deprecated Use inviteNewAdmin ao invés desta função
 */
export const transferClubAdminship = (clubId: string, newAdminEmail: string, currentAdminId: string): {success: boolean} => {
    console.warn("transferClubAdminship está deprecated. Use inviteNewAdmin.");
    throw new Error("Esta função está obsoleta. Use inviteNewAdmin ao invés.");
}

/**
 * Cancela um convite pendente de transferência de admin
 */
export const cancelAdminInvite = async (inviteId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('admin_transfer_invites')
        .update({ status: 'CANCELLED' })
        .eq('id', inviteId)
        .eq('status', 'PENDING');
    
    if (error) {
        console.error('[DEBUG-ADMIN-TRANSFER] Erro ao cancelar convite:', error);
        return false;
    }
    
    return true;
};

/**
 * Lista convites pendentes para um clube
 */
export const getPendingAdminInvites = async (clubId: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('admin_transfer_invites')
        .select('*')
        .eq('club_id', clubId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('[DEBUG-ADMIN-TRANSFER] Erro ao buscar convites:', error);
        return [];
    }
    
    return data || [];
};

/**
 * Obtém histórico de transferências de um clube
 */
export const getAdminTransferHistory = async (clubId: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('admin_transfer_history')
        .select(`
            *,
            previous_admin:users!previous_admin_id(id, name, email),
            new_admin:users!new_admin_id(id, name, email)
        `)
        .eq('club_id', clubId)
        .order('transferred_at', { ascending: false });
    
    if (error) {
        console.error('[DEBUG-ADMIN-TRANSFER] Erro ao buscar histórico:', error);
        return [];
    }
    
    return data || [];
};

// --- Deletion ---
export const deleteTournamentCategory = async (categoryId: string): Promise<void> => {
    const { error } = await supabase.from('tournament_categories').delete().eq('id', categoryId);
    if (error) {
        console.error("Error deleting category:", error.message);
        throw new Error("Não foi possível remover a categoria. Verifique se existem inscrições ou partidas associadas a ela.");
    }
}

export const deleteTournamentEvent = async (eventId: string): Promise<void> => {
    const { error } = await supabase.from('tournament_events').delete().eq('id', eventId);
     if (error) {
        console.error("Error deleting event:", error.message);
        throw new Error("Não foi possível remover o evento. Certifique-se de que todas as categorias foram removidas primeiro.");
     }
}

export const createTestTournament = async (clubId: string): Promise<TournamentEvent> => {
    // 1. Create the test event
    const { data: newEventData, error: eventError } = await supabase.from('tournament_events').insert({
        name: '[TESTE] Torneio de Demonstração',
        start_date: new Date().toISOString().split('T')[0],
        location: 'Online',
        club_id: clubId
    }).select('*, clubs(*)').single();

    if (eventError || !newEventData) throw new Error(eventError?.message || "Failed to create test event");

    // 2. Create the test category using the existing service function to ensure consistency
    const newCategoryData = await addCategoryToEvent({
        eventId: newEventData.id,
        name: 'Categoria de Teste - Absoluto',
        format: TournamentFormat.GRUPOS_E_ELIMINATORIA,
        gender: 'MIXED',
        maxParticipants: 16,
        entryFee: 0,
        playersPerGroup: 4,
        ageMin: undefined,
        ageMax: undefined,
        ratingMin: undefined,
        ratingMax: undefined,
        startTime: undefined,
        kFactor: 32,
    });

    if (!newCategoryData) throw new Error("Failed to create test category");

    // 3. Fetch the 16 pre-existing test users
    const { data: testUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('is_test_user', true)
        .limit(16);

    if (usersError || !testUsers || testUsers.length < 16) {
        throw new Error(usersError?.message || "Não foi possível encontrar os atletas de teste. Tente recarregar a página.");
    }

    // 4. Register these users into the category
    const registrations = testUsers.map(user => ({
        user_id: user.id,
        category_id: newCategoryData.id,
        status: RegistrationStatus.REGISTERED
    }));

    const { error: registrationError } = await supabase.from('player_registrations').insert(registrations);

    if (registrationError) {
        throw new Error(registrationError.message || "Falha ao inscrever atletas de teste.");
    }

    // 5. Close registrations for the category
    await closeRegistration(newCategoryData.id);

    // 6. Generate the bracket with pre-filled results
    await generateTestBracketWithResults(newCategoryData.id);

    return mapEventFromDb(newEventData);
};

// Helper function to generate test tournament with pre-filled results
const generateTestBracketWithResults = async (categoryId: string): Promise<void> => {
    // Generate groups and matches using the new step-by-step flow
    const category = await drawGroupsAndGenerateMatches(categoryId, { playersPerGroup: 4, numAdvancing: 2 });
    if (!category) throw new Error("Falha ao iniciar categoria de teste.");

    // Simulate group stage results
    const groupMatches = await getMatches(categoryId);
    const groupStageMatches = groupMatches.filter(m => m.stage === 'GROUP');

    for (const match of groupStageMatches) {
        if (match.player1Id && match.player2Id && match.status === 'SCHEDULED') {
            // Simulate a result: p1 wins 2-0 or 2-1, p2 wins half the time
            const p1Wins = Math.random() < 0.6; // Player 1 wins 60% of the time
            const setScores = p1Wins
                ? [{ p1: 11, p2: 8 }, { p1: 11, p2: 5 }]  // P1 wins 2-0
                : [{ p1: 11, p2: 9 }, { p1: 9, p2: 11 }, { p1: 11, p2: 7 }];  // P2 wins 2-1

            await updateMatchResultAndAdvance(categoryId, match.id, setScores);
        }
    }

    // Advance to knockout and simulate knockout results
    const advancedCategory = await finalizeGroupStage(categoryId);
    if (!advancedCategory) throw new Error("Falha ao finalizar fase de grupos.");

    const knockoutCategory = await advanceFromGroupStage(categoryId);
    if (!knockoutCategory) throw new Error("Falha ao gerar chaves da eliminatória.");

    // Simulate knockout stage results
    const knockoutMatches = (await getMatches(categoryId)).filter(m => m.stage === 'KNOCKOUT' && m.status === 'SCHEDULED');

    for (const match of knockoutMatches) {
        if (match.player1Id && match.player2Id) {
            // Simulate winner (50/50 chance)
            const p1Wins = Math.random() < 0.5;
            const setScores = p1Wins
                ? [{ p1: 11, p2: 9 }, { p1: 11, p2: 7 }]
                : [{ p1: 9, p2: 11 }, { p1: 11, p2: 9 }, { p1: 11, p2: 7 }];

            await updateMatchResultAndAdvance(categoryId, match.id, setScores);
        }
    }
};


// ============================================================================
// --- Club Members System Functions ---
// ============================================================================

/**
 * Obtém todos os clubes que um usuário gerencia (OWNER, ADMIN, STAFF)
 */
export const getManagedClubs = async (userId: string): Promise<ManagedClub[]> => {
    const { data, error } = await supabase
        .rpc('get_managed_clubs', { p_user_id: userId });
    
    if (error) {
        console.error('[CLUB-MEMBERS] Erro ao buscar clubes gerenciados:', error);
        return [];
    }
    
    return (data || []).map((row: any) => ({
        clubId: row.club_id,
        clubName: row.club_name,
        role: row.role as ClubMemberRole,
        joinedAt: row.joined_at
    }));
};

/**
 * Obtém todos os membros de um clube (filtro opcional por role)
 */
export const getClubMembers = async (clubId: string, role?: ClubMemberRole): Promise<ClubMemberWithUser[]> => {
    const { data, error } = await supabase
        .rpc('get_club_members', { 
            p_club_id: clubId,
            p_role: role || null
        });
    
    if (error) {
        console.error('[CLUB-MEMBERS] Erro ao buscar membros:', error);
        return [];
    }
    
    return (data || []).map((row: any) => ({
        id: row.member_id,
        clubId: clubId,
        userId: row.user_id,
        role: row.role as ClubMemberRole,
        status: row.status as ClubMemberStatus,
        joinedAt: row.joined_at,
        userName: row.user_name,
        userEmail: row.user_email
    }));
};

/**
 * Adiciona um membro ao clube
 */
export const addClubMember = async (
    clubId: string, 
    userId: string, 
    role: ClubMemberRole
): Promise<boolean> => {
    const { error } = await supabase
        .from('club_members')
        .insert({
            club_id: clubId,
            user_id: userId,
            role: role,
            status: ClubMemberStatus.ACTIVE
        });
    
    if (error) {
        console.error('[CLUB-MEMBERS] Erro ao adicionar membro:', error);
        return false;
    }
    
    return true;
};

/**
 * Atualiza o role ou status de um membro
 */
export const updateClubMemberRole = async (
    memberId: string,
    role?: ClubMemberRole,
    status?: ClubMemberStatus
): Promise<boolean> => {
    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    
    if (Object.keys(updateData).length === 0) return true;
    
    const { error } = await supabase
        .from('club_members')
        .update(updateData)
        .eq('id', memberId);
    
    if (error) {
        console.error('[CLUB-MEMBERS] Erro ao atualizar membro:', error);
        return false;
    }
    
    return true;
};

/**
 * Remove um membro do clube (soft delete via status)
 */
export const removeClubMember = async (memberId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('club_members')
        .update({ status: ClubMemberStatus.LEFT })
        .eq('id', memberId);
    
    if (error) {
        console.error('[CLUB-MEMBERS] Erro ao remover membro:', error);
        return false;
    }
    
    return true;
};

/**
 * Verifica se um usuário é membro de um clube (com role específico)
 */
export const isUserClubMember = async (
    userId: string, 
    clubId: string, 
    role?: ClubMemberRole
): Promise<boolean> => {
    let query = supabase
        .from('club_members')
        .select('id')
        .eq('user_id', userId)
        .eq('club_id', clubId)
        .eq('status', ClubMemberStatus.ACTIVE);
    
    if (role) {
        query = query.eq('role', role);
    }
    
    const { data, error } = await query.limit(1);
    
    if (error) {
        console.error('[CLUB-MEMBERS] Erro ao verificar membro:', error);
        return false;
    }
    
    return data !== null && data.length > 0;
};

/**
 * Verifica se um usuário pode gerenciar um clube (é OWNER ou ADMIN)
 */
export const canManageClub = async (userId: string, clubId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .rpc('can_manage_club', { 
            p_user_id: userId,
            p_club_id: clubId
        });
    
    if (error) {
        console.error('[CLUB-MEMBERS] Erro ao verificar permissão:', error);
        return false;
    }
    
    return data === true;
};

/**
 * Obtém o role de um usuário em um clube específico
 */
export const getUserClubRole = async (userId: string, clubId: string): Promise<ClubMemberRole | null> => {
    const { data, error } = await supabase
        .rpc('get_user_club_role', { 
            p_user_id: userId,
            p_club_id: clubId
        });
    
    if (error) {
        console.error('[CLUB-MEMBERS] Erro ao buscar role:', error);
        return null;
    }
    
    return data === 'NONE' ? null : (data as ClubMemberRole);
};

/**
 * Verifica se um usuário é jogador de um clube (para aplicar descontos)
 */
export const isClubPlayer = async (userId: string, clubId: string): Promise<boolean> => {
    const { data, error } = await supabase
        .rpc('is_club_player', { 
            p_user_id: userId,
            p_club_id: clubId
        });
    
    if (error) {
        console.error('[CLUB-MEMBERS] Erro ao verificar jogador:', error);
        return false;
    }
    
    return data === true;
};

// --- Dashboard Stats ---
export const getPlayerStats = async (userId: string): Promise<PlayerStats> => {
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('current_rating')
        .eq('id', userId)
        .single();

    if (userError || !user) {
        console.error("Error fetching player stats:", userError?.message);
        return { rating: 0, wins: 0, losses: 0, totalGames: 0 };
    }

    const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('winner_id')
        .eq('status', 'COMPLETED')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`);

    if (matchesError) {
        console.error("Error fetching matches for stats:", matchesError.message);
        return { rating: user.current_rating || 1000, wins: 0, losses: 0, totalGames: 0 };
    }

    const wins = matches.filter(m => m.winner_id === userId).length;
    const totalGames = matches.length;
    const losses = totalGames - wins;

    return { rating: user.current_rating || 1000, wins, losses, totalGames };
};

export const getClubStats = async (clubId: string): Promise<ClubStats> => {
    const { count: activeEvents, error: eventsError } = await supabase
        .from('tournament_events')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId);

    const { data: categoriesData, error: categoriesError } = await supabase
        .from('tournament_events')
        .select('tournament_categories!inner(id, player_registrations(count))')
        .eq('club_id', clubId);

    if (eventsError || categoriesError) {
        console.error("Error fetching club stats:", eventsError?.message || categoriesError?.message);
        return { activeEvents: 0, totalCategories: 0, totalRegistrations: 0 };
    }
    
    let totalCategories = 0;
    let totalRegistrations = 0;

    if(categoriesData) {
        categoriesData.forEach(event => {
            const categories = event.tournament_categories;
            if(Array.isArray(categories)) {
                totalCategories += categories.length;
                categories.forEach(cat => {
                    if(Array.isArray(cat.player_registrations) && cat.player_registrations[0]) {
                        totalRegistrations += cat.player_registrations[0].count;
                    }
                });
            }
        });
    }

    return { activeEvents: activeEvents || 0, totalCategories, totalRegistrations };
};

export const getRecentPlayerMatches = (userId: string): RecentMatch[] => {
    // This would require a more complex query to fetch opponent data.
    return [];
};

export const getRatingHistory = async (userId?: string): Promise<RatingHistory[]> => {
    let query = supabase.from('rating_history').select('*');
    if (userId) {
        query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) {
        console.error("Error fetching rating history:", error.message);
        return [];
    }
    return data.map(mapRatingHistoryFromDb);
}
