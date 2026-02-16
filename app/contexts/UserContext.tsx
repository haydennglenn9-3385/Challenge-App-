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
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const name = searchParams.get('name');

    if (userId && email) {
      setUser({ 
        userId, 
        email, 
        name: name || 'Member' 
      });

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