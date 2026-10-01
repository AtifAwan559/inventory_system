import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate session on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        const userData = res?.data || res;
        if (userData && (userData._id || userData.id)) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (err) {
        // If /auth/me fails and user was stored, keep stored unless 401
        if (err.status === 401) {
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/auth/login', { email, password });
      const userData = response?.data || response?.user || response;
      const token = response?.token;

      if (token) {
        localStorage.setItem('token', token);
      }
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      return { success: true, data: userData };
    } catch (err) {
      const errMsg = err.message || 'Login failed';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/auth/register', userData);
      const userObj = response?.data || response?.user || response;
      const token = response?.token;

      if (token) {
        localStorage.setItem('token', token);
      }
      setUser(userObj);
      localStorage.setItem('user', JSON.stringify(userObj));

      return { success: true, data: userObj };
    } catch (err) {
      const errMsg = err.message || 'Registration failed';
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout request warning:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  };

  // Get current user profile
  const getProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response?.data || response;
      if (userData) {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
      return userData;
    } catch (err) {
      console.error('Get profile error:', err);
      return null;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    getProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};