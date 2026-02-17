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
  getUserParams: () => string;
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  getUserParams: () => "",
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
      const userData = {
        userId,
        email,
        name: name || 'Member'
      };
      setUser(userData);

      // Store in both sessionStorage and localStorage for redundancy
      try {
        sessionStorage.setItem('wixUser', JSON.stringify(userData));
        localStorage.setItem('wixUser', JSON.stringify(userData));
      } catch(e) {}

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
      // Try sessionStorage first, then localStorage
      try {
        const stored = sessionStorage.getItem('wixUser') || localStorage.getItem('wixUser');
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch(e) {}
    }

    setIsLoading(false);
  }, [searchParams]);

  // Helper to append user params to any URL
  const getUserParams = () => {
    if (!user) return "";
    return `?userId=${user.userId}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name)}`;
  };

  return (
    <UserContext.Provider value={{ user, isLoading, getUserParams }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}