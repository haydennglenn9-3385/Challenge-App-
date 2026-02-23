"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase/client";

export default function EditCheckInPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  const { user: wixUser, getUserParams } = useUser();

  const [userId, setUserId] = useState("");
  const [challenge, setChallenge] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const navigate = (path: string) => router.push(path + getUserParams());

  useEffect(() => {
    async function loadData() {
      if (!challengeId || !wixUser) return;

      // Get user ID
      const userResponse = await fetch(`/api/user/get?wixId=${wixUser.userId}`);
      const userData = await userResponse.json();
      if (!userData?.id) {
        setLoading(false);
        return;
      }
      setUserId(userData.id);

      // Load challenge
      const { data: challengeData } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .single();

      setChallenge(challengeData);

      // Load logs for this user
      const { data: logsData } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("user_id", userData.id)
        .order("date", { ascending: false });

      setLogs(logsData || []);

      setLoading(false);
    }

    loadData();
  }, [challengeId, wixUser]);

  const handleSave = async () => {
    if (!selectedLog) return;

    setSaving(true);

    // TODO: Replace with your real updateDailyLog function
    const { error } = await supabase
      .from("daily_logs")
      .update({
        reps_completed: selectedLog.reps_completed,
        reps_target: selectedLog.reps_target,
        completion_level: selectedLog.completion_level,
        exercise: selectedLog.exercise,
        date: selectedLog.date,
        edited_by: userId,
        edited_at: new Date().toISOString(),
      })
      .eq("id", selectedLog.id);

    if (error) {
      alert("Error saving: " + error.message);
    } else {
      alert("Log updated!");
      navigate(`/embed/challenge/${challengeId}`);
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedLog) return;
    if (!confirm("Are you sure you want to delete this log?")) return;

    // TODO: Replace with your real deleteDailyLog function
    await supabase.from("daily_logs").delete().eq("id", selectedLog.id);

    alert("Log deleted!");
    navigate(`/embed/challenge/${challengeId}`);
  };

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Nav */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          onClick={() => navigate(`/embed/challenge/${challengeId}`)}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
        >
          ← Back to Challenge
        </button>
      </div>

      <h2 className="text-3xl font-display">Edit Check‑Ins</h2>

      {/* Log Selector */}
      <div className="neon-card rounded-3xl p-6">
        <h3 className="text-xl font-semibold mb-4">Select a Day</h3>

        <div className="space-y-2">
          {logs.map((log) => (
            <button
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className={`w-full text-left px-4 py-3 rounded-xl border ${
                selectedLog?.id === log.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              {log.date} — {log.reps_completed}/{log.reps_target} reps
            </button>
          ))}
        </div>
      </div>

      {/* Edit Form */}
      {selectedLog && (
        <div className="neon-card rounded-3xl p-6 space-y-4">
          <h3 className="text-xl font-semibold mb-4">Edit Log</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold">Date</label>
              <input
                type="date"
                value={selectedLog.date}
                onChange={(e) =>
                  setSelectedLog({ ...selectedLog, date: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Exercise</label>
              <input
                type="text"
                value={selectedLog.exercise || ""}
                onChange={(e) =>
                  setSelectedLog({ ...selectedLog, exercise: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Reps Completed</label>
              <input
                type="number"
                value={selectedLog.reps_completed}
                onChange={(e) =>
                  setSelectedLog({
                    ...selectedLog,
                    reps_completed: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold">Reps Target</label>
              <input
                type="number"
                value={selectedLog.reps_target}
                onChange={(e) =>
                  setSelectedLog({
                    ...selectedLog,
                    reps_target: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-semibold">Completion Level</label>
              <input
                type="text"
                value={selectedLog.completion_level || ""}
                onChange={(e) =>
                  setSelectedLog({
                    ...selectedLog,
                    completion_level: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rainbow-cta rounded-full px-6 py-3 font-semibold disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-full border border-red-300 bg-red-50 text-red-700 font-semibold hover:bg-red-100 transition text-sm"
            >
              Delete Log
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
