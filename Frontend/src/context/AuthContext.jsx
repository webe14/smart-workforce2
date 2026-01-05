import React, { createContext, useState } from 'react';

export const AuthContext = createContext();
export const SidebarContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (userData) => {
    // Store user data in session storage for persistence
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedData) => {
    // Merge updated data with existing user data
    const updatedUser = { ...user, ...updatedData };
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // Initialize user from session storage on mount
  React.useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const SidebarProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};