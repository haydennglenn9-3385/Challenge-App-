import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--neon-teal)" }} />
            Invite-only fitness challenges
          </p>
          <h1 className="text-5xl sm:text-6xl font-display leading-[0.95]">
            Queers and Allies Fitness Challenge
          </h1>
          <p className="text-lg text-slate-600">
            Spark friendly competition, track streaks, and keep your gym crew moving together. Create
            vibrant challenges and cheer each other on every day.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="px-6 py-3 rounded-full font-semibold rainbow-cta"
            >
              Join the gym crew
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-full font-semibold border border-slate-200 bg-white/80"
            >
              Log in
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-full font-semibold border border-slate-200 bg-white/80"
            >
              View dashboard
            </Link>
          </div>
        </div>

        <div className="neon-card rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Tonight's lineup</h2>
            <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">Live</span>
          </div>
          <div className="space-y-4">
            {[
              { title: "Sprint Ladder", meta: "4 members • 12 days left" },
              { title: "Core Circuit", meta: "7 members • 9 days left" },
              { title: "Flex Friday", meta: "5 members • 3 days left" },
            ].map((card) => (
              <div key={card.title} className="flex items-center justify-between rounded-2xl bg-white/90 border border-slate-100 px-4 py-3">
                <div>
                  <p className="font-semibold">{card.title}</p>
                  <p className="text-sm text-slate-500">{card.meta}</p>
                </div>
                <div className="h-10 w-10 rounded-full" style={{ background: "linear-gradient(135deg, var(--neon-teal), var(--neon-yellow))" }} />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4">
            <p className="text-sm text-slate-500">Today's focus</p>
            <p className="text-lg font-semibold">Hydration + mobility reset</p>
          </div>
        </div>
      </div>
    </div>
  );
}
