"use client";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="neon-card rounded-2xl p-12 text-center max-w-sm w-full">
        <p className="text-4xl mb-4">{"🏳️‍🌈"}</p>
        <p
          className="text-5xl font-display font-extrabold mb-2"
          style={{
            background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </p>
        <p className="font-bold text-slate-800 text-lg mb-2">Page not found</p>
        <p className="text-sm text-slate-500 mb-6">
          This page does not exist or was moved.
        </p>
        <button
          onClick={() => { window.location.href = "/embed/dashboard"; }}
          className="rainbow-cta block w-full rounded-xl py-3 font-bold text-sm"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}