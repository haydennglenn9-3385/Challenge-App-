"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setMessage(sp.get("message"));
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-xl mx-auto neon-card rounded-3xl p-8 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Welcome back</p>
          <h1 className="text-3xl font-display">Log In</h1>
        </div>
        {message && <div className="neon-chip rounded-2xl p-3 text-sm font-semibold">{message}</div>}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input id="email" type="email" placeholder="you@example.com" className="border border-slate-200 p-3 rounded-2xl w-full bg-white/80" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <input id="password" type="password" placeholder="••••••••" className="border border-slate-200 p-3 rounded-2xl w-full bg-white/80" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl">{error}</div>}
          <button type="submit" disabled={loading} className="rounded-full px-4 py-3 font-semibold rainbow-cta">
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <p className="text-center text-sm text-slate-600">No account? <a href="/signup" className="font-semibold" style={{ color: "var(--neon-teal)" }}>Sign up</a></p>
      </div>
    </div>
  );
}
