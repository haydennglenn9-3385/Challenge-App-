// components/manage/TeamColorSelector.tsx
"use client";

export const PRIDE_GRADIENTS = [
  {
    id: "rainbow",
    label: "Rainbow Pride",
    gradient: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)",
  },
  {
    id: "trans",
    label: "Trans Pride",
    gradient: "linear-gradient(90deg,#55cdfc,#f7a8b8,#ffffff,#f7a8b8,#55cdfc)",
  },
  {
    id: "bi",
    label: "Bisexual Pride",
    gradient: "linear-gradient(90deg,#d60270,#d60270,#9b4f96,#0038a8,#0038a8)",
  },
  {
    id: "lesbian",
    label: "Lesbian Pride",
    gradient: "linear-gradient(90deg,#d52d00,#ef7627,#ff9a56,#ffffff,#d162a4,#b55690,#a50062)",
  },
  {
    id: "pan",
    label: "Pansexual Pride",
    gradient: "linear-gradient(90deg,#ff218c,#ff218c,#ffd800,#21b1ff,#21b1ff)",
  },
  {
    id: "nonbinary",
    label: "Nonbinary Pride",
    gradient: "linear-gradient(90deg,#fcf434,#ffffff,#9c59d1,#2d2d2d)",
  },
  {
    id: "progress",
    label: "Progress Pride",
    gradient: "linear-gradient(90deg,#000000,#784F17,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b,#55cdfc,#f7a8b8,#ffffff)",
  },
];

interface Props {
  value: string;
  onChange: (gradient: string) => void;
}

export default function TeamColorSelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
        Team Color
      </label>
      <div className="grid grid-cols-2 gap-2">
        {PRIDE_GRADIENTS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onChange(g.gradient)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
              value === g.gradient
                ? "border-slate-800 shadow-md"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div
              className="w-6 h-6 rounded-full flex-shrink-0"
              style={{ background: g.gradient }}
            />
            <span className="text-xs font-semibold text-slate-700 leading-tight">
              {g.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}