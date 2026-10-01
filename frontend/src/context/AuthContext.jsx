import React, { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextCore";
import { API_URL } from "../config";

// Client-side JWT expiration inspector
export const isTokenExpired = (token) => {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
};

export default function AuthProvider({ children }) {
  // Synchronous initialization with expiration check
  const [token, setToken] = useState(() => {
    try {
      const stored = localStorage.getItem("auth_token");
      if (stored && !isTokenExpired(stored)) {
        return stored;
      }
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      return null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const storedToken = localStorage.getItem("auth_token");
      if (!storedToken || isTokenExpired(storedToken)) return null;
      const raw = localStorage.getItem("auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const storedToken = localStorage.getItem("auth_token");
      const storedUser = localStorage.getItem("auth_user");
      return Boolean(storedToken && !isTokenExpired(storedToken) && storedUser);
    } catch {
      return false;
    }
  });

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        let message = "Login failed";
        try {
          const errData = await res.json();
          message = errData.message || errData.error || message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
      const data = await res.json();
      setToken(data.token);
      setUser(data.data.user);
      setIsAuthenticated(true);
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.data.user));
      return data;
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    }
  }, []);

  // Validate stored token still maps to an existing user with proper Bearer header
  useEffect(() => {
    const verify = async () => {
      if (!token) return;
      if (isTokenExpired(token)) {
        console.warn("[Auth] Token expired; signing out");
        logout();
        return;
      }
      if (!user?._id) return;
      try {
        const res = await fetch(`${API_URL}/api/v1/users/${user._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 401 || res.status === 404) {
          console.warn("[Auth] Stored token rejected; clearing auth");
          logout();
        }
      } catch {
        // Network errors ignored; don't log out on transient connectivity issues
      }
    };
    verify();
  }, [token, user, logout]);

  return (
    <AuthContext.Provider
      value={{ token, user, isAuthenticated, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
