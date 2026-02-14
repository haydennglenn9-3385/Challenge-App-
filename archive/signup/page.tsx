"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";
import { isEmailInvited } from "@/lib/storage";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(pwd)) return "Password must contain uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Password must contain lowercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain a number";
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const inviteOnly = process.env.NEXT_PUBLIC_INVITE_ONLY === "true";
    if (inviteOnly && !isEmailInvited(email)) {
      setError("Invite required. Ask your gym manager for access.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setValidationErrors(prev => ({ ...prev, password: passwordError }));
      return;
    }
    if (password !== confirmPassword) {
      setValidationErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signupError } = await supabase.auth.signUp({
        email, password, options: { data: { name } }
      });
      if (signupError) throw new Error(signupError.message);
      if (!data.user) throw new Error("Signup failed");
      const { error: profileError } = await supabase.from("users").insert({ id: data.user.id, name, avatar_url: null });
      if (profileError) throw new Error("Profile setup failed");
      router.push(data.user.confirmed_at ? "/login?message=Success" : `/verify-email?email=${encodeURIComponent(email)}`);
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
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Invite only</p>
          <h1 className="text-3xl font-display">Create Account</h1>
        </div>
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Full Name</label>
            <input id="name" type="text" placeholder="John Doe" className="border border-slate-200 p-3 rounded-2xl w-full bg-white/80" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input id="email" type="email" placeholder="you@example.com" className="border border-slate-200 p-3 rounded-2xl w-full bg-white/80" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <input id="password" type="password" placeholder="••••••••" className={`border border-slate-200 p-3 rounded-2xl w-full bg-white/80 ${validationErrors.password ? "border-red-500" : ""}`} value={password} onChange={e => { setPassword(e.target.value); setValidationErrors(prev => ({ ...prev, password: undefined })); }} required />
            {validationErrors.password && <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>}
            <p className="text-slate-500 text-xs mt-1">8+ chars, uppercase, lowercase, number</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">Confirm Password</label>
            <input id="confirmPassword" type="password" placeholder="••••••••" className={`border border-slate-200 p-3 rounded-2xl w-full bg-white/80 ${validationErrors.confirmPassword ? "border-red-500" : ""}`} value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setValidationErrors(prev => ({ ...prev, confirmPassword: undefined })); }} required />
            {validationErrors.confirmPassword && <p className="text-red-500 text-sm mt-1">{validationErrors.confirmPassword}</p>}
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl">{error}</div>}
          <button type="submit" disabled={loading} className="rounded-full px-4 py-3 font-semibold rainbow-cta">
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>
        <p className="text-center text-sm text-slate-600">Have an account? <a href="/login" className="font-semibold" style={{ color: "var(--neon-teal)" }}>Log in</a></p>
      </div>
    </div>
  );
}
