"use client";
// app/embed/pr/page.tsx — Personal Records (with edit support + fixed time display)

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ─── Preset PR types ──────────────────────────────────────────────────────────
const PRESET_TYPES = [
  { type: "deadlift",       label: "Deadlift",       unit: "lbs",  emoji: "🏋️" },
  { type: "squat",          label: "Back Squat",     unit: "lbs",  emoji: "🦵" },
  { type: "bench",          label: "Bench Press",    unit: "lbs",  emoji: "💪" },
  { type: "overhead_press", label: "Overhead Press", unit: "lbs",  emoji: "🙌" },
  { type: "pull_ups",       label: "Pull-ups",       unit: "reps", emoji: "🐒" },
  { type: "push_ups",       label: "Push-ups",       unit: "reps", emoji: "🔥" },
  { type: "fastest_mile",   label: "Fastest Mile",   unit: "min",  emoji: "🏃" },
  { type: "5k",             label: "5K Run",         unit: "min",  emoji: "🎽" },
  { type: "plank",          label: "Plank Hold",     unit: "sec",  emoji: "🧘" },
  { type: "custom",         label: "Custom",         unit: "",     emoji: "✨" },
];

const EQUIPMENT_OPTIONS = ["Barbell", "Dumbbells", "Kettlebell", "Bodyweight", "Machine", "Bands", "Other"];

interface PR {
  id: string;
  type: string;
  label: string;
  value: number;
  unit: string;
  date: string;
  notes?: string;
  previous_value?: number;
  equipment?: string;
  is_custom: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeUnit(unit: string): string {
  const map: Record<string, string> = { secs: "sec", mins: "min", hrs: "hr" };
  return map[unit] ?? unit;
}
 
function isTimedUnit(unit: string): boolean {
  return ["sec", "secs", "min", "mins", "hr", "hrs"].includes(unit);
}
 
/** Always renders time as m:ss regardless of input unit */
function formatValue(value: number, unit: string): string {
  const u = normalizeUnit(unit);
 
  if (u === "sec") {
    const totalSecs = Math.round(value);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }
 
  if (u === "min") {
    const totalSecs = Math.round(value * 60);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }
 
  if (u === "hr") {
    const totalMins = Math.round(value * 60);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
 
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
 
/** Unit display label shown next to the value */
function unitLabel(unit: string): string {
  const u = normalizeUnit(unit);
  const labels: Record<string, string> = {
    sec: "m:ss", min: "m:ss", hr: "hrs",
    lbs: "lbs", kg: "kg", reps: "reps",
    sets: "sets", miles: "mi", km: "km",
  };
  return labels[u] ?? unit;
}
 
function parseTimeInput(raw: string, unit: string): number {
  const u = normalizeUnit(unit);
  const trimmed = raw.trim();
  if (trimmed.includes(":")) {
    const [left, right] = trimmed.split(":").map((s) => parseInt(s, 10));
    const mins = isNaN(left) ? 0 : left;
    const secs = isNaN(right) ? 0 : right;
    // Store in the native unit
    if (u === "sec") return mins * 60 + secs;   // store as total seconds
    if (u === "min") return mins + secs / 60;    // store as fractional minutes
    return mins * 60 + secs;
  }
  return parseFloat(trimmed) || 0;
}
 
function getBestPerType(prs: PR[]): Record<string, PR> {
  const best: Record<string, PR> = {};
  for (const pr of prs) {
    const existing = best[pr.type];
    if (!existing) { best[pr.type] = pr; continue; }
    const isTimed = isTimedUnit(pr.unit);
    if (isTimed ? pr.value < existing.value : pr.value > existing.value) {
      best[pr.type] = pr;
    }
  }
  return best;
}
 
function formatDate(d: string) {
  if (!d) return "";
  const date = d.includes("T") ? new Date(d) : new Date(d + "T12:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PRPage() {
  const router = useRouter();

  const [userId,      setUserId]      = useState<string | null>(null);
  const [prs,         setPrs]         = useState<PR[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showAdd,     setShowAdd]     = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [editingPR,   setEditingPR]   = useState<PR | null>(null); // NEW: edit mode
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  // ── Add/Edit form state ──────────────────────────────────────────────────────
  const [selectedPreset, setSelectedPreset] = useState(PRESET_TYPES[0]);
  const [customLabel,    setCustomLabel]    = useState("");
  const [customUnit,     setCustomUnit]     = useState("lbs");
  const [valueInput,     setValueInput]     = useState("");
  const [dateInput,      setDateInput]      = useState(new Date().toISOString().split("T")[0]);
  const [notesInput,     setNotesInput]     = useState("");
  const [equipmentInput, setEquipmentInput] = useState("");

  // ─── Load ───────────────────────────────────────────────────────────────────
  async function loadPRs(uid: string) {
    const { data } = await supabase
      .from("performance_records")
      .select("*")
      .eq("user_id", uid)
      .order("date", { ascending: false });
    setPrs(data || []);
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUserId(user.id);
      await loadPRs(user.id);
      setLoading(false);
    }
    init();
  }, []);

  // ─── Open Edit ────────────────────────────────────────────────────────────────
  function openEdit(pr: PR) {
    setEditingPR(pr);
    // Pre-populate form fields
    const preset = PRESET_TYPES.find(p => p.type === pr.type) || PRESET_TYPES[PRESET_TYPES.length - 1]; // custom
    setSelectedPreset(preset);
    setCustomLabel(pr.label);
    setCustomUnit(pr.unit);
    // Format time values back to display string
    const isTimed = pr.unit === "min" || pr.unit === "sec";
    if (isTimed) {
      setValueInput(formatValue(pr.value, pr.unit));
    } else {
      setValueInput(String(pr.value));
    }
    setDateInput(pr.date);
    setNotesInput(pr.notes || "");
    setEquipmentInput(pr.equipment || "");
    setShowAdd(true);
    setShowHistory(null);
  }

  // ─── Close form ────────────────────────────────────────────────────────────────
  function closeForm() {
    setShowAdd(false);
    setEditingPR(null);
    setValueInput("");
    setNotesInput("");
    setEquipmentInput("");
    setCustomLabel("");
    setSelectedPreset(PRESET_TYPES[0]);
  }

  // ─── Save (create or update) ─────────────────────────────────────────────────
  async function handleSave() {
    if (!userId || !valueInput) return;
    setSaving(true);

    const isCustom    = selectedPreset.type === "custom";
    const label       = isCustom ? customLabel || "Custom" : selectedPreset.label;
    const unit        = isCustom ? customUnit : selectedPreset.unit;
    const type        = isCustom ? `custom_${label.toLowerCase().replace(/\s+/g, "_")}` : selectedPreset.type;
    const isTimedUnit = unit === "min" || unit === "sec";
    const value = isTimedUnit ? parseTimeInput(valueInput, unit) : parseFloat(valueInput);

    if (editingPR) {
      // UPDATE existing
      await supabase
        .from("performance_records")
        .update({
          label,
          value,
          unit,
          date:      dateInput,
          notes:     notesInput || null,
          equipment: equipmentInput || null,
          type,
          is_custom: isCustom,
        })
        .eq("id", editingPR.id);
    } else {
      // INSERT new
      const existing = prs.filter(p => p.type === type);
      const isTimed  = unit === "min" || unit === "sec";
      const currentBest = existing.length
        ? existing.reduce((best, p) => (isTimed ? p.value < best.value : p.value > best.value) ? p : best)
        : null;

      await supabase.from("performance_records").insert({
        user_id:        userId,
        type,
        label,
        value,
        unit,
        date:           dateInput,
        notes:          notesInput || null,
        equipment:      equipmentInput || null,
        previous_value: currentBest?.value ?? null,
        is_custom:      isCustom,
      });
    }

    await loadPRs(userId);
    setSaving(false);
    closeForm();
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!userId) return;
    setDeleting(true);
    await supabase.from("performance_records").delete().eq("id", id);
    await loadPRs(userId);
    setDeleting(false);
    if (editingPR?.id === id) closeForm();
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const bestByType = getBestPerType(prs);
  const bestList   = Object.values(bestByType).sort((a, b) => a.label.localeCompare(b.label));
  const historyForType = showHistory ? prs.filter(p => p.type === showHistory).sort((a, b) => b.date.localeCompare(a.date)) : [];

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "linear-gradient(135deg,#d4f5e2 0%,#fde0ef 30%,#fdf6d3 60%,#d4eaf7 100%)" }}>
      <div style={{ fontSize: 52 }}>🏳️‍🌈</div>
      <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 18, color: "#7b2d8b", letterSpacing: 2 }}>LOADING...</div>
    </div>
  );

  function getEmoji(showHistory: string): import("react").ReactNode {
    throw new Error("Function not implemented.");
  }

  return (
    <>
      <style>{`
        .pr-sheet-backdrop {
          position: fixed; inset: 0; z-index: 80;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(6px);
          display: flex; flex-direction: column; justify-content: flex-end;
        }
        .pr-sheet {
          background: #fff; border-radius: 28px 28px 0 0;
          max-height: 92dvh; overflow-y: auto;
          padding: 8px 20px 150px;
          -webkit-overflow-scrolling: touch;
        }
        .pr-handle {
          width: 40px; height: 4px; border-radius: 99px;
          background: #e5e7eb; margin: 12px auto 20px;
        }
        .pr-input {
          width: 100%; padding: 12px 16px; border-radius: 14px;
          border: 1.5px solid #e5e7eb; background: #f8f9fa;
          font-size: 15px; font-weight: 600; outline: none;
          font-family: var(--font-inter), system-ui, sans-serif; color: #0e0e0e;
          box-sizing: border-box;
        }
        .pr-input:focus { border-color: #7b2d8b; background: #fff; }
        .pr-label {
          font-size: 11px; font-weight: 700; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.8px;
          display: block; margin-bottom: 6px;
        }
        .pr-save-btn {
          width: 100%; padding: 16px; border-radius: 16px; border: none;
          background: linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b);
          color: #fff; font-size: 15px; font-weight: 800; cursor: pointer;
          font-family: var(--font-inter), system-ui, sans-serif;
        }
        .pr-save-btn:disabled { opacity: 0.45; cursor: default; }
        .pr-delete-btn {
          width: 100%; padding: 13px; border-radius: 16px; border: 1.5px solid #fca5a5;
          background: #fff5f5; color: #ef4444; font-size: 14px; font-weight: 700;
          cursor: pointer; font-family: var(--font-inter), system-ui, sans-serif; margin-top: 8px;
        }
        .preset-chip {
          padding: 8px 14px; border-radius: 99px; border: 1.5px solid #e5e7eb;
          background: #fff; font-size: 13px; font-weight: 700;
          cursor: pointer; white-space: nowrap;
          font-family: var(--font-inter), system-ui, sans-serif;
          color: #374151; transition: all 0.12s; flex-shrink: 0;
        }
        .preset-chip.active {
          border-color: transparent;
          background: linear-gradient(135deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea);
          color: #fff;
        }
        .pr-card {
          border-radius: 20px; overflow: hidden;
          border: 1.5px solid #f1f5f9;
          background: #fff;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          cursor: pointer;
          transition: transform 0.12s, box-shadow 0.12s;
        }
        .pr-card:active { transform: scale(0.98); }
        .delta-up { color: #06d6a0; font-weight: 800; font-size: 12px; }
        .delta-down { color: #ff3c5f; font-weight: 800; font-size: 12px; }
        .history-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 0; border-bottom: 1px solid #f1f5f9;
        }
        .history-row:last-child { border-bottom: none; }
        .eq-chip {
          padding: 6px 12px; border-radius: 99px; border: 1.5px solid #e5e7eb;
          background: #fff; font-size: 12px; font-weight: 700;
          cursor: pointer; font-family: var(--font-inter), system-ui, sans-serif; color: #374151;
          flex-shrink: 0;
        }
        .eq-chip.active { border-color: #7b2d8b; background: #f3e8ff; color: #7b2d8b; }
        .edit-btn {
          background: rgba(102,126,234,0.1); border: 1px solid rgba(102,126,234,0.2);
          color: #667eea; border-radius: 8px; padding: 4px 10px;
          font-size: 11px; font-weight: 700; cursor: pointer;
          font-family: var(--font-inter), system-ui, sans-serif;
          transition: background 0.12s;
        }
        .edit-btn:hover { background: rgba(102,126,234,0.18); }
      `}</style>

      <div className="min-h-screen px-5 pt-6 pb-28 space-y-5">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{
              background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Queers &amp; Allies Fitness</p>
            <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Personal Records</h1>
          </div>
          <button
            onClick={() => { setEditingPR(null); setShowAdd(true); }}
            className="rainbow-cta rounded-full px-4 py-2 font-bold text-sm"
          >
            + New PR
          </button>
        </div>

        {/* Empty state */}
        {bestList.length === 0 && (
          <div className="neon-card rounded-2xl p-10 text-center space-y-3">
            <p style={{ fontSize: 48 }}>🏆</p>
            <p className="font-extrabold text-slate-900 text-lg">No PRs yet</p>
            <p className="text-sm text-slate-500">Log your first personal record and start tracking your progress.</p>
            <button onClick={() => { setEditingPR(null); setShowAdd(true); }} className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm">
              Log First PR
            </button>
          </div>
        )}

        {/* PR Cards grid */}
        {bestList.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {bestList.map((pr) => {
              const isTimed  = pr.unit === "min" || pr.unit === "sec";
              const hasDelta = pr.previous_value != null;
              const improved = hasDelta && (isTimed ? pr.value < pr.previous_value! : pr.value > pr.previous_value!);
              const delta    = hasDelta ? Math.abs(pr.value - pr.previous_value!) : null;

              function getEmoji(type: string): import("react").ReactNode {
                throw new Error("Function not implemented.");
              }

              return (
                <div
                  key={pr.type}
                  className="pr-card"
                  onClick={() => setShowHistory(pr.type)}
                >
                  <div style={{ height: 4, background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)" }} />
                  <div style={{ padding: "14px 16px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>{getEmoji(pr.type)}</span>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#64748b", lineHeight: 1.2 }}>{pr.label}</p>
                    </div>
                    {/* FIX: Use formatValue which now shows m:ss for time */}
                    <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 32, color: "#0e0e0e", lineHeight: 1, marginBottom: 2 }}>
                      {formatValue(pr.value, pr.unit)}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>
                      {isTimedUnit(pr.unit) ? "m:ss" : pr.unit}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{formatDate(pr.date)}</p>
                      {hasDelta && delta !== null && delta > 0 && (
                        <span className={improved ? "delta-up" : "delta-down"}>
                          {improved ? "↑" : "↓"} {formatValue(delta, pr.unit)}
                        </span>
                      )}
                    </div>
                    {pr.equipment && (
                      <p style={{ fontSize: 10, color: "#c4b5fd", fontWeight: 700, marginTop: 4 }}>🏋️ {pr.equipment}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Total PRs count */}
        {prs.length > 0 && (
          <div className="neon-card rounded-2xl px-5 py-3 text-center">
            <p className="text-xs text-slate-500 font-semibold">
              {prs.length} total log{prs.length !== 1 ? "s" : ""} across {Object.keys(bestByType).length} exercise{Object.keys(bestByType).length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* ══ SHEET — Add / Edit PR ═══════════════════════════════════════════════ */}
      {showAdd && (
        <div className="pr-sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="pr-sheet">
            <div className="pr-handle" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 22, color: "#0e0e0e", letterSpacing: 1 }}>
                {editingPR ? "Edit PR" : "Log a Personal Record"}
              </p>
              <button onClick={closeForm} style={{ background: "#f1f5f9", border: "none", borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#555" }}>
                Cancel
              </button>
            </div>

            {/* Preset type selector */}
            <div style={{ marginBottom: 20 }}>
              <span className="pr-label">Exercise</span>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" as any }}>
                {PRESET_TYPES.map(p => (
                  <button
                    key={p.type}
                    className={`preset-chip ${selectedPreset.type === p.type ? "active" : ""}`}
                    onClick={() => setSelectedPreset(p)}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom label + unit */}
            {selectedPreset.type === "custom" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div>
                  <span className="pr-label">Exercise Name</span>
                  <input className="pr-input" placeholder="e.g. Turkish Get-up"
                    value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
                </div>
                <div>
                  <span className="pr-label">Unit</span>
                  <input className="pr-input" placeholder="lbs / reps / sec"
                    value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} />
                </div>
              </div>
            )}

            {/* Value + Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <span className="pr-label">
                  {selectedPreset.unit === "min" || selectedPreset.unit === "sec"
                    ? "Time (m:ss or seconds)"
                    : `Value (${selectedPreset.type === "custom" ? customUnit || "unit" : selectedPreset.unit})`}
                </span>
                <input
                  className="pr-input"
                  type={selectedPreset.unit === "min" || selectedPreset.unit === "sec" ? "text" : "number"}
                  inputMode={selectedPreset.unit === "min" || selectedPreset.unit === "sec" ? "text" : "decimal"}
                  min={0}
                  step="0.1"
                  placeholder={selectedPreset.unit === "min" || selectedPreset.unit === "sec" ? "5:32" : "225"}
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                />
              </div>
              <div>
                <span className="pr-label">Date</span>
                <input className="pr-input" type="date"
                  value={dateInput} onChange={(e) => setDateInput(e.target.value)}
                  style={{ boxSizing: "border-box" }} />
              </div>
            </div>

            {/* Equipment */}
            <div style={{ marginBottom: 20 }}>
              <span className="pr-label">Equipment (optional)</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {EQUIPMENT_OPTIONS.map(eq => (
                  <button
                    key={eq}
                    className={`eq-chip ${equipmentInput === eq ? "active" : ""}`}
                    onClick={() => setEquipmentInput(prev => prev === eq ? "" : eq)}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 24 }}>
              <span className="pr-label">Notes (optional)</span>
              <textarea
                className="pr-input" rows={2}
                placeholder="Competition day, new shoes, felt great…"
                value={notesInput} onChange={(e) => setNotesInput(e.target.value)}
                style={{ resize: "none" }}
              />
            </div>

            <button
              className="pr-save-btn"
              onClick={handleSave}
              disabled={saving || !valueInput || (selectedPreset.type === "custom" && !customLabel)}
            >
              {saving ? "Saving…" : editingPR ? "Save Changes" : "Save PR 🏆"}
            </button>

            {/* Delete button when editing */}
            {editingPR && (
              <button
                className="pr-delete-btn"
                onClick={() => handleDelete(editingPR.id)}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete This Entry"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══ SHEET — History for a type ═════════════════════════════════════════ */}
      {showHistory && (
        <div className="pr-sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowHistory(null); }}>
          <div className="pr-sheet">
            <div className="pr-handle" />

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <button
                onClick={() => setShowHistory(null)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#555" }}
              >← Back</button>
              <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 20, color: "#0e0e0e", letterSpacing: 1 }}>
                {getEmoji(showHistory)} {historyForType[0]?.label || showHistory}
              </p>
            </div>

            {/* Current best callout */}
            {bestByType[showHistory] && (
              <div style={{
                background: "linear-gradient(135deg,rgba(255,107,157,0.1),rgba(102,126,234,0.1))",
                border: "1.5px solid rgba(102,126,234,0.2)",
                borderRadius: 18, padding: "16px 20px", marginBottom: 20,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>Current Best</p>
                  <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 40, color: "#0e0e0e", lineHeight: 1 }}>
                    {formatValue(bestByType[showHistory].value, bestByType[showHistory].unit)}
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#94a3b8", marginLeft: 6 }}>
                      {bestByType[showHistory].unit === "min" ? "min:sec" : bestByType[showHistory].unit === "sec" ? "m:ss" : bestByType[showHistory].unit}
                    </span>
                  </p>
                  <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{formatDate(bestByType[showHistory].date)}</p>
                </div>
                <div style={{ fontSize: 48 }}>🥇</div>
              </div>
            )}

            {/* History list */}
            <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>All Logs</p>
            {historyForType.map((pr) => {
              const isBest   = pr.id === bestByType[pr.type]?.id;
              const isTimed  = pr.unit === "min" || pr.unit === "sec";
              return (
                <div key={pr.id} className="history-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p style={{ fontWeight: 800, fontSize: 18, color: "#0e0e0e" }}>
                        {formatValue(pr.value, pr.unit)}
                        <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 4, fontWeight: 600 }}>
                          {isTimedUnit(pr.unit) ? "m:ss" : pr.unit}
                        </span>
                      </p>
                      {isBest && <span style={{ fontSize: 14 }}>🥇</span>}
                    </div>
                    <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{formatDate(pr.date)}</p>
                    {pr.notes && <p style={{ fontSize: 12, color: "#64748b", marginTop: 2, fontStyle: "italic" }}>"{pr.notes}"</p>}
                    {pr.equipment && <p style={{ fontSize: 11, color: "#c4b5fd", fontWeight: 700 }}>🏋️ {pr.equipment}</p>}
                    {pr.previous_value != null && (
                      <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                        Was: {formatValue(pr.previous_value, pr.unit)}
                        {" · "}
                        <span className={isTimed
                          ? (pr.value < pr.previous_value ? "delta-up" : "delta-down")
                          : (pr.value > pr.previous_value ? "delta-up" : "delta-down")}>
                          {(isTimed ? pr.value < pr.previous_value : pr.value > pr.previous_value) ? "↑" : "↓"}
                          {" "}{formatValue(Math.abs(pr.value - pr.previous_value), pr.unit)}
                        </span>
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    {/* Edit button */}
                    <button className="edit-btn" onClick={() => openEdit(pr)}>✏️ Edit</button>
                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(pr.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#e2e8f0", fontSize: 16, padding: "4px 8px" }}
                      title="Delete"
                    >✕</button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => { setShowHistory(null); setEditingPR(null); setShowAdd(true); setSelectedPreset(PRESET_TYPES.find(p => p.type === showHistory) || PRESET_TYPES[0]); }}
              style={{ width: "100%", marginTop: 20, padding: "14px", borderRadius: 14, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-inter), system-ui, sans-serif", color: "#374151" }}
            >
              + Log New {historyForType[0]?.label || "PR"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}