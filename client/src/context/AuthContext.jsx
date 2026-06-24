import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
const TOKEN_KEY = 'bakery_auth_token';
const USER_KEY  = 'bakery_auth_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });

  // Validate stored token on mount
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => {
      if (!r.ok) logout();
    }).catch(() => logout());
  }, []); // eslint-disable-line

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao fazer login.');
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Authenticated fetch — adds Bearer token automatically
  const authFetch = useCallback((url, options = {}) => {
    let targetUrl = url;
    const localBase1 = `http://localhost:5000`;
    const localBase2 = `http://${window.location.hostname}:5000`;
    if (targetUrl.startsWith(localBase1)) {
      targetUrl = API_BASE + targetUrl.slice(localBase1.length);
    } else if (targetUrl.startsWith(localBase2)) {
      targetUrl = API_BASE + targetUrl.slice(localBase2.length);
    }

    return fetch(targetUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, [token]);

  // Role helpers
  const isGerente = user?.role === 'gerente';
  const isCaixa   = user?.role === 'caixa' || isGerente;
  const isEstoque = user?.role === 'estoque' || isGerente;

  const updateCurrentUser = useCallback((updatedUser) => {
    const newUser = { ...user, ...updatedUser };
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authFetch, isGerente, isCaixa, isEstoque, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
