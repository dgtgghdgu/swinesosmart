import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock Users
const ADMIN_USER: User = {
  id: 'u_admin',
  name: '系统管理员',
  role: UserRole.ADMIN,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
};

const OPERATOR_USER: User = {
  id: 'u_op',
  name: '值班员 (只读)',
  role: UserRole.OPERATOR,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=operator'
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check local storage for persistent session
    const stored = localStorage.getItem('smartfarm_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const login = (role: UserRole) => {
    const newUser = role === UserRole.ADMIN ? ADMIN_USER : OPERATOR_USER;
    setUser(newUser);
    localStorage.setItem('smartfarm_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('smartfarm_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === UserRole.ADMIN
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
