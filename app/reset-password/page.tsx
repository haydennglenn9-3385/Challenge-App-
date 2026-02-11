"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/login?message=Password reset successfully. Please log in.");
      }, 2000);
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
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Create a new password</p>
          <h1 className="text-3xl font-display">Reset Password</h1>
        </div>

        {success && (
          <div className="neon-chip rounded-2xl p-3 text-sm font-semibold bg-green-50 border border-green-200 text-green-700">
            Password reset successfully! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">New Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="border border-slate-200 p-3 rounded-2xl w-full bg-white/80"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={success}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              className="border border-slate-200 p-3 rounded-2xl w-full bg-white/80"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
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
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600">
          <a href="/login" className="font-semibold" style={{ color: "var(--neon-teal)" }}>Back to login</a>
        </p>
      </div>
    </div>
  );
}
