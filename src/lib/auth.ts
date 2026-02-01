import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
}

export async function signUp(email: string, password: string, phone: string, name: string) {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        phone,
        name,
      },
    },
  });
  
  return { data, error };
}

export async function signIn(phone: string, password: string) {
  // First, find the email associated with this phone number
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('phone', phone)
    .single();
  
  if (profileError || !profile) {
    return { data: null, error: { message: 'No account found with this phone number' } };
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });
  
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) return false;
  return data.role === 'admin';
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  return { data, error };
}

export async function updateProfile(userId: string, updates: {
  name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  bank_name?: string;
  upi_id?: string;
}) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  return { data, error };
}
