"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSearchParams } from "next/navigation";

interface WixUser {
  userId: string;
  email: string;
  name: string;
}

interface UserContextType {
  user: WixUser | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<WixUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // First check if user data is in URL params
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const name = searchParams.get('name');

    if (userId && email) {
      const userData = { 
        userId, 
        email, 
        name: name || 'Member' 
      };
      
      setUser(userData);
      
      // Store in sessionStorage so it persists across navigation
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('wixUser', JSON.stringify(userData));
      }

      // Sync user to Supabase
      fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wixId: userId,
          email: email,
          name: name || 'Member',
        }),
      }).catch(err => console.error('Failed to sync user:', err));
    } else {
      // Try to load from sessionStorage if not in URL
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('wixUser');
        if (stored) {
          setUser(JSON.parse(stored));
        }
      }
    }

    setIsLoading(false);
  }, [searchParams]);

  return (
    <UserContext.Provider value={{ user, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}