import { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { hasStoredToken, getMe, logout as apiLogout } from '../api/auth';
import { registerPushNotifications } from '../utils/notifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {

          const data = await getMe();
          setUser(data);
        } else {
          const tokenExists = await hasStoredToken();
          if (tokenExists) {
            const data = await getMe();
            setUser(data);
            registerPushNotifications().catch(() => {});
          }
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(userData) {
    setUser(userData);

    registerPushNotifications().catch(() => {});
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
