import { DEFAULT_SETTINGS } from "../sim/settings";
import type { GameSettings } from "../sim/settings";

const SETTINGS_KEY = "f1-manager-settings-v1";

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable (private browsing, quota) — saving is best-effort.
  }
}

/** Merges stored settings over the defaults so a toggle added in a later app version
 *  (absent from an older stored blob) gets a sane default instead of `undefined`. */
export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<GameSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
