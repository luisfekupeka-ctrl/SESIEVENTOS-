import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  status: 'pending' | 'approved' | 'blocked';
  role: 'super_admin' | 'admin';
}

interface AuthContextType {
  loading: boolean;
  isAdmin: boolean;
  user: User | null;
  profile: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  loading: true, 
  isAdmin: false,
  user: null,
  profile: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const fetchProfile = async (userId: string) => {
    console.log("[Auth] Fetching profile for:", userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("[Auth] Error fetching profile details:", error.message, error.hint, error);
        return null;
      }
      console.log("[Auth] Profile found:", data);
      return data as Profile;
    } catch (err) {
      console.error("[Auth] Fetch profile exception:", err);
      return null;
    }
  };

  const updateAuthState = async (session: Session | null) => {
    const currentUser = session?.user ?? null;
    
    if (!currentUser) {
      console.log("[Auth] No session found, resetting state");
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    console.log("[Auth] Session active for:", currentUser.email);
    setUser(currentUser);
    
    const userProfile = await fetchProfile(currentUser.id);
    
    const isOwner = currentUser.email === 'luisfe.kupeka@gmail.com';
    if (userProfile && userProfile.status !== 'approved' && !isOwner) {
      console.log("[Auth] Profile not approved, signing out");
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    
    setProfile(userProfile);
    setLoading(false);
    console.log("[Auth] Initialization complete for:", currentUser.email, "Status:", userProfile?.status);
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    console.log("[Auth] Mounting AuthProvider - Starting init");

    // Handle initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[Auth] getSession completed");
      updateAuthState(session);
    });

    // Handle auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] onAuthStateChange event:", event);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        updateAuthState(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    console.log("[Auth] Attempting login for:", email);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.user) {
        const userProfile = await fetchProfile(data.user.id);
        if (userProfile) {
          console.log("[Auth] User profile loaded:", userProfile.role, "Status:", userProfile.status);
        }

        if (userProfile && userProfile.status !== 'approved' && !(data.user.email === 'luisfe.kupeka@gmail.com')) {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          throw new Error("Seu cadastro ainda não foi aprovado. Aguarde a liberação do administrador.");
        }
        
        setUser(data.user);
        setProfile(userProfile);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;

    if (data?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          email: email,
          status: 'pending',
          role: 'admin',
        });

      if (profileError) {
        console.error("Erro ao criar perfil pendente:", profileError);
      }
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setUser(null);
  };

  // Administrative override for owner
  const isOwner = user?.email === 'luisfe.kupeka@gmail.com';
  const effectiveProfile = isOwner ? { 
    ...profile, 
    role: 'super_admin' as const, 
    status: 'approved' as const 
  } : profile;

  return (
    <AuthContext.Provider value={{ 
      loading, 
      isAdmin: !!user && (isOwner || (effectiveProfile?.status === 'approved' && (effectiveProfile?.role === 'admin' || effectiveProfile?.role === 'super_admin'))), 
      user, 
      profile: effectiveProfile as Profile,
      login, 
      register,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
