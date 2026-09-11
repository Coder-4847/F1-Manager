import type { RaceState } from "../sim/types";
import type { SeasonState } from "../sim/season";

// Bumped to v4 because RaceState gained a `weather` field and CarState gained damage
// fields that a pre-v4 save wouldn't have — loading one without this bump would leave
// those fields undefined and propagate NaN through the lap time math. Also retroactively
// covers the v3-era gap: the damage feature added CarState fields without its own bump.
const SAVE_KEY = "f1-manager-save-v4";

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
