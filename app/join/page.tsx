import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="neon-card rounded-3xl p-8 max-w-md w-full text-center space-y-6">
        <div>
          <h1 className="text-3xl font-display mb-2">Sign Up</h1>
          <p className="text-slate-600">Join the Queers and Allies Fitness Challenge community</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            When embedded in your Wix site, this will use Wix Members for sign-ups.
          </p>
          
          <Link href="/embed/challenges">
            <button className="w-full rainbow-cta px-6 py-3 rounded-full font-semibold">
              Continue to Challenges
            </button>
          </Link>

          <Link href="/">
            <button className="w-full px-6 py-3 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition">
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}