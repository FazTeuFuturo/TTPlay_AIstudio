import { createClient } from '@supabase/supabase-js';
// Certifique-se de que o caminho para 'types' está correto
import { User } from '../types'; 

// --- CORREÇÃO IMPORTANTE DE SEGURANÇA ---
// 1. LEIA as chaves das Variáveis de Ambiente.
//    NÃO coloque as chaves diretamente aqui.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Verifique se as variáveis foram carregadas
//    Isso ajuda a encontrar erros rapidamente.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Erro: Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não foram encontradas.");
}
// --- FIM DA CORREÇÃO ---

// 3. Crie o cliente com as variáveis seguras e opções personalizadas
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Desativa a atualização automática de token, que causa o recarregamento
    // ao focar na janela. A sessão ainda será persistida.
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 4. Sua função (estava correta, sem alterações)
export const getSupabaseUser = async (): Promise<(User & { clubId?: string }) | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error("Erro ao buscar perfil do usuário:", error);
        return null;
    }

    return userProfile as (User & { clubId?: string }) | null;
}
