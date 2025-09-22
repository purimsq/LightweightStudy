import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { usePageStateStore } from '@/stores/pageStateStore';

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar: string;
  learningPace: number;
  studyStreak: number;
  lastActiveDate?: string;
  lastLoginDate?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

interface SignupData {
  username: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  bio?: string;
  location?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if token is expired
  const isTokenExpired = (expiresAt: string): boolean => {
    return new Date(expiresAt) < new Date();
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');
        const storedExpiresAt = localStorage.getItem('tokenExpiresAt');

        if (storedToken && storedUser && storedExpiresAt) {
          // Check if token is expired
          if (isTokenExpired(storedExpiresAt)) {
            // Token expired, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('tokenExpiresAt');
            setUser(null);
            setToken(null);
          } else {
            // Token is valid, set state
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            
            // Verify token with server
            try {
              const response = await fetch('/api/auth/verify', {
                headers: {
                  'Authorization': `Bearer ${storedToken}`,
                },
              });

              if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
              } else {
                // Token invalid, clear storage
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                localStorage.removeItem('tokenExpiresAt');
                setUser(null);
                setToken(null);
              }
            } catch (error) {
              console.error('Token verification failed:', error);
              // Keep user logged in but don't update user data
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Auto-logout when token expires
  useEffect(() => {
    const checkTokenExpiry = () => {
      const expiresAt = localStorage.getItem('tokenExpiresAt');
      if (expiresAt && isTokenExpired(expiresAt)) {
        logout();
      }
    };

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60000);
    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store auth data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tokenExpiresAt', data.expiresAt);

      setToken(data.token);
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (userData: SignupData): Promise<void> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Store auth data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tokenExpiresAt', data.expiresAt);

      setToken(data.token);
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    // Call logout endpoint if token exists
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).catch(error => {
        console.error('Logout request failed:', error);
      });
    }

    // Clear all cached data for privacy
    queryClient.clear();
    
    // Clear Zustand store states on logout
    usePageStateStore.getState().clearAllStates();

    // Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiresAt');

    // Clear state
    setToken(null);
    setUser(null);

    // Navigate to login
    navigate('/login');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (!token) return;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    signup,
    logout,
    updateUser,
    refreshUser,
  };

  // Debug logging
  console.log("AuthContext state:", { 
    user: user?.name, 
    email: user?.email, 
    isAuthenticated: !!user && !!token,
    hasToken: !!token 
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
