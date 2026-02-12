"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { createClient } from "@supabase/supabase-js";

type User = {
  id: string;
  wix_id: string;
  created_at: string;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        // 1. Read token from URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
          console.error("No token found in URL");
          return;
        }

        // 2. Decode token
        const decoded: any = jwtDecode(token);
        const wixId = decoded.wixId;

        if (!wixId) {
          console.error("Token missing wixId");
          return;
        }

        // 3. Supabase client
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // 4. Try to find user
        const { data: existingUser, error: findError } = await supabase
          .from("users")
          .select("*")
          .eq("wix_id", wixId)
          .single();

        if (findError && findError.code !== "PGRST116") {
          console.error("Error finding user:", findError);
        }

        let finalUser = existingUser;

        // 5. Create user if not found
        if (!existingUser) {
          const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert({ wix_id: wixId })
            .select()
            .single();

          if (createError) {
            console.error("Error creating user:", createError);
            return;
          }

          finalUser = newUser;
        }

        setUser(finalUser);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  // 6. Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Loading your account…
      </div>
    );
  }

  // 7. Render dashboard
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Welcome back!</h1>

      <div className="bg-white shadow rounded p-4">
        <p className="text-gray-700">Your Wix ID:</p>
        <p className="font-mono text-sm mt-1">{user?.wix_id}</p>
      </div>

      {/* Replace this with your real dashboard UI */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Your Challenges</h2>
        <p className="text-gray-600">Challenge data will go here.</p>
      </div>
    </div>
  );
}
