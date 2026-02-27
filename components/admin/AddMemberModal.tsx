// components/admin/AddMemberModal.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Challenge {
  id: string;
  name: string;
  has_teams: boolean;
}

interface Team {
  id: string;
  name: string;
  color?: string;
  challenges?: { id: string }[] | null;
}

interface NewMember {
  id: string;
  name: string;
  email: string;
  total_points: number;
  streak: number;
}

interface Props {
  challenges: Challenge[];
  teams: Team[];
  onClose: () => void;
  onCreated: (member: NewMember) => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  padding: "12px 16px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  display: "block",
  marginBottom: 6,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 10,
};

export default function AddMemberModal({ challenges, teams, onClose, onCreated }: Props) {
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [teamId,      setTeamId]      = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  const selectedChallenge = challenges.find((c) => c.id === challengeId);
  const availableTeams    = challengeId
    ? teams.filter((t) => t.challenges?.[0]?.id === challengeId)
    : [];

  async function handleSubmit() {
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, email, and password are all required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:     name.trim(),
        email:    email.trim(),
        password: password.trim(),
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.user) {
      setError(json.error || "Failed to create user.");
      setSubmitting(false);
      return;
    }

    const newUser = json.user;

    if (challengeId) {
      await supabase
        .from("challenge_members")
        .insert({ challenge_id: challengeId, user_id: newUser.id });

      if (teamId) {
        await supabase
          .from("team_members")
          .insert({ team_id: teamId, user_id: newUser.id });
      }
    }

    onCreated(newUser);
    setSubmitting(false);
    onClose();
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div style={{
        width: "100%",
        maxWidth: 460,
        background: "#fff",
        borderRadius: "24px 24px 0 0",
        overflow: "hidden",
        boxShadow: "0 -4px 40px rgba(0,0,0,0.15)",
      }}>

        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: "#e2e8f0" }} />
        </div>

        {/* Rainbow strip */}
        <div style={{
          height: 4, width: "100%", marginTop: 8,
          background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)",
        }} />

        {/* Scrollable content */}
        <div style={{ padding: "20px 24px 120px", overflowY: "auto", maxHeight: "80dvh" }}>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", marginBottom: 20,
          }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: 18, color: "#0f172a", lineHeight: 1.2 }}>
                Add New Member
              </p>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                Creates an account and optionally enrolls them
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "#f1f5f9", border: "none", cursor: "pointer",
                fontSize: 18, color: "#64748b",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: 2,
              }}
            >
              ×
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 12, padding: "10px 16px", marginBottom: 16,
            }}>
              <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{error}</p>
            </div>
          )}

          {/* ── Account section ── */}
          <div style={{
            background: "#f8fafc", borderRadius: 16,
            padding: "16px", marginBottom: 16,
          }}>
            <p style={sectionLabelStyle}>Account</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="text"
                placeholder="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <div>
                <input
                  type="password"
                  placeholder="Temporary password (8+ characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                />
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                  They can reset this after logging in.
                </p>
              </div>
            </div>
          </div>

          {/* ── Enroll section ── */}
          <div style={{
            background: "#f8fafc", borderRadius: 16,
            padding: "16px", marginBottom: 20,
          }}>
            <p style={sectionLabelStyle}>
              Enroll in Challenge{" "}
              <span style={{ textTransform: "none", fontWeight: 400, color: "#94a3b8" }}>
                (optional)
              </span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select
                value={challengeId}
                onChange={(e) => { setChallengeId(e.target.value); setTeamId(""); }}
                style={inputStyle}
              >
                <option value="">No challenge</option>
                {challenges.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Team selector — only when challenge has teams */}
              {challengeId && selectedChallenge?.has_teams && availableTeams.length > 0 && (
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">No team assignment</option>
                  {availableTeams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%", padding: "14px 0",
              borderRadius: 12, border: "none",
              background: submitting
                ? "#cbd5e1"
                : "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
              fontWeight: 800, fontSize: 14,
              cursor: submitting ? "default" : "pointer",
              fontFamily: "inherit",
              color: "#1a1a1a",
            }}
          >
            {submitting ? "Creating…" : "Create Member"}
          </button>

        </div>
      </div>
    </div>
  );
}