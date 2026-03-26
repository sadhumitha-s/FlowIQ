/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';

type User = { id: string; email: string };

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialToken = localStorage.getItem('token');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(initialToken);
  const [loading, setLoading] = useState(Boolean(initialToken));

  const logout = () => {
    localStorage.removeItem('token');
    api.setToken('');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (token) {
      api.setToken(token);
      api.getProfile().then(u => {
        if (u) setUser(u);
        else logout();
        setLoading(false);
      }).catch(() => {
        logout();
        setLoading(false);
      });
    }
  }, [token]);

  const login = (newToken: string) => {
    setLoading(true);
    localStorage.setItem('token', newToken);
    api.setToken(newToken);
    setToken(newToken);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
