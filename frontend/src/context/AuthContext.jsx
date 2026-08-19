import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.plantopark.com/api';

  // Helper to format image URLs (converts /uploads/... to full AWS EC2 server URL)
  const getImageUrl = (url) => {
    if (!url) return 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=1200&q=80';
    if (typeof url !== 'string') return url;
    if (url.startsWith('data:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/')) {
      return `https://api.plantopark.com${url}`;
    }
    if (url.startsWith('uploads/')) {
      return `https://api.plantopark.com/${url}`;
    }
    return url;
  };

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await fetch(`${API_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) {
            setUser(data);
          } else {
            logout();
          }
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  // Role-specific login helper
  const loginForRole = async (role, email, password) => {
    const endpoint = `${API_URL}/auth/${role}/login`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.message || 'Login failed');
      if (data.isEmailVerified === false) {
        err.isEmailVerified = false;
        err.email = data.email;
      }
      throw err;
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser({
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      status: data.status,
      contact: data.contact,
      isEmailVerified: data.isEmailVerified,
    });
    return data;
  };

  const signupForRole = async (role, name, email, password, contact) => {
    const endpoint = `${API_URL}/auth/${role}/signup`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, contact }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'Signup failed');
    
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser({
        _id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        contact: data.contact,
        isEmailVerified: data.isEmailVerified,
      });
    }

    return data;
  };

  // Legacy fallback helpers (mapping to role-specific internally or legacy endpoint)
  const login = async (email, password) => {
    // If logging in via generic route, try legacy login
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.message || 'Login failed');
      if (data.isEmailVerified === false) {
        err.isEmailVerified = false;
        err.email = data.email;
      }
      throw err;
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser({
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      status: data.status,
      contact: data.contact,
      isEmailVerified: data.isEmailVerified,
    });
    return data;
  };

  const signup = async (name, email, password, role, contact) => {
    return signupForRole(role, name, email, password, contact);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      signup,
      loginForRole,
      signupForRole,
      logout,
      API_URL,
      getImageUrl,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
