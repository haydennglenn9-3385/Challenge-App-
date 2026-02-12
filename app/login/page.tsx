"use client";
import { useEffect } from "react";

export default function LoginPage() {
  useEffect(() => {
    // Tell Wix to open the login popup
    window.parent.postMessage({ type: "OPEN_LOGIN" }, "*");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="neon-card p-6 rounded-3xl text-center">
        <p className="text-lg font-display">Opening login…</p>
        <p className="text-sm text-slate-500 mt-2">If nothing happens, close this and try again.</p>
      </div>
    </div>
  );
}
