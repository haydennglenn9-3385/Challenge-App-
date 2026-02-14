"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setSuccess(true);
      setEmail("");
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
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Reset your password</p>
          <h1 className="text-3xl font-display">Forgot Password</h1>
        </div>

        {success && (
          <div className="neon-chip rounded-2xl p-3 text-sm font-semibold bg-green-50 border border-green-200 text-green-700">
            Check your email for a password reset link. It should arrive shortly.
          </div>
        )}

        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="border border-slate-200 p-3 rounded-2xl w-full bg-white/80"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={success}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className="rounded-full px-4 py-3 font-semibold rainbow-cta disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Remember your password? <a href="/login" className="font-semibold" style={{ color: "var(--neon-teal)" }}>Back to login</a>
        </p>
      </div>
    </div>
  );
}
