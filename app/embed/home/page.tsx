// app/embed/home/page.tsx

export default function EmbedHome() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-pink-200 via-pink-300 to-purple-300 px-4 py-6 text-gray-900">
      
      {/* Top Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="w-10 h-10 rounded-full bg-white shadow-md" />
        <div className="w-10 h-10 rounded-full bg-white shadow-md" />
      </div>

      {/* Mission Header */}
      <h1 className="text-2xl font-bold text-gray-900 leading-tight">
        Building Community Strength.
      </h1>
      <p className="text-sm text-gray-700 mt-1">
        Where movement meets belonging.
      </p>

      {/* Primary Action Buttons */}
      <div className="mt-6 grid grid-cols-1 gap-3">
        <button className="w-full py-3 rounded-xl bg-white/70 backdrop-blur-md shadow-md font-semibold text-gray-900">
          New Challenge
        </button>

        <button className="w-full py-3 rounded-xl bg-white/70 backdrop-blur-md shadow-md font-semibold text-gray-900">
          Join with Code
        </button>

        <button className="w-full py-3 rounded-xl bg-white/70 backdrop-blur-md shadow-md font-semibold text-gray-900">
          View All Challenges
        </button>

        <button className="w-full py-3 rounded-xl bg-white/70 backdrop-blur-md shadow-md font-semibold text-gray-900">
          Leaderboard
        </button>
      </div>

      {/* Featured Challenges Section */}
      <h2 className="mt-10 mb-3 text-lg font-semibold text-gray-900">
        Featured Challenges
      </h2>

      <div className="space-y-3">
        {/* Challenge Card */}
        <div className="p-4 rounded-xl bg-white/60 backdrop-blur-md shadow-md">
          <p className="font-semibold text-gray-900">Increase by 5 reps/week</p>
          <p className="text-sm text-gray-700">0 members • 17 days left</p>
        </div>

        <div className="p-4 rounded-xl bg-white/60 backdrop-blur-md shadow-md">
          <p className="font-semibold text-gray-900">New Year Fitness Challenge 2026</p>
          <p className="text-sm text-gray-700">2 members • 312 days left</p>
        </div>

        <div className="p-4 rounded-xl bg-white/60 backdrop-blur-md shadow-md">
          <p className="font-semibold text-gray-900">Night</p>
          <p className="text-sm text-gray-700">1 member • 16 days left</p>
        </div>
      </div>

      <button className="mt-3 text-sm font-semibold text-gray-900 underline">
        Browse all challenges →
      </button>

      {/* Activity Feed */}
      <h2 className="mt-10 mb-3 text-lg font-semibold text-gray-900">
        Activity Feed
      </h2>

      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-white/60 backdrop-blur-md shadow-md">
          <p className="font-semibold text-gray-900">Avery joined “Strength in Community”</p>
          <p className="text-sm text-gray-700">Just now</p>
        </div>

        <div className="p-4 rounded-xl bg-white/60 backdrop-blur-md shadow-md">
          <p className="font-semibold text-gray-900">Jordan hit a 3‑day streak</p>
          <p className="text-sm text-gray-700">2 hours ago</p>
        </div>

        <div className="p-4 rounded-xl bg-white/60 backdrop-blur-md shadow-md">
          <p className="font-semibold text-gray-900">Team Lavender logged 42 points today</p>
          <p className="text-sm text-gray-700">Today</p>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="mt-12 flex justify-around py-4 bg-white/40 backdrop-blur-md rounded-2xl shadow-md">
        <div className="text-center">
          <div className="w-6 h-6 bg-gray-900 rounded-md mx-auto" />
          <p className="text-xs mt-1">Home</p>
        </div>
        <div className="text-center">
          <div className="w-6 h-6 bg-gray-900 rounded-md mx-auto" />
          <p className="text-xs mt-1">Challenges</p>
        </div>
        <div className="text-center">
          <div className="w-6 h-6 bg-gray-900 rounded-md mx-auto" />
          <p className="text-xs mt-1">Rewards</p>
        </div>
        <div className="text-center">
          <div className="w-6 h-6 bg-gray-900 rounded-md mx-auto" />
          <p className="text-xs mt-1">Community</p>
        </div>
      </div>
    </div>
  );
}
