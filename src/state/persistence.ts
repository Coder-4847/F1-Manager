import type { RaceState } from "../sim/types";

const SAVE_KEY = "f1-manager-save-v1";

// RaceState is plain, JSON-safe data (no class instances or functions), so a
// straight stringify/parse round-trip is enough — no custom (de)serializer needed.

export function saveRaceState(state: RaceState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private browsing, quota) — saving is best-effort.
  }
}

export function loadRaceState(): RaceState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as RaceState) : null;
  } catch {
    return null;
  }
}

export function hasSavedRaceState(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearSavedRaceState(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
