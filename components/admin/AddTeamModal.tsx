// components/admin/AddTeamModal.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { PRIDE_GRADIENTS } from "@/components/manage/TeamColorSelector";

interface Challenge {
  id: string;
  name: string;
}

interface NewTeam {
  id: string;
  name: string;
  color: string;
  challenge_id: string | null;
  challenges?: { id: string; name: string }[] | null;
  team_members?: { user_id: string }[];
}

interface Props {
  challenges: Challenge[];
  onClose: () => void;
  onCreated: (team: NewTeam) => void;
}

export default function AddTeamModal({ challenges, onClose, onCreated }: Props) {
  const [name,        setName]        = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [color,       setColor]       = useState(PRIDE_GRADIENTS[0].gradient);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  async function handleSubmit() {
    setError("");
    if (!name.trim()) { setError("Team name is required."); return; }
    if (!challengeId)  { setError("Please select a challenge."); return; }
    setSubmitting(true);

    const { data, error: insertError } = await supabase
      .from("teams")
      .insert({ name: name.trim(), color, challenge_id: challengeId || null })
      .select()
      .single();

    if (insertError || !data) {
      setError(insertError?.message || "Failed to create team.");
      setSubmitting(false);
      return;
    }

    const challenge = challenges.find((c) => c.id === challengeId);
    onCreated({
      ...data,
      challenges:   challenge ? [{ id: challenge.id, name: challenge.name }] : null,
      team_members: [],
    });
    setSubmitting(false);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
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
        {/* Sheet — full width mobile, fixed 460px centered on desktop */}
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
            height: 4, width: "100%",
            background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)",
            marginTop: 8,
          }} />

          {/* Content */}
          <div style={{ padding: "20px 24px 120px", overflowY: "auto", maxHeight: "80dvh" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: 18, color: "#0f172a", lineHeight: 1.2 }}>
                  Create New Team
                </p>
                <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                  Teams are scoped to a specific challenge
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "#f1f5f9", border: "none", cursor: "pointer",
                  fontSize: 18, color: "#64748b", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: 2,
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 12, padding: "10px 16px", marginBottom: 16,
              }}>
                <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{error}</p>
              </div>
            )}

            {/* Team name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: "#64748b",
                textTransform: "uppercase", letterSpacing: "0.08em",
                display: "block", marginBottom: 6,
              }}>
                Team Name
              </label>
              <input
                type="text"
                placeholder="e.g. Team Aria"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                style={{
                  width: "100%", borderRadius: 12,
                  border: "1px solid #e2e8f0", background: "#f8fafc",
                  padding: "12px 16px", fontSize: 14,
                  outline: "none", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Challenge */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: "#64748b",
                textTransform: "uppercase", letterSpacing: "0.08em",
                display: "block", marginBottom: 6,
              }}>
                Challenge <span style={{ textTransform: "none", fontWeight: 400, color: "#94a3b8" }}>(required)</span>
              </label>
              <select
                value={challengeId}
                onChange={(e) => setChallengeId(e.target.value)}
                style={{
                  width: "100%", borderRadius: 12,
                  border: "1px solid #e2e8f0", background: "#f8fafc",
                  padding: "12px 16px", fontSize: 14,
                  outline: "none", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              >
                <option value="">Select a challenge…</option>
                {challenges.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Team color */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: "#64748b",
                textTransform: "uppercase", letterSpacing: "0.08em",
                display: "block", marginBottom: 10,
              }}>
                Team Color
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, paddingLeft: 2 }}>
                {PRIDE_GRADIENTS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    title={g.label}
                    onClick={() => setColor(g.gradient)}
                    style={{
                      width: 40, height: 40,
                      borderRadius: "50%",
                      background: g.gradient,
                      border: "none",
                      cursor: "pointer",
                      flexShrink: 0,
                      outline: color === g.gradient ? "3px solid #1e293b" : "none",
                      outlineOffset: 3,
                      transform: color === g.gradient ? "scale(1.1)" : "scale(1)",
                      transition: "transform 0.12s",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live preview */}
            {name.trim() && (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 12,
                background: "#f8fafc", border: "1px solid #f1f5f9",
                marginBottom: 16,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: color, flexShrink: 0,
                }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", flex: 1 }}>{name}</p>
                {challengeId && (
                  <p style={{ fontSize: 12, color: "#94a3b8" }}>
                    {challenges.find((c) => c.id === challengeId)?.name}
                  </p>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !name.trim() || !challengeId}
              style={{
                width: "100%", padding: "14px 0",
                borderRadius: 12, border: "none",
                background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
                fontWeight: 800, fontSize: 14, cursor: "pointer",
                opacity: (submitting || !name.trim() || !challengeId) ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Creating…" : "Create Team"}
            </button>

          </div>
        </div>
      </div>
    </>
  );
}