"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase/client";

interface Challenge {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  join_code?: string;
  start_date: string;
  end_date: string;
  member_count: number;
  capacity: number;
  creator_id: string;
  scoring_type?: string;
}

export default function ChallengesPage() {
  const router = useRouter();
  const { user, getUserParams } = useUser();

  const [challenges, setChallenges]       = useState<Challenge[]>([]);
  const [joinedIds, setJoinedIds]         = useState<Set<string>>(new Set());
  const [createdIds, setCreatedIds]       = useState<Set<string>>(new Set());
  const [loading, setLoading]             = useState(true);
  const [codeModal, setCodeModal]         = useState<Challenge | null>(null);
  const [codeInput, setCodeInput]         = useState("");
  const [codeError, setCodeError]         = useState("");
  const [joining, setJoining]             = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const navigate = (path: string) => router.push(path + getUserParams());

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setCurrentUserId(authUser.id);
        const { data: joined } = await supabase
          .from("challenge_members").select("challenge_id").eq("user_id", authUser.id);
        if (joined) setJoinedIds(new Set(joined.map((j: any) => j.challenge_id)));
        const { data: created } = await supabase
          .from("challenges").select("id").eq("creator_id", authUser.id);
        if (created) setCreatedIds(new Set(created.map((c: any) => c.id)));
      }
      const { data } = await supabase
        .from("challenges").select("*").order("created_at", { ascending: false });
      setChallenges((data as Challenge[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const getDuration = (c: Challenge) =>
    Math.ceil((new Date(c.end_date).getTime() - new Date(c.start_date).getTime()) / 86400000);
  const getDaysLeft = (c: Challenge) =>
    Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000));
  const getProgress = (c: Challenge) => {
    const total = getDuration(c);
    return Math.min(100, Math.round(((total - getDaysLeft(c)) / total) * 100));
  };

  const handleJoinPublic = async (challenge: Challenge) => {
    if (!currentUserId) { router.push("/auth"); return; }
    setJoining(true);
    const { error } = await supabase.from("challenge_members").insert({
      challenge_id: challenge.id, user_id: currentUserId,
    });
    if (!error) setJoinedIds(prev => new Set([...prev, challenge.id]));
    setJoining(false);
  };

  const handleJoinWithCode = async () => {
    if (!codeModal || !currentUserId) return;
    setCodeError("");
    setJoining(true);
    if (codeInput.trim().toUpperCase() !== codeModal.join_code?.toUpperCase()) {
      setCodeError("Incorrect code. Try again.");
      setJoining(false);
      return;
    }
    const { error } = await supabase.from("challenge_members").insert({
      challenge_id: codeModal.id, user_id: currentUserId,
    });
    if (!error) {
      setJoinedIds(prev => new Set([...prev, codeModal.id]));
      setCodeModal(null); setCodeInput("");
    } else {
      setCodeError("Something went wrong. Please try again.");
    }
    setJoining(false);
  };

  const isJoined  = (id: string) => joinedIds.has(id);
  const isCreated = (id: string) => createdIds.has(id);

  const sorted = [...challenges].sort((a, b) =>
    (isJoined(a.id) || isCreated(a.id) ? 0 : 1) - (isJoined(b.id) || isCreated(b.id) ? 0 : 1)
  );

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{
            background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Queers & Allies Fitness</p>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Challenges</h1>
        </div>
        <button onClick={() => navigate("/embed/challenges/new")}
          className="w-10 h-10 rounded-full neon-card flex items-center justify-center text-xl font-bold text-slate-700 hover:scale-105 transition-transform">
          +
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button onClick={() => navigate("/embed/challenges/new")}
          className="flex-1 rainbow-cta rounded-xl py-3 font-bold text-sm">
          + Create
        </button>
        <button onClick={() => navigate("/embed/join")}
          className="flex-1 rounded-xl py-3 font-bold text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">
          Enter Code
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="neon-card rounded-2xl p-12 text-center">
          <p className="text-slate-400 font-semibold">Loading challenges...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="neon-card rounded-2xl p-10 text-center space-y-3">
          <p className="text-2xl">⚡</p>
          <p className="font-bold text-slate-800">No challenges yet</p>
          <p className="text-sm text-slate-500">Create the first one and invite your crew.</p>
          <button onClick={() => navigate("/embed/challenges/new")}
            className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm">
            Create Challenge
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((challenge) => {
            const joined   = isJoined(challenge.id);
            const created  = isCreated(challenge.id);
            const progress = getProgress(challenge);
            const daysLeft = getDaysLeft(challenge);
            const duration = getDuration(challenge);
            const active   = daysLeft > 0;

            return (
              <div key={challenge.id} className="neon-card rounded-2xl overflow-hidden">
                <div className="h-1 w-full" style={joined || created ? {
                  background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
                } : { background: "#f1f5f9" }} />

                <div className="px-5 py-4">
                  {/* Title + badges */}
                  <div className="flex items-start gap-2 flex-wrap mb-1">
                    <h3 className="text-base font-bold text-slate-900 flex-shrink-0">{challenge.name}</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={challenge.is_public
                        ? { background: "#d4f5e2", color: "#166534" }
                        : { background: "#fde0ef", color: "#9d174d" }}>
                      {challenge.is_public ? "🌍 Public" : "🔒 Private"}
                    </span>
                    {created && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#e8d9f7", color: "#6b21a8" }}>
                        ✏️ Yours
                      </span>
                    )}
                    {joined && !created && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#d4eaf7", color: "#1e40af" }}>
                        ✓ Joined
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium mb-2">
                    {duration}-day challenge · {active ? `${daysLeft} days left` : "Ended"}
                    {" · "}{challenge.member_count || 0} members
                  </p>

                  {challenge.description && (
                    <p className="text-sm text-slate-600 mb-3 leading-relaxed line-clamp-2">
                      {challenge.description}
                    </p>
                  )}

                  {/* Progress — joined/created only */}
                  {(joined || created) && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
                        <span>Progress</span><span>{progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%`, background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)" }} />
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    {created ? (
                      <>
                        <button onClick={() => navigate(`/embed/challenge/${challenge.id}`)}
                          className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                          Open
                        </button>
                        <button onClick={() => navigate(`/embed/challenge/${challenge.id}/manage`)}
                          className="text-xs font-bold px-4 py-1.5 rounded-full text-white"
                          style={{ background: "linear-gradient(90deg,#ff6b9d,#667eea)" }}>
                          Manage
                        </button>
                      </>
                    ) : joined ? (
                      <button onClick={() => navigate(`/embed/challenge/${challenge.id}`)}
                        className="text-xs font-bold px-4 py-1.5 rounded-full text-white"
                        style={{ background: "linear-gradient(90deg,#ff6b9d,#667eea)" }}>
                        Open
                      </button>
                    ) : challenge.is_public ? (
                      <button onClick={() => handleJoinPublic(challenge)} disabled={joining}
                        className="text-xs font-bold px-4 py-1.5 rounded-full text-white disabled:opacity-50"
                        style={{ background: "linear-gradient(90deg,#48cfad,#667eea)" }}>
                        {joining ? "..." : "Join Now"}
                      </button>
                    ) : (
                      <button onClick={() => { setCodeModal(challenge); setCodeInput(""); setCodeError(""); }}
                        className="text-xs font-bold px-4 py-1.5 rounded-full border-2 text-slate-700 hover:bg-slate-50 transition-colors"
                        style={{ borderColor: "#e2e8f0" }}>
                        Enter Code
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enter Code bottom sheet */}
      {codeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setCodeModal(null); }}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6 space-y-4"
            style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-2" />
            <div>
              <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-1">Private Challenge</p>
              <h3 className="text-xl font-extrabold text-slate-900">{codeModal.name}</h3>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Enter Join Code</label>
              <input type="text" value={codeInput}
                onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
                placeholder="e.g. ABC123"
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-center text-lg font-bold tracking-widest uppercase focus:outline-none focus:border-slate-400"
                autoFocus />
              {codeError && <p className="text-xs font-semibold text-red-500 mt-1.5 text-center">{codeError}</p>}
            </div>
            <button onClick={handleJoinWithCode} disabled={joining || !codeInput.trim()}
              className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-50"
              style={{ background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)", color: "#1a1a1a" }}>
              {joining ? "Joining..." : "Join Challenge"}
            </button>
            <button onClick={() => setCodeModal(null)}
              className="w-full py-3 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}