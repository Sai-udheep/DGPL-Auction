import React, { useState, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextCore";
import { API_URL } from "../config";

export default function AuthProvider({ children }) {
  // Synchronous initialization from localStorage prevents flash-of-unauthenticated redirect on refresh
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("auth_token") || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
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
      return !!(storedToken && storedUser);
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
      if (!token || !user?._id) return;
      try {
        const res = await fetch(`${API_URL}/api/v1/users/${user._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        // Only clear auth if user was explicitly deleted (404)
        if (res.status === 404) {
          console.warn("[Auth] Stored user not found; clearing auth");
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
