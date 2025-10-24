import { createClient } from '@supabase/supabase-js';
import { User } from '../types';

const supabaseUrl = 'https://luljbzljfazxqovqaxsa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1bGpiemxqZmF6eHFvdnFheHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNTc4MTksImV4cCI6MjA3NjgzMzgxOX0.4C0v_4jfifO_prWAVmWCloJjr9fQCWuY36SA-zgJqhg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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