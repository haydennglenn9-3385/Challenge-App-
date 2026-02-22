"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Email and password are required.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
        >
          ← Home
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
          >
            Log In
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        {/* Left: Signup Form */}
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">SIGN UP</p>
            <h2 className="text-4xl font-display mb-2">Create Your Account</h2>
            <p className="text-slate-600">Join the Queers & Allies Fitness community!</p>
          </div>

          <form onSubmit={handleSignup} className="neon-card rounded-3xl p-8 space-y-6">
            {errorMsg && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm text-amber-700 font-semibold">{errorMsg}</p>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg("");
                }}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg("");
                }}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rainbow-cta rounded-full px-6 py-3 font-semibold hover:shadow-xl transition-shadow disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>

            <div className="pt-2 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-600 mb-3">Already have an account?</p>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900 underline"
              >
                Log in
              </button>
            </div>
          </form>
        </div>

        {/* Right: Cute Info Card */}
        <div className="neon-card rounded-3xl p-8 space-y-4">
          <h3 className="text-xl font-semibold mb-2">✨ Welcome!</h3>
          <p className="text-slate-700 leading-relaxed">
            Create your account to join challenges, track your streak, cheer on teammates, and be part of a joyful, inclusive fitness community.
          </p>
        </div>
      </div>
    </div>
  );
}
