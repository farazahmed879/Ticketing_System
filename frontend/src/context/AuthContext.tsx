import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { setDeleteAllowed } from "../utils/deleteAccess";
import { useQueryClient } from "@tanstack/react-query";
import api, {
  refreshAccessToken,
  serverLogout,
  SESSION_EXPIRED_EVENT,
} from "../services/api";
import { socket, connectSocket, disconnectSocket } from "../services/socket";

import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  loading: boolean;
  updateUser: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  // Keep the module-level delete flag (used by Delete buttons) in step with
  // the logged-in user's role. Idempotent, so setting it during render is fine.
  setDeleteAllowed(user?.role?.canDelete !== false);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Restore the session on page load. An expired access token is renewed by
  // the api interceptor; with no token at all (e.g. a new tab after the
  // browser was closed), try the refresh cookie before showing the login page.
  useEffect(() => {
    (async () => {
      try {
        if (!localStorage.getItem("token")) {
          const token = await refreshAccessToken();
          if (!token) return;
        }
        const res = await api.get("/auth/me");
        setUser(res.data);
        connectSocket();
      } catch {
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    })();
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
    // End the session server-side too, so the refresh cookie can't revive it.
    void serverLogout();
    localStorage.removeItem("token");
    sessionStorage.clear();
    // The QueryClient lives for the whole SPA lifetime and logout only does a
    // client-side navigate (no page reload), so its cache would otherwise
    // survive and be served to the next user who logs in.
    queryClient.clear();
    setUser(null);
    disconnectSocket();
  };

  // The server rejects the socket handshake once the (15-minute) access token
  // has expired — typical after the laptop wakes up — and socket.io does NOT
  // retry after a server-side rejection. Renew the token and reconnect; only
  // if the session itself is gone, log out.
  useEffect(() => {
    const onConnectError = async (err: Error) => {
      if (err.message !== "Invalid token" && err.message !== "Authentication required") return;
      const token = await refreshAccessToken();
      if (token) socket.connect();
      else logout();
    };
    const onSessionExpired = () => logout();

    socket.on("connect_error", onConnectError);
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => {
      socket.off("connect_error", onConnectError);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable identity: MainLayout's socket effect depends on it.
  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
