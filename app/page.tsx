import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

        {/* LEFT SIDE */}
        <div className="space-y-6 animate-slide-up">
          <span
            className="neon-chip px-4 py-1 rounded-full text-sm font-semibold inline-block"
            style={{ background: "white", color: "var(--neon-ink)" }}
          >
            Invite-only fitness challenges
          </span>

          <h1 className="text-5xl font-display leading-tight">
            Queers and Allies Fitness Challenge
          </h1>

          <p className="text-lg text-slate-700 max-w-md">
            Spark friendly competition, track streaks, and keep your gym crew moving together.
            Create vibrant challenges and cheer each other on every day.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link href="/join">
              <button className="rainbow-cta px-6 py-3 rounded-full font-semibold text-base">
                Join the gym crew
              </button>
            </Link>

            <Link href="/login">
              <button className="px-6 py-3 rounded-full font-semibold border border-slate-300 bg-white/80">
                Log in
              </button>
            </Link>

            <Link href="/dashboard">
              <button className="px-6 py-3 rounded-full font-semibold border border-slate-300 bg-white/80">
                View dashboard
              </button>
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="neon-card rounded-3xl p-8 space-y-6 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">Live</span>
            <h2 className="font-semibold text-lg">Tonight's lineup</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow">
              <p className="font-semibold">Sprint Ladder</p>
              <p className="text-sm text-slate-600">4 members • 12 days left</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow">
              <p className="font-semibold">Core Circuit</p>
              <p className="text-sm text-slate-600">7 members • 9 days left</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow">
              <p className="font-semibold">Flex Friday</p>
              <p className="text-sm text-slate-600">5 members • 3 days left</p>
            </div>
          </div>

          <div className="pt-2 text-sm text-slate-700">
            <strong>Today's focus:</strong> Hydration + mobility reset
          </div>
        </div>

      </div>
    </main>
  );
}
