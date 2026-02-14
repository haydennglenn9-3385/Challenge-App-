"use client";

import { useState } from "react";

export default function ProfileSettingsPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const rainbowButton =
    "px-4 py-2 rounded-xl text-black font-semibold shadow-md bg-[linear-gradient(90deg,#FD80AB,#FFCE71,#A4FC95,#65EBE4,#719FFF)] inline-block";

  async function handleSave() {
    if (!name && !password) {
      alert("Please update at least one field");
      return;
    }

    try {
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
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
    } catch (err) {
      console.error(err);
      alert("Something went wrong updating your profile.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-[linear-gradient(to_bottom_right,#BAE3EF,#DFF58C,#FDD3EC,#FFE4B6)]">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Update Profile</h1>

        {/* NAME */}
        <label className="text-slate-700 font-medium">Name</label>
        <input
          type="text"
          placeholder="Enter preferred name"
          className="mt-2 mb-4 w-full px-3 py-2 border rounded-lg text-slate-800"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* PASSWORD */}
        <label className="text-slate-700 font-medium">Password</label>
        <input
          type="password"
          placeholder="Enter new password"
          className="mt-2 mb-6 w-full px-3 py-2 border rounded-lg text-slate-800"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleSave} className={`${rainbowButton} w-full`}>
          Save Changes
        </button>
      </div>
    </div>
  );
}
