"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email || null);
      setName((user?.user_metadata?.name as string) || null);
      setLoading(false);
    };
    loadProfile();
  }, []);

  if (loading) {
    return <div className="neon-card rounded-3xl p-6">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Profile</p>
        <h2 className="text-3xl font-display">Your Account</h2>
      </div>

      <div className="neon-card rounded-3xl p-6 space-y-4">
        <div>
          <p className="text-xs text-slate-400">Name</p>
          <p className="text-lg font-semibold">{name || "Add your name"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Email</p>
          <p className="text-lg font-semibold">{email || "Not available"}</p>
        </div>
      </div>
    </div>
  );
}
