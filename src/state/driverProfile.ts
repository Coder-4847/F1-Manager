import type { DriverProfileEdit } from "../sim/roster";
import { updateDriverProfile } from "../sim/roster";

const PROFILE_KEY = "f1-manager-driver-profile-v1";

export function saveDriverProfile(edit: DriverProfileEdit): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(edit));
  } catch {
    // Storage can be unavailable (private browsing, quota) — saving is best-effort.
  }
}

export function clearDriverProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // ignore
  }
}

function loadDriverProfile(): DriverProfileEdit | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as DriverProfileEdit) : null;
  } catch {
    return null;
  }
}

/** Applies a previously-saved profile edit (if any) to the roster driver. Call once at startup. */
export function applyStoredDriverProfile(driverId: string): void {
  const stored = loadDriverProfile();
  if (stored) updateDriverProfile(driverId, stored);
}
