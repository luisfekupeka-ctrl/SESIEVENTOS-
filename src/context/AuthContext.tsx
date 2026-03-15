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
        console.error("[Auth] Error fetching profile:", error);
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
    
    // If no user, reset and stop loading
    if (!currentUser) {
      console.log("[Auth] No session found, resetting state");
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    // If user changed or profile is missing, fetch it
    console.log("[Auth] Session active for:", currentUser.email);
    setUser(currentUser);
    
    const userProfile = await fetchProfile(currentUser.id);
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
    setLoading(true); // Re-enter loading state during login
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.user) {
        console.log("[Auth] Login successful, waiting for profile...");
        const userProfile = await fetchProfile(data.user.id);
        
        if (userProfile && userProfile.status !== 'approved') {
          console.warn("[Auth] Account not approved:", userProfile.status);
          await supabase.auth.signOut();
          setProfile(null);
          setUser(null);
          throw new Error("Sua conta está aguardando aprovação ou foi bloqueada.");
        }
        
        setUser(data.user);
        setProfile(userProfile);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      loading, 
      isAdmin: !!user && profile?.status === 'approved', 
      user, 
      profile,
      login, 
      register,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
