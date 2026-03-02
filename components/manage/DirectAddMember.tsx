// components/manage/DirectAddMember.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Team {
  id: string;
  name: string;
  color?: string;
}

interface Member {
  id: string;
  name: string;
  email?: string;
  total_points: number;
  streak: number;
  team_id?: string;
  team_name?: string;
}

interface Props {
  challengeId: string;
  existingMemberIds: Set<string>;
  teams: Team[];
  hasTeams: boolean;
  onMemberAdded: (member: Member) => void;
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
}

export default function DirectAddMember({
  challengeId,
  existingMemberIds,
  teams,
  hasTeams,
  onMemberAdded,
}: Props) {
  const [query, setQuery]               = useState("");
  const [results, setResults]           = useState<SearchResult[]>([]);
  const [searching, setSearching]       = useState(false);
  const [searched, setSearched]         = useState(false);

  // Per-result state: which teamId is selected for each user
  const [selectedTeams, setSelectedTeams] = useState<Record<string, string>>({});
  const [adding, setAdding]             = useState<string | null>(null);
  const [addedIds, setAddedIds]         = useState<Set<string>>(new Set());

    async function handleAdd(user: SearchResult) {
      setAdding(user.id);

      const teamId = selectedTeams[user.id] || null;

      const { error } = await supabase
        .from("challenge_members")
        .insert({
          challenge_id: challengeId,
          user_id:      user.id,
          team_id:      teamId,
        });

      if (error) {
        alert("Error adding member: " + error.message);
        setAdding(null);
        return;
      }

      const team = teamId ? teams.find(t => t.id === teamId) : null;

      onMemberAdded({
        id:           user.id,
        name:         user.name,
        email:        user.email,
        total_points: 0,
        streak:       0,
        team_id:      teamId || undefined,
        team_name:    team?.name,
      });

      setAddedIds(p => new Set([...p, user.id]));
      setAdding(null);
    }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search by name or email…"
          className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="rainbow-cta px-4 py-3 rounded-xl font-bold text-sm disabled:opacity-50 whitespace-nowrap"
        >
          {searching ? "…" : "Search"}
        </button>
      </div>

      {/* Results */}
      {searched && results.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-3">
          No users found, or they're already in this challenge.
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => {
            const alreadyAdded = addedIds.has(user.id);
            return (
              <div
                key={user.id}
                className={`rounded-xl border px-4 py-3 space-y-2.5 transition ${
                  alreadyAdded
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                {/* User info */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#ff6b9d,#667eea)" }}
                  >
                    {user.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  {alreadyAdded && (
                    <span className="text-xs font-bold text-emerald-600">✓ Added</span>
                  )}
                </div>

                {/* Team selector (only if teams mode and not yet added) */}
                {hasTeams && teams.length > 0 && !alreadyAdded && (
                  <select
                    value={selectedTeams[user.id] || ""}
                    onChange={(e) =>
                      setSelectedTeams((p) => ({ ...p, [user.id]: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="">No team assignment</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Add button */}
                {!alreadyAdded && (
                  <button
                    onClick={() => handleAdd(user)}
                    disabled={adding === user.id}
                    className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(90deg,#ff6b9d,#667eea)" }}
                  >
                    {adding === user.id
                      ? "Adding…"
                      : hasTeams && selectedTeams[user.id]
                      ? `Add to ${teams.find((t) => t.id === selectedTeams[user.id])?.name}`
                      : "Add to Challenge"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}