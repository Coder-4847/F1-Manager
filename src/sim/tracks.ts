import type { Track } from "./types";

// Real track layouts/names/lengths — fine to use, only teams/drivers are fictional.

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

export const tracks: Track[] = [monza];

export function getTrack(id: string): Track {
  const track = tracks.find((t) => t.id === id);
  if (!track) throw new Error(`Unknown track id: ${id}`);
  return track;
}
