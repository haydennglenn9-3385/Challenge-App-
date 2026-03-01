// ─── Display helpers ──────────────────────────────────────────────────────────

export function secondsToDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function displayToSeconds(input: string): number | null {
  const parts = input.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    if (m > 59 || s > 59) return null;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    if (s > 59) return null;
    return m * 60 + s;
  }
  return null;
}

// ─── Input masking ────────────────────────────────────────────────────────────
// Fills digits right-to-left so typing "432" → "4:32"

export function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 4)
    return `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
  return `${digits.slice(0, digits.length - 4)}:${digits.slice(-4, -2)}:${digits.slice(-2)}`;
}

// ─── Delta ───────────────────────────────────────────────────────────────────

export function timeDelta(
  current: number,
  previous: number,
  lowerIsBetter: boolean
): { delta: string; improved: boolean } {
  const diff = Math.abs(current - previous);
  const improved = lowerIsBetter ? current < previous : current > previous;
  return {
    delta: secondsToDisplay(diff),
    improved,
  };
}