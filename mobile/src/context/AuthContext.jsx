import { createContext, useContext, useState, useEffect } from 'react';
import { hasStoredToken, getMe, logout as apiLogout } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app start, check if we have a stored token and fetch the user profile.
  useEffect(() => {
    (async () => {
      try {
        const tokenExists = await hasStoredToken();
        if (tokenExists) {
          const data = await getMe();
          setUser(data);
        }
      } catch {
        // Token is expired or invalid — silently drop it.
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(userData) {
    setUser(userData);
  }

  async function logout() {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
