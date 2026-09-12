import type { DownforceSetting, Track } from "./types";

export const DOWNFORCE_SETTINGS: DownforceSetting[] = ["low", "balanced", "high"];

export const DOWNFORCE_LABEL: Record<DownforceSetting, string> = {
  low: "Low",
  balanced: "Balanced",
  high: "High",
};

/** How much a track's character leans toward rewarding high or low downforce, derived from
 *  its existing overtakingDifficulty stat rather than new per-track data: a twisty,
 *  hard-to-pass track (Monaco, high overtakingDifficulty) rewards cornering grip, a power
 *  track (Monza, low overtakingDifficulty) rewards top speed instead. -1 = fully favors
 *  low downforce, +1 = fully favors high. */
function trackLean(track: Track): number {
  return (track.overtakingDifficulty - 0.5) * 2;
}

const DOWNFORCE_PACE_SCALE_SECONDS = 0.45;

/** Lap time delta (seconds) from running this setup at this track — negative is faster.
 *  Balanced is always neutral; Low/High are mirror images of the track's lean, so picking
 *  against the grain of a track costs real time, not just a missed opportunity. */
export function downforcePaceDeltaSeconds(setting: DownforceSetting, track: Track): number {
  if (setting === "balanced") return 0;
  const lean = trackLean(track);
  return setting === "low" ? lean * DOWNFORCE_PACE_SCALE_SECONDS : -lean * DOWNFORCE_PACE_SCALE_SECONDS;
}

/** Multiplies tire wear — Low downforce means less mechanical grip through corners, so
 *  tires scrub more; High downforce is the inverse. This is the real trade-off: chasing a
 *  power track's pace bonus with Low downforce also costs tire life across the stint. */
export function downforceTireWearMultiplier(setting: DownforceSetting): number {
  if (setting === "low") return 1.12;
  if (setting === "high") return 0.9;
  return 1;
}

/** A simple pre-race hint for the Racing Plan screen — not a hard recommendation, just
 *  which way this track's character leans, so the trade-off isn't a total guess. */
export function recommendedDownforceFor(track: Track): DownforceSetting {
  const lean = trackLean(track);
  if (lean <= -0.15) return "low";
  if (lean >= 0.15) return "high";
  return "balanced";
}
