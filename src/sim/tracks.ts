import type { Track } from "./types";

// Real track layouts/names/lengths — fine to use, only teams/drivers are fictional.
// Stats are tuned for "feels right" pacing/variety, not real telemetry.

export const monza: Track = {
  id: "monza",
  name: "Autodromo Nazionale Monza",
  lapLengthKm: 5.793,
  totalLaps: 53,
  pitLaneLossSeconds: 22,
  baseLapTimeSeconds: 80,
  tireWearFactor: 0.7,
  overtakingDifficulty: 0.3,
};

export const silverstone: Track = {
  id: "silverstone",
  name: "Silverstone Circuit",
  lapLengthKm: 5.891,
  totalLaps: 52,
  pitLaneLossSeconds: 21,
  baseLapTimeSeconds: 88,
  tireWearFactor: 0.85,
  overtakingDifficulty: 0.4,
};

export const spa: Track = {
  id: "spa",
  name: "Circuit de Spa-Francorchamps",
  lapLengthKm: 7.004,
  totalLaps: 44,
  pitLaneLossSeconds: 20,
  baseLapTimeSeconds: 106,
  tireWearFactor: 0.6,
  overtakingDifficulty: 0.25,
};

export const suzuka: Track = {
  id: "suzuka",
  name: "Suzuka International Racing Course",
  lapLengthKm: 5.807,
  totalLaps: 53,
  pitLaneLossSeconds: 23,
  baseLapTimeSeconds: 92,
  tireWearFactor: 0.8,
  overtakingDifficulty: 0.55,
};

export const tracks: Track[] = [monza, silverstone, spa, suzuka];

export function getTrack(id: string): Track {
  const track = tracks.find((t) => t.id === id);
  if (!track) throw new Error(`Unknown track id: ${id}`);
  return track;
}
