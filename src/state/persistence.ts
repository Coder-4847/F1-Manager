import type { RaceState } from "../sim/types";
import type { SeasonState } from "../sim/season";

// Bumped to v10: CarState gained the required fuelLoad/fuelRemaining/fuelSaving fields —
// an old save's missing fuelLoad would break FUEL_LOAD_PACE_DELTA[undefined] (NaN lap times).
const SAVE_KEY = "f1-manager-save-v10";

export interface SeasonSave {
  season: SeasonState;
  raceState: RaceState;
}

// Both SeasonState and RaceState are plain, JSON-safe data (no class instances
// or functions), so a straight stringify/parse round-trip is enough.

export function saveSeasonProgress(save: SeasonSave): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage can be unavailable (private browsing, quota) — saving is best-effort.
  }
}

export function loadSeasonProgress(): SeasonSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SeasonSave) : null;
  } catch {
    return null;
  }
}

export function hasSeasonSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}
