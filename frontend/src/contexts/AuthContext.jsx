import { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi, setSessionId, clearSession } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const userData = await authApi.me();
        setUser(userData);
      } catch (error) {
        // Not logged in or session expired
        clearSession();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    setSessionId(response.sessionId);
    setUser(response.user);
    return response.user;
  };

  const register = async (email, password, name) => {
    const response = await authApi.register({ email, password, name });
    setSessionId(response.sessionId);
    setUser(response.user);
    return response.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors
    }
    clearSession();
    setUser(null);
  };

  const updateProfile = async (data) => {
    const updated = await authApi.updateProfile(data);
    setUser(prev => ({ ...prev, ...updated }));
    return updated;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
