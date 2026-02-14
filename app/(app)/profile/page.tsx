"use client";

import { useEffect, useState } from "react";

export default function ProfileSettingsPage() {
  const [wixId, setWixId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ⭐ Request user info from Wix when page loads
  useEffect(() => {
    window.parent.postMessage("REQUEST_USER_INFO", "*");
  }, []);

  // ⭐ Receive Wix user info
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "USER_INFO") {
        const user = event.data.user;

        setWixId(user.id);
        setName(user.name || "");
        setEmail(user.email || "");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function handleSave() {
    if (!wixId) {
      alert("Still loading your account...");
      return;
    }

    const res = await fetch("/api/user/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wixId,
        name: name || undefined,
        email: email || undefined,
        password: password || undefined,
      }),
    });

    const data = await res.json();

    if (data.error) {
      alert("Error updating profile: " + data.error);
    } else {
      alert("Profile updated successfully");
      window.location.href = "/dashboard";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-[linear-gradient(to_bottom_right,#BAE3EF,#DFF58C,#FDD3EC,#FFE4B6)]">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Update Profile</h1>

        <label className="text-slate-700 font-medium">Name</label>
        <input
          type="text"
          className="mt-2 mb-4 w-full px-3 py-2 border rounded-lg"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="text-slate-700 font-medium">Email</label>
        <input
          type="email"
          className="mt-2 mb-4 w-full px-3 py-2 border rounded-lg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="text-slate-700 font-medium">Password</label>
        <input
          type="password"
          className="mt-2 mb-6 w-full px-3 py-2 border rounded-lg"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl text-black font-semibold shadow-md w-full bg-[linear-gradient(90deg,#FD80AB,#FFCE71,#A4FC95,#65EBE4,#719FFF)]"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
