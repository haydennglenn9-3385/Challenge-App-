"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function EditCheckInPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  const [userId, setUserId]         = useState("");
  const [challenge, setChallenge]   = useState<any>(null);
  const [logs, setLogs]             = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!challengeId) return;

      // Use Supabase auth directly — no Wix
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUserId(user.id);

      const { data: challengeData } = await supabase
        .from("challenges").select("*").eq("id", challengeId).single();
      setChallenge(challengeData);

      const { data: logsData } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      setLogs(logsData || []);

      setLoading(false);
    }
    loadData();
  }, [challengeId]);

  const handleSave = async () => {
    if (!selectedLog) return;
    setSaving(true);
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

    if (error) alert("Error saving: " + error.message);
    else router.push(`/embed/challenge/${challengeId}`);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedLog) return;
    if (!confirm("Delete this log?")) return;
    await supabase.from("daily_logs").delete().eq("id", selectedLog.id);
    router.push(`/embed/challenge/${challengeId}`);
  };

  if (loading) return (
  <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)" }}>
    <div style={{ fontSize: 52 }}>🏳️‍🌈</div>
    <div style={{ fontFamily: "'DM Sans', sans-serif" , fontSize: 18, color: "#7b2d8b", letterSpacing: 2 }}>LOADING...</div>
  </div>
  );

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/embed/challenge/${challengeId}`)}
          className="w-9 h-9 rounded-full neon-card flex items-center justify-center text-slate-600 hover:bg-white transition flex-shrink-0">
          ←
        </button>
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{
            background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Edit</p>
          <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
            {challenge?.name || "Check-Ins"}
          </h1>
        </div>
      </div>

      {/* Log selector */}
      <div className="neon-card rounded-2xl overflow-hidden">
        <div className="h-1 w-full rainbow-cta" />
        <div className="p-5">
          <p className="font-extrabold text-slate-900 mb-3">Select a Day</p>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No check-ins to edit yet</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="w-full text-left px-4 py-3 rounded-xl border transition text-sm font-semibold"
                  style={selectedLog?.id === log.id ? {
                    borderColor: "#667eea",
                    background: "linear-gradient(90deg,rgba(255,107,157,0.08),rgba(102,126,234,0.08))",
                    color: "#1a1a1a",
                  } : { borderColor: "#e5e7eb", background: "white", color: "#374151" }}
                >
                  {log.date} — {log.reps_completed}/{log.reps_target} reps
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit form */}
      {selectedLog && (
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-4">
            <p className="font-extrabold text-slate-900">Edit Log</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Date</label>
                <input type="date" value={selectedLog.date}
                  onChange={(e) => setSelectedLog({ ...selectedLog, date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Exercise</label>
                <input type="text" value={selectedLog.exercise || ""}
                  onChange={(e) => setSelectedLog({ ...selectedLog, exercise: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Reps Completed</label>
                <input type="number" value={selectedLog.reps_completed}
                  onChange={(e) => setSelectedLog({ ...selectedLog, reps_completed: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Reps Target</label>
                <input type="number" value={selectedLog.reps_target}
                  onChange={(e) => setSelectedLog({ ...selectedLog, reps_target: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Completion Level</label>
                <input type="text" value={selectedLog.completion_level || ""}
                  onChange={(e) => setSelectedLog({ ...selectedLog, completion_level: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 rainbow-cta rounded-xl py-3 font-bold text-sm disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={handleDelete}
                className="px-5 py-3 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}