"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setLoading } = useAuthStore();

  useEffect(() => {
    // Initialize auth state on client
    const initAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const user = await response.json();
          useAuthStore.getState().login(user);
        } else {
          useAuthStore.getState().logout();
        }
      } catch (error) {
        useAuthStore.getState().logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [setLoading]);

  return <>{children}</>;
}

