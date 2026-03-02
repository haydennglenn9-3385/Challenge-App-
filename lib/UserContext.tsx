"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";

interface AppUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface UserContextType {
  user: AppUser | null;
  isLoading: boolean;
  getUserParams: () => string;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  getUserParams: () => "",
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      .select("id, email, name, role")
      .eq("id", authId)
      .single();

    setUser(data ?? null);
    setIsLoading(false);
  }

  // Kept for compatibility — returns empty string since we no longer pass user via URL
  const getUserParams = () => "";

  return (
    <UserContext.Provider value={{ user, isLoading, getUserParams }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}