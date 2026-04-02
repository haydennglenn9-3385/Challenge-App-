"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase/client";

interface Challenge {
  id:           string;
  name:         string;
  description?: string;
  is_public:    boolean;
  join_code?:   string;
  start_date:   string;
  end_date:     string | null;
  member_count: number;
  capacity:     number;
  creator_id:   string;
  scoring_type?: string;
}

type FilterTab = "all" | "mine";

// ─── Inner component (needs useSearchParams inside Suspense) ──────────────────

function ChallengesInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, getUserParams } = useUser();

  // Derive directly from URL on every render — avoids useState hydration freeze
  const activeFilter: FilterTab = searchParams.get("filter") === "mine" ? "mine" : "all";

  const setActiveFilter = (f: FilterTab) =>
    router.push(f === "mine" ? "/embed/challenges?filter=mine" : "/embed/challenges");

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
        .from("challenges")
        .select("*, challenge_members(count)")
        .order("created_at", { ascending: false })
        .limit(100);

      setChallenges(
        (data || []).map((c: any) => ({
          ...c,
          member_count: c.challenge_members?.[0]?.count ?? 0,
        })) as Challenge[]
      );
      setLoading(false);
    }
    load();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getDuration = (c: Challenge): number | null =>
    c.end_date
      ? Math.ceil((new Date(c.end_date).getTime() - new Date(c.start_date).getTime()) / 86400000)
      : null;

  const getDaysLeft = (c: Challenge): number | null =>
    c.end_date
      ? Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000))
      : null;

  const getProgress = (c: Challenge): number => {
    const total = getDuration(c);
    const left  = getDaysLeft(c);
    if (total === null || left === null) return 0;
    return Math.min(100, Math.round(((total - left) / total) * 100));
  };

  const isJoined  = (id: string) => joinedIds.has(id);
  const isCreated = (id: string) => createdIds.has(id);

  // ── Filter + sort ─────────────────────────────────────────────────────────

  const filtered = challenges.filter((c) => {
    if (activeFilter === "mine") return isJoined(c.id) || isCreated(c.id);
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    (isJoined(a.id) || isCreated(a.id) ? 0 : 1) -
    (isJoined(b.id) || isCreated(b.id) ? 0 : 1)
  );

  // ── Join handlers ─────────────────────────────────────────────────────────

  function joinErrorMessage(error: any): string {
    if (error?.code === "23505") return "You're already a member of this challenge.";
    if (error?.message?.toLowerCase().includes("capacity")) return "This challenge is full.";
    return "Something went wrong. Please try again.";
  }

  const handleJoinPublic = async (challenge: Challenge) => {
    if (!currentUserId) { router.push("/auth"); return; }
    setJoining(true);
    const { error } = await supabase.from("challenge_members").insert({
      challenge_id: challenge.id, user_id: currentUserId,
    });
    if (!error) {
      setJoinedIds(prev => new Set([...prev, challenge.id]));
    } else if (error.code === "23505") {
      setJoinedIds(prev => new Set([...prev, challenge.id])); // already a member, treat as joined
    }
    setJoining(false);
  };

  const handleJoinWithCode = async () => {
    if (!codeModal || !currentUserId) return;
    setCodeError(""); setJoining(true);
    if (codeInput.trim().toUpperCase() !== codeModal.join_code?.toUpperCase()) {
      setCodeError("Invalid join code. Check the code and try again.");
      setJoining(false); return;
    }
    const { error } = await supabase.from("challenge_members").insert({
      challenge_id: codeModal.id, user_id: currentUserId,
    });
    if (!error) {
      setJoinedIds(prev => new Set([...prev, codeModal.id]));
      setCodeModal(null); setCodeInput("");
    } else {
      setCodeError(joinErrorMessage(error));
    }
    setJoining(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <button onClick={() => navigate("/embed/challenges/new")}
          className="flex-1 rainbow-cta rounded-xl py-3 font-bold text-sm">
          + Create
        </button>
        <button onClick={() => navigate("/embed/join")}
          className="flex-1 rounded-xl py-3 font-bold text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">
          Join with Code
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex p-1 rounded-2xl bg-slate-100 gap-1">
        {([
          { id: "all",  label: "All Challenges" },
          { id: "mine", label: "My Challenges"  },
        ] as { id: FilterTab; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeFilter === tab.id
                ? "bg-white shadow text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {tab.id === "mine" && (joinedIds.size + createdIds.size > 0) && (
              <span className="ml-1.5 text-xs font-extrabold px-1.5 py-0.5 rounded-full"
                style={{ background: "linear-gradient(90deg,#ff6b9d,#667eea)", color: "white" }}>
                {new Set([...joinedIds, ...createdIds]).size}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="neon-card rounded-2xl p-12 text-center">
          <p className="text-slate-400 font-semibold">Loading challenges...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="neon-card rounded-2xl p-10 text-center space-y-3">
          <p className="text-2xl">⚡</p>
          {activeFilter === "mine" ? (
            <>
              <p className="font-bold text-slate-800">You haven't joined any challenges yet</p>
              <p className="text-sm text-slate-500">Browse all challenges or create your own.</p>
              <button onClick={() => setActiveFilter("all")}
                className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm">
                Browse All
              </button>
            </>
          ) : (
            <>
              <p className="font-bold text-slate-800">No challenges yet</p>
              <p className="text-sm text-slate-500">Create the first one and invite your crew.</p>
              <button onClick={() => navigate("/embed/challenges/new")}
                className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm">
                Create Challenge
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((challenge) => {
            const joined    = isJoined(challenge.id);
            const created   = isCreated(challenge.id);
            const daysLeft  = getDaysLeft(challenge);
            const duration  = getDuration(challenge);
            const isOngoing = challenge.end_date === null;
            const active    = isOngoing || (daysLeft !== null && daysLeft > 0);
            const progress  = getProgress(challenge);

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
                    {isOngoing
                      ? "Ongoing"
                      : `${duration}-day challenge · ${active ? `${daysLeft} days left` : "Ended"}`}
                    {" · "}
                    {challenge.member_count} member{challenge.member_count !== 1 ? "s" : ""}
                  </p>

                  {challenge.description && (
                    <p className="text-sm text-slate-600 mb-3 leading-relaxed line-clamp-2">
                      {challenge.description}
                    </p>
                  )}

                  {/* Progress bar — joined/created only */}
                  {(joined || created) && !isOngoing && (
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
                        <button
                          onClick={() => navigate(`/embed/challenge/${challenge.id}/manage`)}
                          className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                          ⚙️ Manage
                        </button>
                        <button
                          onClick={() => navigate(`/embed/challenge/${challenge.id}`)}
                          className="text-xs font-bold px-4 py-1.5 rounded-full rainbow-cta">
                          Open →
                        </button>
                      </>
                    ) : joined ? (
                      <button
                        onClick={() => navigate(`/embed/challenge/${challenge.id}`)}
                        className="text-xs font-bold px-4 py-1.5 rounded-full rainbow-cta">
                        Open →
                      </button>
                    ) : challenge.is_public ? (
                      <>
                        <button
                          onClick={() => navigate(`/embed/challenge/${challenge.id}`)}
                          className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                          Preview
                        </button>
                        <button
                          onClick={() => handleJoinPublic(challenge)}
                          disabled={joining}
                          className="text-xs font-bold px-4 py-1.5 rounded-full rainbow-cta disabled:opacity-50">
                          Join
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => navigate(`/embed/challenge/${challenge.id}`)}
                          className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                          Preview
                        </button>
                        <button
                          onClick={() => { setCodeModal(challenge); setCodeInput(""); setCodeError(""); }}
                          className="text-xs font-bold px-4 py-1.5 rounded-full rainbow-cta">
                          Enter Code
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Private join code modal */}
      {codeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setCodeModal(null)}>
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="h-1 w-full rounded-full rainbow-cta" />
            <div>
              <p className="font-extrabold text-slate-900 text-lg">{codeModal.name}</p>
              <p className="text-sm text-slate-500 mt-1">Enter the invite code to join this private challenge.</p>
            </div>
            <input
              autoFocus
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleJoinWithCode()}
              placeholder="XXXXXX"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl font-extrabold tracking-[0.3em] outline-none focus:border-purple-400 uppercase"
              maxLength={8}
            />
            {codeError && <p className="text-xs text-red-500 font-semibold text-center">{codeError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setCodeModal(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm">
                Cancel
              </button>
              <button
                onClick={handleJoinWithCode}
                disabled={joining || !codeInput.trim()}
                className="flex-1 py-3 rounded-xl rainbow-cta font-bold text-sm disabled:opacity-50">
                {joining ? "Joining…" : "Join"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Export (wrapped in Suspense for useSearchParams) ─────────────────────────

export default function ChallengesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400 font-semibold">Loading…</p>
      </div>
    }>
      <ChallengesInner />
    </Suspense>
  );
}