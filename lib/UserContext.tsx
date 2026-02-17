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

  const saveUser = (userData: WixUser) => {
    setUser(userData);
    try {
      sessionStorage.setItem('wixUser', JSON.stringify(userData));
      localStorage.setItem('wixUser', JSON.stringify(userData));
    } catch(e) {}

    // Sync to Supabase
    fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wixId: userData.userId,
        email: userData.email,
        name: userData.name,
      }),
    }).catch(err => console.error('Failed to sync user:', err));
  };

  useEffect(() => {
    // 1. Check URL params first
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const name = searchParams.get('name');

    if (userId && email) {
      saveUser({ userId, email, name: name || 'Member' });
      setIsLoading(false);
      return;
    }

    // 2. Check localStorage/sessionStorage
    try {
      const stored = sessionStorage.getItem('wixUser') || localStorage.getItem('wixUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setIsLoading(false);
        return;
      }
    } catch(e) {}

    // 3. Listen for postMessage from Wix parent
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'WIX_USER' && data.userId && data.email) {
          saveUser({
            userId: data.userId,
            email: data.email,
            name: data.name || 'Member',
          });
        }
      } catch(e) {}
    };

    window.addEventListener('message', handleMessage);

    // Tell parent we're ready to receive user data
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage('READY', '*');
    }

    setIsLoading(false);

    return () => window.removeEventListener('message', handleMessage);
  }, [searchParams]);

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