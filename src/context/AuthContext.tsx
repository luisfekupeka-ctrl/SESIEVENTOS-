import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  loading: boolean;
  isAdmin: boolean;
  login: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  loading: true, 
  isAdmin: false,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "2102";

  useEffect(() => {
    // Check for existing session in localStorage
    const savedAdminStatus = localStorage.getItem('sesi_admin_auth');
    if (savedAdminStatus === 'true') {
      setIsAdmin(true);
    }
    setLoading(false);
  }, []);

  const login = async (pin: string) => {
    console.log("Tentativa de login com PIN");
    if (pin === ADMIN_PIN) {
      setIsAdmin(true);
      localStorage.setItem('sesi_admin_auth', 'true');
      console.log("Login administrativo bem-sucedido (Local PIN)");
    } else {
      console.warn("PIN incorreto.");
      throw new Error("PIN incorreto.");
    }
  };

  const logout = async () => {
    setIsAdmin(false);
    localStorage.removeItem('sesi_admin_auth');
  };

  return (
    <AuthContext.Provider value={{ loading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
