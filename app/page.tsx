import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

        {/* LEFT SIDE */}
        <div className="space-y-6">
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
            <Link href="/embed/challenges">
              <button className="rainbow-cta px-6 py-3 rounded-full font-semibold text-base">
                View Challenges
              </button>
            </Link>

            <Link href="/embed/join">
              <button className="px-6 py-3 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition">
                Join with code
              </button>
            </Link>
          </div>

          <p className="text-sm text-slate-500">
            Already a member? Log in through the{" "}
            <a 
              href="https://www.queersandalliesfitness.com/member-portal"
              className="underline hover:text-slate-700"
            >
              Member Portal
            </a>
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="neon-card rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-2">
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">Public</span>
            <h2 className="font-semibold text-lg">Featured Challenges</h2>
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

          <div className="pt-2 border-t border-slate-200">
            <Link href="/embed/challenges">
              <button className="w-full px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white hover:bg-slate-50 transition text-sm">
                Browse all challenges →
              </button>
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}