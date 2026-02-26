"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type PRCategory = "strength" | "cardio" | "endurance" | "custom";

const CATEGORIES: { value: PRCategory; label: string; icon: string; examples: string }[] = [
  { value: "strength",  label: "Strength",  icon: "💪", examples: "Bench press, squat, deadlift, push-ups" },
  { value: "cardio",    label: "Cardio",    icon: "🏃", examples: "5K time, miles run, cycling distance"   },
  { value: "endurance", label: "Endurance", icon: "⏱️", examples: "Plank hold, wall sit, dead hang"        },
  { value: "custom",    label: "Custom",    icon: "⭐", examples: "Anything worth celebrating"             },
];

const UNITS: Record<PRCategory, string[]> = {
  strength:  ["lbs", "kg", "reps", "sets"],
  cardio:    ["miles", "km", "mins", "hrs"],
  endurance: ["secs", "mins", "hrs"],
  custom:    ["reps", "lbs", "kg", "mins", "secs", "miles", "km", "other"],
};

interface PRLogModalProps {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
  prefillLabel?: string;    // auto-populated from challenge
  prefillCategory?: PRCategory;
}

export default function PRLogModal({
  userId,
  onClose,
  onSaved,
  prefillLabel = "",
  prefillCategory = "strength",
}: PRLogModalProps) {
  const [category, setCategory] = useState<PRCategory>(prefillCategory);
  const [label, setLabel]       = useState(prefillLabel);
  const [value, setValue]       = useState("");
  const [unit, setUnit]         = useState(UNITS[prefillCategory][0]);
  const [notes, setNotes]       = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const handleCategoryChange = (cat: PRCategory) => {
    setCategory(cat);
    setUnit(UNITS[cat][0]);
  };

  const handleSave = async () => {
    if (!label.trim()) { setError("Please name your PR."); return; }
    if (!value || isNaN(Number(value))) { setError("Please enter a valid number."); return; }

    setSaving(true);
    setError("");

    // Check for existing PR of same label to set previous_value
    const { data: existing } = await supabase
      .from("performance_records")
      .select("value")
      .eq("user_id", userId)
      .eq("label", label.trim())
      .order("date", { ascending: false })
      .limit(1)
      .single();

    const { error: insertErr } = await supabase
      .from("performance_records")
      .insert({
        user_id:        userId,
        type:           category,
        label:          label.trim(),
        value:          Number(value),
        unit:           unit,
        date:           new Date().toISOString().split("T")[0],
        notes:          notes.trim() || null,
        is_public:      isPublic,
        is_custom:      category === "custom",
        previous_value: existing?.value ?? null,
      });

    if (insertErr) {
      setError(insertErr.message);
      setSaving(false);
      return;
    }

    // Award global points for logging a PR
    await supabase.rpc("increment_global_points", { uid: userId, amount: 10 });

    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 bg-white rounded-t-3xl px-5 pt-5 pb-10 space-y-5 max-h-[90dvh] overflow-y-auto">

        {/* Handle + header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="w-10 h-1 bg-slate-200 rounded-full mb-3" />
            <h2 className="text-xl font-extrabold text-slate-900">Log a PR 🏆</h2>
            <p className="text-xs text-slate-500 mt-0.5">Personal record worth celebrating</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Category */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Category</p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => handleCategoryChange(cat.value)}
                className="flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all"
                style={{
                  borderColor: category === cat.value ? "#a855f7" : "transparent",
                  background: category === cat.value
                    ? "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(102,126,234,0.08))"
                    : "rgba(0,0,0,0.03)",
                }}
              >
                <span className="text-xl">{cat.icon}</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">{cat.label}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{cat.examples}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Label */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">What's the PR?</p>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={
              category === "strength"  ? "e.g. Bench Press" :
              category === "cardio"    ? "e.g. 5K Run" :
              category === "endurance" ? "e.g. Plank Hold" :
              "e.g. Most Push-ups in a Month"
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        {/* Value + Unit */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Your Record</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <div className="flex gap-1.5 flex-1 flex-wrap">
              {UNITS[category].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className="rounded-xl border-2 px-3 py-2 text-xs font-bold transition-all"
                  style={{
                    borderColor: unit === u ? "#667eea" : "#e2e8f0",
                    background: unit === u ? "rgba(102,126,234,0.08)" : "white",
                    color: unit === u ? "#4f46e5" : "#64748b",
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Notes <span className="normal-case font-normal">(optional)</span>
          </p>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any context, equipment, conditions..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        {/* Visibility */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-bold text-slate-900">
              {isPublic ? "🌍 Show on community board" : "🔒 Keep private"}
            </p>
            <p className="text-xs text-slate-500">Visible to members of your public challenges</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className="w-12 h-6 rounded-full transition-all flex-shrink-0 relative"
            style={{ background: isPublic ? "linear-gradient(90deg,#ff6b9d,#667eea)" : "#e2e8f0" }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ transform: isPublic ? "translateX(25px)" : "translateX(2px)" }}
            />
          </button>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !label.trim() || !value}
          className="w-full rainbow-cta rounded-2xl py-4 font-bold text-base disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save PR 🎉"}
        </button>
      </div>
    </div>
  );
}