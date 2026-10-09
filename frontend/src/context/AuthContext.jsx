import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('campus_synq_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(true); // whether an admin exists

  // Fetch system registration status
  const checkStatus = useCallback(async () => {
    try {
      const res = await api.get('/auth/status');
      if (res && res.data) {
        setIsInitialized(res.data.isInitialized);
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
    }
  }, []);

  // Fetch current user details if token exists
  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('campus_synq_token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
        api.setToken(null);
        setToken(null);
      }
    } catch (err) {
      console.warn('Session verification failed:', err.message);
      setUser(null);
      api.setToken(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    loadUser();

    // Listen for unauthorized 401 events from api client
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      api.setToken(null);
    };

    window.addEventListener('campus_synq_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('campus_synq_unauthorized', handleUnauthorized);
    };
  }, [checkStatus, loadUser]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res && res.data) {
      const { token: receivedToken } = res.data;
      const userData = res.data.user || res.data.faculty || res.data.admin;
      api.setToken(receivedToken);
      setToken(receivedToken);
      setUser(userData);
      setIsInitialized(true);
      return userData;
    }
  };

  const signup = async (fullName, email, password, confirmPassword) => {
    const res = await api.post('/auth/signup', {
      fullName,
      email,
      password,
      confirmPassword
    });
    if (res && res.data) {
      const { token: receivedToken } = res.data;
      const userData = res.data.user || res.data.admin;
      api.setToken(receivedToken);
      setToken(receivedToken);
      setUser(userData);
      setIsInitialized(true);
      return userData;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Ignore network errors on logout
    } finally {
      api.setToken(null);
      setToken(null);
      setUser(null);
      await checkStatus();
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'ADMIN',
    isFaculty: user?.role === 'FACULTY' || user?.role === 'HOD_FACULTY',
    isDean: user?.role === 'DEAN',
    isLoading,
    isInitialized,
    login,
    signup,
    logout,
    refreshStatus: checkStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
