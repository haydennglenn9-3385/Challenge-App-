// app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center p-8">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        {/* Left side */}
        <div>
          <span className="inline-block bg-black text-white text-xs px-3 py-1 rounded-full mb-4">
            Invite-only fitness challenges
          </span>

          <h1 className="text-4xl font-bold mb-4">
            Queers and Allies Fitness Challenge
          </h1>

          <p className="text-gray-700 mb-8">
            Spark friendly competition, track streaks, and keep your gym crew moving together.
            Create vibrant challenges and cheer each other on every day.
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/join">
              <button className="w-full md:w-auto px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-500">
                Join the gym crew
              </button>
            </Link>

            <Link href="/login">
              <button className="w-full md:w-auto px-6 py-3 rounded-lg font-semibold border border-gray-400">
                Log in
              </button>
            </Link>

            <Link href="/dashboard">
              <button className="w-full md:w-auto px-6 py-3 rounded-lg font-semibold border border-gray-400">
                View dashboard
              </button>
            </Link>
          </div>
        </div>

        {/* Right side */}
        <div className="bg-white/70 backdrop-blur-md p-6 rounded-xl shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">Live</span>
            <h2 className="font-semibold">Tonight's lineup</h2>
          </div>

          <ul className="space-y-4">
            <li className="p-4 bg-white rounded-lg shadow">
              <p className="font-semibold">Sprint Ladder</p>
              <p className="text-sm text-gray-600">4 members • 12 days left</p>
            </li>

            <li className="p-4 bg-white rounded-lg shadow">
              <p className="font-semibold">Core Circuit</p>
              <p className="text-sm text-gray-600">7 members • 9 days left</p>
            </li>

            <li className="p-4 bg-white rounded-lg shadow">
              <p className="font-semibold">Flex Friday</p>
              <p className="text-sm text-gray-600">5 members • 3 days left</p>
            </li>
          </ul>

          <div className="mt-6 text-sm text-gray-700">
            <strong>Today's focus:</strong> Hydration + mobility reset
          </div>
        </div>
      </div>
    </main>
  );
}
