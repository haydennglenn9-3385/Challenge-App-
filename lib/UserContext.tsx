"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";

interface AppUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  avatar_emoji?: string;
  onboarded_at?: string | null;
}

interface UserContextType {
  user: AppUser | null;
  isLoading: boolean;
  needsOnboarding: boolean;
  setOnboarded: () => void;
  getUserParams: () => string;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  needsOnboarding: false,
  setOnboarded: () => {},
  getUserParams: () => "",
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Keep in sync on auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(authId: string) {
    const { data } = await supabase
      .from("users")
      .select("id, email, name, role, avatar_emoji, onboarded_at")
      .eq("id", authId)
      .single();

    setUser(data ?? null);
    setNeedsOnboarding(!!data && data.onboarded_at == null);
    setIsLoading(false);
  }

  function setOnboarded() {
    setNeedsOnboarding(false);
    setUser(prev => prev ? { ...prev, onboarded_at: new Date().toISOString() } : prev);
  }

  // Kept for compatibility — returns empty string since we no longer pass user via URL
  const getUserParams = () => "";

  return (
    <UserContext.Provider value={{ user, isLoading, needsOnboarding, setOnboarded, getUserParams }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}