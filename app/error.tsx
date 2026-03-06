"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="neon-card rounded-2xl p-12 text-center max-w-sm w-full">
        <p className="text-4xl mb-4">{"⚡"}</p>
        <p className="font-bold text-slate-800 text-lg mb-2">Something went wrong</p>
        <p className="text-sm text-slate-500 mb-6">
          An unexpected error occurred. Try again or head back to the dashboard.
        </p>
        <div className="space-y-3">
          <button
            onClick={reset}
            className="rainbow-cta block w-full rounded-xl py-3 font-bold text-sm"
          >
            Try Again
          </button>
          <button
            onClick={() => { window.location.href = "/embed/dashboard"; }}
            className="block w-full rounded-xl py-3 font-bold text-sm border border-slate-200 text-slate-600 hover:bg-white transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}