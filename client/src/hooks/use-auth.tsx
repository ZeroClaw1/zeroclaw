import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import type { AuthUser } from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginError: string | null;
  registerError: string | null;
  isLoginPending: boolean;
  isRegisterPending: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Check session on mount — returns null on 401 instead of throwing
  const {
    data: user,
    isLoading,
  } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return (await res.json()) as AuthUser;
    },
    onSuccess: (data) => {
      // Set the user directly in the query cache so AuthGate re-renders immediately
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, username, password }: { email: string; username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", { email, username, password });
      return (await res.json()) as AuthUser;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  const login = async (email: string, password: string) => {
    loginMutation.reset();
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (email: string, username: string, password: string) => {
    registerMutation.reset();
    await registerMutation.mutateAsync({ email, username, password });
  };

  const logout = async () => {
    try { await apiRequest("POST", "/api/auth/logout"); } catch {}
    queryClient.setQueryData(["/api/auth/me"], null);
    // Clear all cached data from the previous user
    queryClient.clear();
    // Redirect to landing page
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        login,
        register,
        logout,
        loginError: loginMutation.error?.message ?? null,
        registerError: registerMutation.error?.message ?? null,
        isLoginPending: loginMutation.isPending,
        isRegisterPending: registerMutation.isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
