"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase/client";
import ChatPanel from "@/components/chat/ChatPanel";

type MsgTab = "community" | "groups" | "teams" | "dms";

type Challenge = {
  id: string;
  name: string;
  member_count: number | null;
};

type Team = {
  id: string;
  name: string;
  color: string | null;
};

type DMConversation = {
  userId: string;
  name: string;
  lastMessage?: string;
  lastAt?: string;
};

// ─── Slow-load notice ─────────────────────────────────────────────────────────
function SlowLoadNotice({ onRetry }: { onRetry: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 6000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <p className="text-xs text-slate-400 text-center mt-3">
      Taking longer than usual…{" "}
      <button onClick={onRetry} className="underline text-purple-500 font-semibold">
        tap to refresh
      </button>
    </p>
  );
}

export default function MessagesPage() {
  const nav          = useRouter();
  const searchParams = useSearchParams();
  const { user }     = useUser();

  const [tab, setTab]                         = useState<MsgTab>("community");
  const [challenges, setChallenges]           = useState<Challenge[]>([]);
  const [teams, setTeams]                     = useState<Team[]>([]);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [openChallenge, setOpenChallenge]     = useState<Challenge | null>(null);
  const [openTeam, setOpenTeam]               = useState<Team | null>(null);
  const [openDmUser, setOpenDmUser]           = useState<{ id: string; name: string } | null>(null);
  const [openCommunity, setOpenCommunity]     = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [loadKey, setLoadKey]                 = useState(0);
  const [unreadDmIds, setUnreadDmIds]         = useState<Set<string>>(new Set());
  const [unreadChallengeIds, setUnreadChallengeIds] = useState<Set<string>>(new Set());
  const [unreadTeamIds, setUnreadTeamIds]     = useState<Set<string>>(new Set());
  const [communityUnread, setCommunityUnread] = useState(false);

  // Handle ?dm=userId deep-link from profile page
  useEffect(() => {
    const dmUserId = searchParams.get("dm");
    if (!dmUserId || !user) return;
    async function openDmFromParam() {
      const { data } = await supabase
        .from("users").select("id, name").eq("id", dmUserId).single();
      if (data) {
        setTab("dms");
        setOpenDmUser({ id: data.id, name: data.name });
      }
    }
    openDmFromParam();
  }, [searchParams, user]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [joinedResult, teamMemberResult] = await Promise.all([
        user
          ? supabase
              .from("challenge_members")
              .select("challenge_id, challenges(id, name, member_count)")
              .eq("user_id", user.id)
          : Promise.resolve({ data: null, error: null }),
        user
          ? supabase
              .from("team_members")
              .select("team_id, teams(id, name, color)")
              .eq("user_id", user.id)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (joinedResult.data) {
        setChallenges(
          (joinedResult.data as any[]).map((j) => j.challenges).filter(Boolean)
        );
      }

      if (teamMemberResult.data) {
        const seen = new Set<string>();
        const unique: Team[] = [];
        (teamMemberResult.data as any[]).forEach((row) => {
          const t = row.teams;
          if (t && !seen.has(t.id)) { seen.add(t.id); unique.push(t); }
        });
        setTeams(unique);
      }

      if (user) {
        const [sentResult, receivedResult] = await Promise.all([
          supabase
            .from("messages")
            .select("recipient_id, text, created_at, users!messages_recipient_id_fkey(id, name)")
            .eq("author_id", user.id)
            .eq("is_dm", true)
            .order("created_at", { ascending: false }),

          supabase
            .from("messages")
            .select("author_id, text, created_at, users!messages_author_id_fkey(id, name)")
            .eq("recipient_id", user.id)
            .eq("is_dm", true)
            .order("created_at", { ascending: false }),
        ]);

        const convMap: Record<string, DMConversation> = {};

        (sentResult.data || []).forEach((m: any) => {
          const otherId   = m.recipient_id;
          const otherName = m.users?.name || "Member";
          if (!convMap[otherId] || new Date(m.created_at) > new Date(convMap[otherId].lastAt!)) {
            convMap[otherId] = { userId: otherId, name: otherName, lastMessage: m.text, lastAt: m.created_at };
          }
        });

        (receivedResult.data || []).forEach((m: any) => {
          const otherId   = m.author_id;
          const otherName = m.users?.name || "Member";
          if (!convMap[otherId] || new Date(m.created_at) > new Date(convMap[otherId].lastAt!)) {
            convMap[otherId] = { userId: otherId, name: otherName, lastMessage: m.text, lastAt: m.created_at };
          }
        });

        const sortedConvs = Object.values(convMap).sort((a, b) =>
          new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()
        );
        setDmConversations(sortedConvs);

        // Compute unread DMs from localStorage
        const newUnreadDmIds = new Set<string>();
        sortedConvs.forEach((conv) => {
          const lastSeen = parseInt(localStorage.getItem(`last_seen_dm_${conv.userId}`) || "0", 10);
          if (lastSeen > 0 && conv.lastAt && new Date(conv.lastAt).getTime() > lastSeen) {
            newUnreadDmIds.add(conv.userId);
          }
        });
        setUnreadDmIds(newUnreadDmIds);
      }

      // Compute unread for challenge groups and community
      if (joinedResult.data) {
        const challengeIds = (joinedResult.data as any[])
          .map((j) => j.challenges?.id).filter(Boolean) as string[];

        if (challengeIds.length > 0) {
          const { data: latestMsgs } = await supabase
            .from("messages")
            .select("challenge_id, created_at")
            .in("challenge_id", challengeIds)
            .order("created_at", { ascending: false })
            .limit(challengeIds.length * 3);

          const latestPerChallenge: Record<string, string> = {};
          (latestMsgs || []).forEach((m: any) => {
            if (!latestPerChallenge[m.challenge_id]) {
              latestPerChallenge[m.challenge_id] = m.created_at;
            }
          });

          const newUnreadChallengeIds = new Set<string>();
          challengeIds.forEach((cid) => {
            const latest = latestPerChallenge[cid];
            if (!latest) return;
            const lastSeen = parseInt(localStorage.getItem(`last_seen_challenge_${cid}`) || "0", 10);
            if (lastSeen > 0 && new Date(latest).getTime() > lastSeen) newUnreadChallengeIds.add(cid);
          });
          setUnreadChallengeIds(newUnreadChallengeIds);
        }
      }

      // Compute unread for teams
      if (teamMemberResult.data) {
        const teamIds = (teamMemberResult.data as any[])
          .map((r) => r.teams?.id).filter(Boolean) as string[];

        if (teamIds.length > 0) {
          const { data: latestTeamMsgs } = await supabase
            .from("messages")
            .select("team_id, created_at")
            .in("team_id", teamIds)
            .order("created_at", { ascending: false })
            .limit(teamIds.length * 3);

          const latestPerTeam: Record<string, string> = {};
          (latestTeamMsgs || []).forEach((m: any) => {
            if (!latestPerTeam[m.team_id]) latestPerTeam[m.team_id] = m.created_at;
          });

          const newUnreadTeamIds = new Set<string>();
          teamIds.forEach((tid) => {
            const latest = latestPerTeam[tid];
            if (!latest) return;
            const lastSeen = parseInt(localStorage.getItem(`last_seen_team_${tid}`) || "0", 10);
            if (lastSeen > 0 && new Date(latest).getTime() > lastSeen) newUnreadTeamIds.add(tid);
          });
          setUnreadTeamIds(newUnreadTeamIds);
        }
      }

      // Compute unread for community
      const { data: latestCommunity } = await supabase
        .from("messages")
        .select("created_at")
        .is("challenge_id", null).is("team_id", null).is("recipient_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestCommunity) {
        const lastSeen = parseInt(localStorage.getItem("last_seen_community") || "0", 10);
        setCommunityUnread(lastSeen > 0 && new Date(latestCommunity.created_at).getTime() > lastSeen);
      }

      setLoading(false);
    }

    load();
  }, [user, loadKey]);

  const TABS: { id: MsgTab; label: string; icon: string }[] = [
    { id: "community", label: "Community", icon: "🌈" },
    { id: "groups",    label: "Groups",    icon: "⚡" },
    { id: "teams",     label: "Teams",     icon: "🏆" },
    { id: "dms",       label: "DMs",       icon: "💬" },
  ];

  const isInChat = !!openChallenge || !!openTeam || !!openDmUser || openCommunity;

  function tabHasUnread(tabId: MsgTab): boolean {
    if (tabId === "community") return communityUnread;
    if (tabId === "groups") return unreadChallengeIds.size > 0;
    if (tabId === "teams") return unreadTeamIds.size > 0;
    if (tabId === "dms") return unreadDmIds.size > 0;
    return false;
  }

  const AVATAR_GRADIENTS = [
    "linear-gradient(135deg,#ff6b9d,#ff9f43)",
    "linear-gradient(135deg,#48cfad,#667eea)",
    "linear-gradient(135deg,#a855f7,#ff6b9d)",
    "linear-gradient(135deg,#ff9f43,#ffdd59)",
  ];

  return (
    <div className="min-h-screen pt-6 pb-28 flex flex-col">

      {/* ── Header ── */}
      {!isInChat && (
        <div className="px-5 mb-4">
          <p
            className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
            style={{
              background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Queers & Allies Fitness
          </p>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            Messages
          </h1>
        </div>
      )}

      {/* ── Tabs ── */}
      {!isInChat && (
        <div className="px-5 mb-4">
          <div className="flex p-1 rounded-full bg-white shadow-sm" style={{ border: "1px solid #E5E5EA" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2 rounded-full text-[11px] font-bold transition-all flex items-center justify-center gap-1 min-w-0 relative ${
                  tab === t.id ? "rainbow-cta text-[#1a1a1a]" : "text-[#8E8E93]"
                }`}
              >
                <span className="flex-shrink-0">{t.icon}</span>
                <span className="truncate">{t.label}</span>
                {tabHasUnread(t.id) && tab !== t.id && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── COMMUNITY TAB — single entry card ── */}
      {!isInChat && tab === "community" && (
        <div className="px-5 flex flex-col gap-3">
          {!user ? (
            <div className="neon-card rounded-2xl p-10 text-center">
              <p className="text-2xl mb-2">🌈</p>
              <p className="font-bold text-slate-800">Log in to join the conversation</p>
              <button
                onClick={() => nav.push("/auth")}
                className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm mt-4"
              >
                Log In / Sign Up
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setOpenCommunity(true); setCommunityUnread(false); }}
              className="w-full neon-card rounded-2xl overflow-hidden text-left hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="h-1 w-full rainbow-cta" />
              <div className="px-5 py-4 flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,107,157,0.13), rgba(102,126,234,0.13))",
                  }}
                >
                  🌈
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900">Community Chat</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Everyone · Open conversation
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {communityUnread && <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />}
                  <span className="text-slate-400 text-sm">→</span>
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* ── GROUPS TAB ── */}
      {!isInChat && tab === "groups" && (
        <div className="px-5 flex flex-col gap-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="text-5xl">🏳️‍🌈</div>
              <p className="text-sm font-bold tracking-widest uppercase text-purple-600">Loading...</p>
              <SlowLoadNotice onRetry={() => setLoadKey((k) => k + 1)} />
            </div>
          ) : challenges.length === 0 ? (
            <div className="neon-card rounded-2xl p-10 text-center">
              <p className="text-2xl mb-2">⚡</p>
              <p className="font-bold text-slate-800">No challenge chats yet</p>
              <p className="text-sm text-slate-500 mt-2 mb-4">
                Join a challenge to unlock its group chat
              </p>
              <button
                onClick={() => nav.push("/embed/challenges")}
                className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm"
              >
                Browse Challenges
              </button>
            </div>
          ) : (
            challenges.map((challenge) => (
              <button
                key={challenge.id}
                onClick={() => {
                  setOpenChallenge(challenge);
                  setUnreadChallengeIds(prev => { const s = new Set(prev); s.delete(challenge.id); return s; });
                }}
                className="w-full neon-card rounded-2xl overflow-hidden text-left hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="h-1 w-full rainbow-cta" />
                <div className="px-5 py-4 flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#ff6b9d22,#667eea22)" }}
                  >
                    💬
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900">{challenge.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {challenge.member_count || 0} members
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadChallengeIds.has(challenge.id) && <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />}
                    <span className="text-slate-400 text-sm">→</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* ── TEAMS TAB ── */}
      {!isInChat && tab === "teams" && (
        <div className="px-5 flex flex-col gap-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="text-5xl">🏳️‍🌈</div>
              <p className="text-sm font-bold tracking-widest uppercase text-purple-600">Loading...</p>
              <SlowLoadNotice onRetry={() => setLoadKey((k) => k + 1)} />
            </div>
          ) : teams.length === 0 ? (
            <div className="neon-card rounded-2xl p-10 text-center">
              <p className="text-2xl mb-2">🏆</p>
              <p className="font-bold text-slate-800">You&apos;re not on any teams yet</p>
              <p className="text-sm text-slate-500 mt-2 mb-4">
                Join a challenge with teams to get assigned
              </p>
              <button
                onClick={() => nav.push("/embed/challenges")}
                className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm"
              >
                Browse Challenges
              </button>
            </div>
          ) : (
            teams.map((team) => (
              <button
                key={team.id}
                onClick={() => {
                  setOpenTeam(team);
                  setUnreadTeamIds(prev => { const s = new Set(prev); s.delete(team.id); return s; });
                }}
                className="w-full neon-card rounded-2xl overflow-hidden text-left hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="h-1 w-full" style={{ background: team.color || "linear-gradient(90deg,#ff6b9d,#667eea)" }} />
                <div className="px-5 py-4 flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: team.color ? `${team.color}22` : "linear-gradient(135deg,#ff6b9d22,#667eea22)" }}
                  >
                    🏆
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900">{team.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Team chat</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadTeamIds.has(team.id) && <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />}
                    <span className="text-slate-400 text-sm">→</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* ── DMs TAB ── */}
      {!isInChat && tab === "dms" && (
        <div className="px-5 flex flex-col gap-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="text-5xl">🏳️‍🌈</div>
              <p className="text-sm font-bold tracking-widest uppercase text-purple-600">Loading...</p>
              <SlowLoadNotice onRetry={() => setLoadKey((k) => k + 1)} />
            </div>
          ) : dmConversations.length === 0 ? (
            <div className="neon-card rounded-2xl p-10 text-center">
              <p className="text-2xl mb-2">💬</p>
              <p className="font-bold text-slate-800">No messages yet</p>
              <p className="text-sm text-slate-500 mt-2">
                Visit someone&apos;s profile and tap <strong>Message</strong> to start a conversation.
              </p>
              <button
                onClick={() => setTab("groups")}
                className="rainbow-cta rounded-xl px-5 py-3 font-bold text-sm mt-4"
              >
                Browse Group Chats
              </button>
            </div>
          ) : (
            dmConversations.map((conv, i) => (
              <button
                key={conv.userId}
                onClick={() => {
                  setOpenDmUser({ id: conv.userId, name: conv.name });
                  setUnreadDmIds(prev => { const s = new Set(prev); s.delete(conv.userId); return s; });
                }}
                className="w-full neon-card rounded-2xl overflow-hidden text-left hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
                      style={{ background: AVATAR_GRADIENTS[i % 4] }}
                    >
                      {conv.name[0]?.toUpperCase()}
                    </div>
                    {unreadDmIds.has(conv.userId) && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-slate-900 ${unreadDmIds.has(conv.userId) ? "text-purple-700" : ""}`}>{conv.name}</p>
                    {conv.lastMessage && (
                      <p className={`text-xs mt-0.5 truncate ${unreadDmIds.has(conv.userId) ? "text-slate-700 font-semibold" : "text-slate-500"}`}>{conv.lastMessage}</p>
                    )}
                  </div>
                  {conv.lastAt && (
                    <p className="text-[10px] text-slate-400 flex-shrink-0">
                      {new Date(conv.lastAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* ── Community chat — full screen ── */}
      {openCommunity && user && (
        <div style={{ position: "fixed", inset: "0 0 98px 0", display: "flex", flexDirection: "column" }}>
          <ChatPanel
            context={{ type: "community" }}
            currentUserId={user.id}
            currentUserName={user.name}
            title="Community Chat"
            onBack={() => setOpenCommunity(false)}
          />
        </div>
      )}

      {/* ── Challenge chat ── */}
      {openChallenge && user && (
        <div style={{ position: "fixed", inset: "0 0 98px 0", display: "flex", flexDirection: "column" }}>
          <ChatPanel
            context={{ type: "challenge", id: openChallenge.id }}
            currentUserId={user.id}
            currentUserName={user.name}
            title={openChallenge.name}
            onBack={() => setOpenChallenge(null)}
          />
        </div>
      )}

      {/* ── Team chat ── */}
      {openTeam && user && (
        <div style={{ position: "fixed", inset: "0 0 98px 0", display: "flex", flexDirection: "column" }}>
          <ChatPanel
            context={{ type: "team", id: openTeam.id }}
            currentUserId={user.id}
            currentUserName={user.name}
            title={openTeam.name}
            onBack={() => setOpenTeam(null)}
          />
        </div>
      )}

      {/* ── DM chat ── */}
      {openDmUser && user && (
        <div style={{ position: "fixed", inset: "0 0 98px 0", display: "flex", flexDirection: "column" }}>
          <ChatPanel
            context={{ type: "dm", id: openDmUser.id }}
            currentUserId={user.id}
            currentUserName={user.name}
            title={openDmUser.name}
            onBack={() => {
              setOpenDmUser(null);
              nav.replace("/embed/messages?tab=dms");
            }}
          />
        </div>
      )}

    </div>
  );
}