import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import type { User, InsertUser } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    queryFn: async () => {
      try {
        return await apiRequest<User>("GET", "/api/auth/me");
      } catch (error: any) {
        if (error.message?.includes("401")) {
          return null;
        }
        throw error;
      }
    },
    staleTime: Infinity, // Never consider data stale  
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Allow initial fetch to check session
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) => {
      return apiRequest<User>("POST", "/api/auth/login", credentials);
    },
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/me"], user);
    },
  });

  const signupMutation = useMutation({
    mutationFn: (data: InsertUser) => {
      return apiRequest<User>("POST", "/api/auth/signup", data);
    },
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/me"], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/me"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    signupPending: signupMutation.isPending,
  };
}
