import type { RaceState } from "../sim/types";
import type { SeasonState } from "../sim/season";

// Bumped to v3 because SeasonState.calendar changed shape (string[] -> SeasonRound[])
// for custom seasons — an old v2 save would otherwise load malformed data and crash.
const SAVE_KEY = "f1-manager-save-v3";

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
