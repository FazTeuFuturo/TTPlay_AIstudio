import { TOURNAMENT_EVENTS, INITIAL_MATCHES_CAT_1, CLUBS, TOURNAMENT_CATEGORIES } from './constants';
import { TournamentEvent, User, Match, UserSession, Role, PlayerRegistration, RegistrationStatus, Club, TournamentStatus, Group, TournamentCategory, Gender, TournamentFormat, CartItem, SubscriptionPlan, DiscountRule, RatingHistory, PlayerStats, ClubStats, RecentMatch } from './types';
import { supabase } from './lib/supabaseClient';

const CART_KEY = 'shopping_cart';

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
    kFactor: data.k_factor,
});


// --- Initialization ---
export const initializeDatabase = async () => {
    console.log("Initializing database and seeding test users...");
    const testUsersToSeed = [
        {
            email: 'admin@ttplay.com',
            password: 'password123',
            profile: {
                name: 'Admin do Clube',
                role: Role.CLUB_ADMIN,
                gender: Gender.MALE,
                birth_date: '1980-01-01',
            },
            club: {
                name: 'Madureira Esporte Clube',
                subscription: SubscriptionPlan.PRO,
                logo: 'https://picsum.photos/seed/clubtest/100/100',
            }
        },
        {
            email: 'player@ttplay.com',
            password: 'password123',
            profile: {
                name: 'Leandro Guerra de Souza',
                role: Role.PLAYER,
                gender: Gender.MALE,
                birth_date: '1995-05-05',
            }
        }
    ];

    for (const userData of testUsersToSeed) {
        // Client-side safe way to check for user existence
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: userData.email,
            password: userData.password,
        });

        let userId: string | undefined = signInData.user?.id;

        if (signInError && signInError.message === 'Invalid login credentials') {
            // User does not exist, so create them
            console.log(`Creating test user: ${userData.email}`);
            const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
            });

            if (signUpError || !newUser) {
                console.error(`Failed to create test user ${userData.email}:`, signUpError?.message);
                continue;
            }
            userId = newUser.id;

            // Update profile for the newly created user
            const { error: profileUpdateError } = await supabase
                .from('users')
                .update(userData.profile)
                .eq('id', userId);
            
            if (profileUpdateError) console.error(`Failed to update profile for ${userData.email}:`, profileUpdateError.message);
        
        } else if (signInError) {
            // Another sign-in error occurred
            console.error(`Error checking for user ${userData.email}:`, signInError.message);
            continue;
        }

        // At this point, user exists (either pre-existing or just created).
        // Now handle club creation for admin.
        if (userId && userData.profile.role === Role.CLUB_ADMIN && userData.club) {
            const { data: existingClub } = await supabase.from('clubs').select('id').eq('admin_id', userId).single();
            if (!existingClub) {
                 console.log(`Creating club for ${userData.email}`);
                 const { data: newClub, error: clubInsertError } = await supabase
                    .from('clubs')
                    .insert({ ...userData.club, admin_id: userId })
                    .select('id')
                    .single();

                if (clubInsertError) {
                     console.error(`Failed to create club for ${userData.email}:`, clubInsertError.message);
                } else if (newClub) {
                    const {error: clubLinkError } = await supabase.from('users').update({ club_id: newClub.id }).eq('id', userId);
                    if(clubLinkError) console.error(`Failed to link club to admin ${userData.email}:`, clubLinkError.message);
                }
            }
        }
        
        // Sign out to clean up the session before the next loop iteration or app start
        await supabase.auth.signOut();
    }
};


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
        throw new Error("Campos obrigatórios ausentes para o clube ou administrador.");
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) throw new Error(`Erro ao cadastrar administrador: ${signUpError.message}`);
    if (!authData.user) throw new Error("Não foi possível criar o usuário administrador.");
    
    const adminId = authData.user.id;

    // The trigger will create a basic user profile. Now create the club.
    const { data: newClub, error: clubError } = await supabase
        .from('clubs')
        .insert({
            name: clubData.name!,
            admin_id: adminId,
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
        throw new Error(`Erro ao criar o clube: ${clubError.message}`);
    }

    // Now, update the admin's profile with role and club link.
    const { data: updatedAdmins, error: adminUpdateError } = await supabase
        .from('users')
        .update({
            name,
            birth_date: birthDate,
            gender,
            role: Role.CLUB_ADMIN,
            club_id: newClub.id,
        })
        .eq('id', adminId)
        .select();
    
    if (adminUpdateError) {
        throw new Error(`Erro ao atualizar perfil do administrador: ${adminUpdateError.message}`);
    }

    if (!updatedAdmins || updatedAdmins.length === 0) {
        throw new Error("Falha ao recuperar o perfil do admin atualizado.");
    }

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
    let query = supabase.from('tournament_categories').select('*, player_registrations(user_id, status)');

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
    const { data, error } = await supabase.from('tournament_categories').select('*, player_registrations(user_id, status)').eq('id', categoryId).single();
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
    return data;
};
export const getGroups = async (categoryId: string): Promise<Group[]> => {
    const { data, error } = await supabase.from('groups').select('*').eq('category_id', categoryId);
    if (error) {
        console.error("Error fetching groups:", error.message);
        return [];
    }
    return data.map(g => ({ ...g, playerIds: [] })); // Placeholder for playerIds
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
export const updateMatchResultAndAdvance = async (categoryId: string, matchId: string, setScores: {p1: number, p2: number}[]): Promise<TournamentCategory | null> => {
    // This function remains complex and would ideally be a Supabase Edge Function for transactional integrity.
    // For now, we'll perform the steps client-side.
    console.log("Updating match result... (This is a complex operation and will be fully implemented later)");
    const category = await getCategoryById(categoryId);
    return category || null;
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
        k_factor: data.kFactor
    }).select('*, player_registrations(user_id, status)').single();
    
    if (error || !newCategoryData) throw new Error(error?.message || "Failed to create category");
    return mapCategoryFromDb(newCategoryData);
}

export const updateCategory = async (categoryId: string, data: Partial<Omit<TournamentCategory, 'id' | 'registrations' | 'status'>>): Promise<TournamentCategory> => {
    const { data: updatedCategoryData, error } = await supabase.from('tournament_categories').update({
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
        k_factor: data.kFactor
    }).eq('id', categoryId).select('*, player_registrations(user_id, status)');
    
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
    const { data, error } = await supabase.from('tournament_categories').update({ status: TournamentStatus.REGISTRATION_CLOSED }).eq('id', categoryId).select('*, player_registrations(user_id, status)');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("Não foi possível encerrar as inscrições. Verifique suas permissões (RLS).");
    return mapCategoryFromDb(data[0]);
}

export const startCategory = async (categoryId: string): Promise<TournamentCategory> => {
    // This logic should be moved to a Supabase Edge Function
    console.log("Starting category... (This is a complex operation and will be fully implemented later)");
    const category = await getCategoryById(categoryId);
    if (!category) throw new Error("Category not found");
    return category;
};

export const reopenRegistration = async (categoryId: string): Promise<TournamentCategory> => {
    const { data, error } = await supabase.from('tournament_categories').update({ status: TournamentStatus.REGISTRATION }).eq('id', categoryId).select('*, player_registrations(user_id, status)');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("Não foi possível reabrir as inscrições. Verifique suas permissões (RLS).");
    return mapCategoryFromDb(data[0]);
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

export const transferClubAdminship = (clubId: string, newAdminEmail: string, currentAdminId: string): {success: boolean} => {
    if (!newAdminEmail) throw new Error("O e-mail do novo administrador é obrigatório.");
    console.error("transferClubAdminship is not implemented for Supabase yet. This requires a secure Edge Function.");
    return { success: false };
}

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
    // FIX: Map the date from the DB to the expected type format
    return data.map(h => ({ ...h, date: h.created_at }));
}