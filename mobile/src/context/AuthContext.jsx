import { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { hasStoredToken, getMe, logout as apiLogout } from '../api/auth';
import { registerPushNotifications } from '../utils/notifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app start, check if we have a stored token and fetch the user profile.
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          // Browser manages session cookies automatically via withCredentials
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
    // RF11.7: register for push notifications after login
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
