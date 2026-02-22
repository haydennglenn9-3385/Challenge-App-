"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const LGBTQ_FITNESS_FACTS = [
  "🏳️‍🌈 The first gay softball league was founded in 1977 in San Francisco - now there are over 40 leagues across North America!",
  "💪 Studies show LGBTQ+ folks who participate in community sports report 50% higher life satisfaction than those who don't.",
  "🏃 Tom Waddell founded the Gay Games in 1982. Now it attracts over 10,000 athletes from 70+ countries!",
  "⚽ Lesbian soccer teams have been organizing since the 1970s - before Title IX even existed!",
  "🎾 Billie Jean King came out in 1981 and became one of the first major athletes to champion LGBTQ+ rights in sports.",
  "🏋️ Research shows that LGBTQ-inclusive gyms see 30% higher member retention - community matters!",
  "💃 Queer folks invented voguing in the 1960s ballroom scene - a full-body workout disguised as fabulous performance art!",
];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SignupPage() {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [randomFact, setRandomFact] = useState("");

  useEffect(() => {
    setRandomFact(
      LGBTQ_FITNESS_FACTS[Math.floor(Math.random() * LGBTQ_FITNESS_FACTS.length)]
    );
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Email and password are required.");
      return;
    }
    if (!agreed) {
      setErrorMsg("Please agree to the Terms of Service to create your account.");
      return;
    }
    if (password.trim().length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        data: { display_name: displayName.trim() || email.split("@")[0] },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (data.user && !data.session) {
      // Email confirmation required — show message, switch to login
      setSuccessMsg("Almost there! Check your email to confirm your account, then log in.");
      setLoading(false);
    } else {
      router.push("/embed/home");
    }
  }

  async function handleGoogle() {
    setErrorMsg("");
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/embed/home` },
    });
    if (error) {
      setErrorMsg(error.message);
      setGoogleLoading(false);
    }
    // On success Supabase handles the redirect
  }

  return (
    <div className="page-padding space-y-8">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button
          onClick={() => router.push("/embed/home")}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
        >
          ← Home
        </button>
        <button
          onClick={() => router.push("/auth")}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
        >
          Log In
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        {/* LEFT: SIGNUP FORM */}
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">
              SIGN UP
            </p>
            <h2 className="text-4xl font-display mb-2">Create Your Account</h2>
            <p className="text-slate-600">
              Join the Queers & Allies Fitness community!
            </p>
          </div>

          <form
            onSubmit={handleSignup}
            className="neon-card rounded-3xl p-8 space-y-6"
          >
            {/* Error message */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm text-red-700 font-semibold">⚠️ {errorMsg}</p>
              </div>
            )}

            {/* Success message */}
            {successMsg && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="text-sm text-green-700 font-semibold">✅ {successMsg}</p>
              </div>
            )}

            {/* Display name */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">
                Display Name <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you'll appear to others"
                autoComplete="name"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Email */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Password */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                placeholder="8+ characters"
                autoComplete="new-password"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded accent-violet-600 cursor-pointer flex-shrink-0"
              />
              <span className="text-sm text-slate-600 leading-relaxed">
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-800 underline hover:text-violet-700">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-800 underline hover:text-violet-700">
                  Privacy Policy
                </a>.
              </span>
            </label>

            {/* Sign Up button */}
            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full rainbow-cta rounded-full px-6 py-3 font-semibold hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-semibold">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Google button */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 rounded-full px-6 py-3 font-semibold border border-slate-300 bg-white/80 hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
            >
              {/* Google icon */}
              <svg width="18" height="18" viewBox="0 0 18 18" className="flex-shrink-0">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>

            {/* Switch to login */}
            <div className="pt-2 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-600 mb-3">Already have an account?</p>
              <button
                type="button"
                onClick={() => router.push("/auth")}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900 underline"
              >
                Log in
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT: FUN FACTS + STEPS */}
        <div className="space-y-6">
          <div className="neon-card rounded-3xl p-8">
            <h3 className="text-xl font-semibold mb-4">💡 Did you know?</h3>
            {randomFact ? (
              <p className="text-slate-700 leading-relaxed">{randomFact}</p>
            ) : (
              <p className="text-slate-400">Loading fun fact...</p>
            )}
          </div>

          <div className="neon-card rounded-3xl p-8 space-y-4">
            <h3 className="text-xl font-semibold mb-2">✨ What happens next?</h3>
            <div className="space-y-3 text-slate-700">
              <div className="flex gap-3">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <p className="font-semibold">Create your account</p>
                  <p className="text-sm text-slate-600">You'll unlock access to all challenges</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <p className="font-semibold">Start your streak</p>
                  <p className="text-sm text-slate-600">Check in daily to build momentum</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">3️⃣</span>
                <div>
                  <p className="font-semibold">Join challenges</p>
                  <p className="text-sm text-slate-600">Use codes or browse public challenges</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .page-padding {
          padding-left: 16px;
          padding-right: 16px;
          padding-top: 16px;
        }
        @media (min-width: 768px) {
          .page-padding {
            padding-left: 24px;
            padding-right: 24px;
            padding-top: 24px;
          }
        }
      `}</style>
    </div>
  );
}