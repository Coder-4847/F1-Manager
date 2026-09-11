import type { RaceState } from "../sim/types";
import type { SeasonState } from "../sim/season";

// Bumped to v5: CarState gained penaltySeconds (required, so an old save's missing field
// would propagate NaN through totals) plus retired/retiredReason/damageDescription.
const SAVE_KEY = "f1-manager-save-v5";

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
