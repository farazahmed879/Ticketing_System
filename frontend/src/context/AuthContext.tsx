import React, { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api
        .get("/auth/me")
        .then((res) => {
          setUser(res.data);
          connectSocket();
        })
        .catch(() => {
          localStorage.removeItem("token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem("token", token);
    // Drop any cached queries from a previous session (e.g. the /auth/me
    // bootstrap or a prior user who didn't log out cleanly) so this user never
    // sees stale data.
    queryClient.clear();
    setUser(userData);
    connectSocket();
  };

  const logout = () => {
    localStorage.removeItem("token");
    // The QueryClient lives for the whole SPA lifetime and logout only does a
    // client-side navigate (no page reload), so its cache would otherwise
    // survive and be served to the next user who logs in.
    queryClient.clear();
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
